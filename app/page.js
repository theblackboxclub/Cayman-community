"use client";
import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link'; 
import { useRouter, useSearchParams } from 'next/navigation';
import { db, auth } from '../firebase'; 
import { onAuthStateChanged } from 'firebase/auth';
import { 
  collection, onSnapshot, query, orderBy, doc, updateDoc, increment, arrayUnion, arrayRemove, getDoc 
} from 'firebase/firestore';

// --- HELPERS ---
const getAvatarColor = (name) => {
  if (!name) return 'bg-gray-400';
  const colors = ['bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-green-500', 'bg-emerald-500', 'bg-teal-500', 'bg-cyan-500', 'bg-blue-500', 'bg-indigo-500', 'bg-violet-500', 'bg-fuchsia-500', 'bg-pink-500', 'bg-rose-500'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};

const cleanName = (name) => name?.replace('c/', '') || '';

const communityIcons = {
  "General": { icon: "🌴", color: "bg-teal-100 text-teal-800" },
  "CaymanFitness": { icon: "🏃", color: "bg-orange-100 text-orange-800" },
  "IslandJobs": { icon: "💼", color: "bg-blue-100 text-blue-800" },
  "AskLocals": { icon: "🗣️", color: "bg-yellow-100 text-yellow-800" },
  "Events": { icon: "🎉", color: "bg-purple-100 text-purple-800" },
  "RealEstate": { icon: "🏠", color: "bg-green-100 text-green-800" },
};

function FeedContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [dbUser, setDbUser] = useState(null); 
  const [blockedUsers, setBlockedUsers] = useState([]);
  
  const initialCommunity = searchParams.get('community') || 'All';
  const initialSearch = searchParams.get('search') || '';
  
  const [selectedCommunity, setSelectedCommunity] = useState(initialCommunity);
  const [searchQuery, setSearchQuery] = useState(initialSearch);

  const communities = Object.keys(communityIcons);
  communities.unshift("All");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          const docRef = doc(db, "users", user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            setDbUser(data);
            setBlockedUsers(data.blockedUsers || []); 
          }
        } catch (e) { console.error(e); }
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const comm = searchParams.get('community') || 'All';
    const search = searchParams.get('search') || '';
    setSelectedCommunity(comm);
    setSearchQuery(search);
  }, [searchParams]);

  useEffect(() => {
    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const postsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        time: doc.data().createdAt ? formatTime(doc.data().createdAt.toDate()) : 'Just now'
      }));
      setPosts(postsData);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLike = async (post, e) => {
    e.preventDefault(); 
    if (!currentUser) return alert("Sign in to vote.");
    const postRef = doc(db, "posts", post.id);
    if (post.likedBy?.includes(currentUser.uid)) {
      await updateDoc(postRef, { votes: increment(-1), likedBy: arrayRemove(currentUser.uid) });
    } else {
      await updateDoc(postRef, { votes: increment(1), likedBy: arrayUnion(currentUser.uid) });
    }
  };

  // --- POLL VOTING LOGIC (With Switching) ---
  const handleVotePoll = async (e, post, newOptionIndex) => {
    e.preventDefault();
    e.stopPropagation(); 
    if (!currentUser) return alert("Sign in to vote.");

    const currentVoteIndex = post.pollOptions.findIndex(opt => opt.votes.includes(currentUser.uid));

    // Create deep copy
    const newOptions = post.pollOptions.map(opt => ({
      ...opt,
      votes: [...opt.votes]
    }));

    if (currentVoteIndex !== -1) {
      if (currentVoteIndex === newOptionIndex) return; // Clicked same option
      newOptions[currentVoteIndex].votes = newOptions[currentVoteIndex].votes.filter(id => id !== currentUser.uid);
      newOptions[newOptionIndex].votes.push(currentUser.uid);
    } else {
      newOptions[newOptionIndex].votes.push(currentUser.uid);
    }

    const postRef = doc(db, "posts", post.id);
    await updateDoc(postRef, { pollOptions: newOptions });
  };

  const handleUserClick = (e, username) => {
    e.preventDefault(); e.stopPropagation(); router.push(`/user/${username}`);
  };

  const formatTime = (date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    if (diffInSeconds < 60) return `${diffInSeconds}s`;
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h`;
    return `${Math.floor(diffInHours / 24)}d`;
  };

  const filteredPosts = posts.filter(post => {
    if (blockedUsers.includes(post.userId)) return false;
    const postComm = cleanName(post.community);
    const selectedComm = cleanName(selectedCommunity);
    const matchesCommunity = selectedCommunity === 'All' || postComm === selectedComm;
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = post.title.toLowerCase().includes(searchLower) || (post.body && post.body.toLowerCase().includes(searchLower));
    return matchesCommunity && matchesSearch;
  });

  const headerAvatarChar = dbUser?.username ? dbUser.username.charAt(0).toUpperCase() : (currentUser?.email?.charAt(0).toUpperCase() || "?");
  const headerAvatarBg = dbUser?.username ? getAvatarColor(dbUser.username) : "bg-black";

  return (
    <div className="min-h-screen bg-gradient-to-b from-cyan-50 to-white pb-24"> 
      
      {/* Top Nav */}
      <div className="bg-white/90 backdrop-blur-md px-4 py-3 flex items-center justify-between sticky top-0 z-50 border-b border-gray-100 shadow-sm">
        <div className="flex items-center gap-2">
           <div className="w-6 h-6 rounded-full border-[5px] border-cyan-600"></div>
           <span className="font-black text-xl tracking-tighter text-gray-900">Circle<span className="text-cyan-600">Cayman</span></span>
        </div>
        <div className="flex-1 mx-3 bg-gray-100 rounded-full px-4 py-2 flex items-center focus-within:ring-2 focus-within:ring-cyan-100 transition-all">
          <svg className="w-4 h-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input type="text" placeholder="Search..." className="bg-transparent outline-none text-sm w-full placeholder-gray-500 text-gray-900" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>
        <Link href={currentUser ? `/user/${dbUser?.username || 'me'}` : "/signup"}>
          <div className={`w-9 h-9 rounded-full text-white flex items-center justify-center text-sm font-bold shadow-md hover:scale-105 transition overflow-hidden border border-gray-200 ${headerAvatarBg}`}>
             {dbUser?.profilePic ? <img src={dbUser.profilePic} className="w-full h-full object-cover" /> : headerAvatarChar}
          </div>
        </Link>
      </div>

      {/* Filter Bar */}
      <div className="bg-white/80 backdrop-blur-sm py-2 px-4 sticky top-[65px] z-40 overflow-x-auto border-b border-gray-100">
        <div className="flex gap-2 whitespace-nowrap">
          {communities.map((c) => (
            <button key={c} onClick={() => setSelectedCommunity(c)} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm ${selectedCommunity === c ? "bg-cyan-600 text-white scale-105" : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"}`}>{c}</button>
          ))}
        </div>
      </div>

      {/* Feed */}
      <div className="max-w-md mx-auto md:max-w-2xl mt-4 px-2">
        {loading && <div className="p-10 text-center text-gray-400 font-medium">Loading...</div>}
        {!loading && filteredPosts.length === 0 && (
           <div className="p-10 text-center text-gray-500">
             <div className="font-medium text-lg">No waves here yet 🌊</div>
             <p className="text-sm mt-1 mb-4 text-gray-400">{searchQuery ? `No posts match "${searchQuery}"` : `No posts in ${cleanName(selectedCommunity)} yet.`}</p>
             <Link href="/create"><button className="bg-cyan-600 text-white px-6 py-2 rounded-full font-bold text-sm shadow-lg hover:scale-105 transition">Create Post</button></Link>
           </div>
        )}

        {filteredPosts.map((post) => {
          const isLiked = post.likedBy?.includes(currentUser?.uid);
          const commName = cleanName(post.community);
          const commData = communityIcons[commName] || { icon: "🌊", color: "bg-cyan-100 text-cyan-800" };
          
          const isPoll = post.type === 'poll' && post.pollOptions;
          const totalVotes = isPoll ? post.pollOptions.reduce((acc, opt) => acc + opt.votes.length, 0) : 0;
          const userVoted = isPoll ? post.pollOptions.some(opt => opt.votes.includes(currentUser?.uid)) : false;

          return (
            <Link href={`/post/${post.id}`} key={post.id}>
              <div className="bg-white mb-3 rounded-2xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-all active:scale-[0.99] cursor-pointer">
                {/* Header */}
                <div className="flex items-center text-xs text-gray-500 mb-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold mr-2 text-[12px] ${commData.color}`}>{commData.icon}</div>
                  <span className="font-bold text-gray-900 mr-1">{commName}</span>
                  <span className="text-gray-300 mx-1">•</span><span>{post.time}</span><span className="text-gray-300 mx-1">•</span>
                  <div className={`w-4 h-4 rounded-full ml-1 mr-1 flex-shrink-0 ${getAvatarColor(post.author)}`}></div>
                  <span onClick={(e) => handleUserClick(e, post.author)} className="hover:text-cyan-600 hover:underline cursor-pointer font-medium text-gray-700">{post.author}</span>
                </div>
                
                <div className="pb-2">
                  <h3 className="text-base font-bold text-gray-900 leading-snug mb-1.5">{post.title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed mb-3 line-clamp-3">{post.body}</p>
                  
                  {/* IMAGE CONTENT */}
                  {post.mediaUrl && (
                    <div className="mb-3 rounded-xl overflow-hidden border border-gray-100 bg-gray-50 h-56 relative shadow-inner">
                      <img src={post.mediaUrl} className="w-full h-full object-cover" />
                    </div>
                  )}

                  {/* LINK CONTENT (New!) */}
                  {post.linkUrl && (
                    <a 
                      href={post.linkUrl.startsWith('http') ? post.linkUrl : `https://${post.linkUrl}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()} 
                      className="block mb-3 bg-blue-50 border border-blue-100 rounded-xl p-3 flex items-center gap-3 hover:bg-blue-100 transition group"
                    >
                      <div className="bg-blue-200 p-2 rounded-full text-blue-600 group-hover:bg-blue-300 transition">
                         <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                      </div>
                      <div className="flex-1 overflow-hidden">
                         <p className="text-xs font-bold text-blue-900 truncate">{post.linkUrl}</p>
                         <p className="text-[10px] text-blue-500">Tap to open external link</p>
                      </div>
                    </a>
                  )}

                  {/* POLL CONTENT UI */}
                  {isPoll && (
                    <div className="mb-3 space-y-2">
                      {post.pollOptions.map((opt, idx) => {
                        const percentage = totalVotes > 0 ? Math.round((opt.votes.length / totalVotes) * 100) : 0;
                        const isWinner = totalVotes > 0 && percentage >= Math.max(...post.pollOptions.map(o => totalVotes > 0 ? (o.votes.length/totalVotes)*100 : 0));
                        const isMyVote = opt.votes.includes(currentUser?.uid);
                        
                        return (
                          <div 
                            key={idx} 
                            onClick={(e) => handleVotePoll(e, post, idx)}
                            className={`relative h-10 rounded-lg border overflow-hidden flex items-center px-3 cursor-pointer transition-all ${isMyVote ? 'border-cyan-500 ring-1 ring-cyan-200' : 'border-gray-200 hover:border-cyan-400 bg-white hover:bg-cyan-50'}`}
                          >
                            {/* Progress Bar */}
                            {userVoted && (
                              <div 
                                className={`absolute top-0 left-0 bottom-0 transition-all duration-500 ${isWinner ? 'bg-cyan-100' : 'bg-gray-100'}`} 
                                style={{ width: `${percentage}%` }}
                              ></div>
                            )}
                            
                            {/* Text & Stats */}
                            <div className="relative z-10 flex justify-between w-full text-xs font-bold text-gray-800">
                              <span className="flex items-center gap-2">
                                {isMyVote && <span className="text-cyan-600">✓</span>}
                                {opt.text}
                              </span>
                              {userVoted && <span>{percentage}%</span>}
                            </div>
                          </div>
                        );
                      })}
                      <p className="text-[10px] text-gray-400 font-bold text-right">{totalVotes} votes</p>
                    </div>
                  )}

                </div>
                
                {/* Footer */}
                <div className="flex items-center gap-6 pt-2 border-t border-gray-50">
                  <button onClick={(e) => handleLike(post, e)} className={`flex items-center gap-1.5 px-2 py-1 rounded-full transition-colors ${isLiked ? "bg-red-50 text-red-500" : "hover:bg-gray-50 text-gray-500"}`}><svg className={`w-5 h-5 ${isLiked ? "fill-current" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg><span className="text-xs font-bold">{post.votes || 0}</span></button>
                  <div className="flex items-center gap-1.5 text-gray-400"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg><span className="text-xs font-bold">{post.comments || 0}</span></div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-gray-100 px-6 py-3 flex justify-between items-center z-50">
        <div className="flex flex-col items-center cursor-pointer text-black" onClick={() => { setSelectedCommunity("All"); setSearchQuery(""); window.history.pushState({}, '', '/'); }}><svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" /></svg><span className="text-[10px] font-bold mt-1">Home</span></div>
        <Link href="/explore" className="flex flex-col items-center text-gray-400 hover:text-black"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg><span className="text-[10px] mt-1">Explore</span></Link>
        <Link href="/create" className="flex flex-col items-center -mt-6"><div className="bg-black text-white p-3 rounded-full shadow-lg hover:bg-gray-800 hover:scale-105 transition"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg></div><span className="text-[10px] font-bold mt-1 text-gray-400">Create</span></Link>
        <Link href="/chat" className="flex flex-col items-center text-gray-400 hover:text-black transition"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg><span className="text-[10px] mt-1">Chat</span></Link>
        <Link href="/messages" className="flex flex-col items-center text-gray-400 hover:text-black transition"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg><span className="text-[10px] mt-1">Inbox</span></Link>
      </div>
    </div>
  );
}
