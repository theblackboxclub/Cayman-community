"use client";
import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link'; 
import { useRouter, useSearchParams } from 'next/navigation';
import { db, auth } from '../firebase'; 
import { onAuthStateChanged } from 'firebase/auth';
import { 
  collection, onSnapshot, query, orderBy, doc, updateDoc, increment, arrayUnion, arrayRemove 
} from 'firebase/firestore';

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  
  const initialCommunity = searchParams.get('community') || 'All';
  const initialSearch = searchParams.get('search') || '';
  
  const [selectedCommunity, setSelectedCommunity] = useState(initialCommunity);
  const [searchQuery, setSearchQuery] = useState(initialSearch);

  const communities = [
    "All", "c/General", "c/CaymanFitness", "c/IslandJobs",
    "c/AskLocals", "c/Events", "c/RealEstate"
  ];

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => setCurrentUser(user));
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
    const isLiked = post.likedBy?.includes(currentUser.uid);

    if (isLiked) {
      await updateDoc(postRef, { votes: increment(-1), likedBy: arrayRemove(currentUser.uid) });
    } else {
      await updateDoc(postRef, { votes: increment(1), likedBy: arrayUnion(currentUser.uid) });
    }
  };

  const handleUserClick = (e, username) => {
    e.preventDefault(); 
    e.stopPropagation();
    router.push(`/user/${username}`);
  };

  const formatTime = (date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    if (diffInSeconds < 60) return `${diffInSeconds}s`;
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d`;
  };

  const filteredPosts = posts.filter(post => {
    const matchesCommunity = selectedCommunity === 'All' || post.community === selectedCommunity;
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = post.title.toLowerCase().includes(searchLower) || 
                          post.body.toLowerCase().includes(searchLower);
    return matchesCommunity && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-cyan-50 to-white pb-24"> 
      
      {/* Top Nav - Glassmorphism */}
      <div className="bg-white/90 backdrop-blur-md px-4 py-3 flex items-center justify-between sticky top-0 z-50 border-b border-gray-100 shadow-sm">
        
        {/* LOGO OPTION 2: "The Horizon" */}
        <div className="flex items-center gap-2">
           <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center text-white shadow-md transform rotate-3">
             {/* Simple Sun & Horizon Line */}
             <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 4v2" /> 
                <path d="M5.22 6.22l1.42 1.42" />
                <path d="M18.78 6.22l-1.42 1.42" />
                <path d="M2 18h20" /> 
                <path d="M4 18a8 8 0 0 1 16 0" /> 
             </svg>
           </div>
           <span className="font-black text-xl tracking-tighter text-gray-900">
             Circle<span className="text-cyan-600">Cayman</span>
           </span>
        </div>
        
        <div className="flex-1 mx-3 bg-gray-100 rounded-full px-4 py-2 flex items-center focus-within:ring-2 focus-within:ring-cyan-100 transition-all">
          <svg className="w-4 h-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input 
            type="text" 
            placeholder="Search..." 
            className="bg-transparent outline-none text-sm w-full placeholder-gray-500 text-gray-900"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <Link href={currentUser ? "/profile" : "/signup"}>
          <div className="w-9 h-9 bg-black rounded-full text-white flex items-center justify-center text-sm font-bold shadow-md hover:scale-105 transition">
             {currentUser ? currentUser.email.charAt(0).toUpperCase() : "?"}
          </div>
        </Link>
      </div>

      {/* Filter Bar */}
      <div className="bg-white/80 backdrop-blur-sm py-2 px-4 sticky top-[65px] z-40 overflow-x-auto border-b border-gray-100">
        <div className="flex gap-2 whitespace-nowrap">
          {communities.map((c) => (
            <button
              key={c}
              onClick={() => setSelectedCommunity(c)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm ${
                selectedCommunity === c 
                ? "bg-cyan-600 text-white scale-105" 
                : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"
              }`}
            >
              {c}
            </button>
          ))}
          {!communities.includes(selectedCommunity) && selectedCommunity !== 'All' && (
             <button className="px-4 py-1.5 rounded-full text-xs font-bold bg-cyan-600 text-white shadow-sm">
               {selectedCommunity}
             </button>
          )}
        </div>
      </div>

      {/* Feed */}
      <div className="max-w-md mx-auto md:max-w-2xl mt-4 px-2">
        {loading && <div className="p-10 text-center text-gray-400 font-medium">Loading island vibes...</div>}

        {!loading && filteredPosts.length === 0 && (
           <div className="p-10 text-center text-gray-500">
             <div className="font-medium text-lg">No waves here yet 🌊</div>
             <p className="text-sm mt-1 mb-4 text-gray-400">
               {searchQuery ? `No posts match "${searchQuery}"` : `No posts in ${selectedCommunity} yet.`}
             </p>
             <Link href="/create">
                <button className="bg-cyan-600 text-white px-6 py-2 rounded-full font-bold text-sm shadow-lg hover:scale-105 transition">Create Post</button>
             </Link>
           </div>
        )}

        {filteredPosts.map((post) => {
          const isLiked = post.likedBy?.includes(currentUser?.uid);
          return (
            <Link href={`/post/${post.id}`} key={post.id}>
              {/* Card Design */}
              <div className="bg-white mb-3 rounded-2xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-all active:scale-[0.99] cursor-pointer">
                
                <div className="flex items-center text-xs text-gray-500 mb-2">
                  <div className="w-6 h-6 rounded-full bg-cyan-50 text-cyan-700 flex items-center justify-center font-bold mr-2 text-[10px]">
                    {post.community ? post.community.charAt(2) : "G"}
                  </div>
                  <span className="font-bold text-gray-900 mr-1">{post.community}</span>
                  <span className="text-gray-300 mx-1">•</span>
                  <span>{post.time}</span>
                  <span className="text-gray-300 mx-1">•</span>
                  
                  <span 
                    onClick={(e) => handleUserClick(e, post.author)}
                    className="hover:text-cyan-600 hover:underline cursor-pointer font-medium"
                  >
                    u/{post.author}
                  </span>
                </div>

                <div className="pb-2">
                  <h3 className="text-base font-bold text-gray-900 leading-snug mb-1.5">{post.title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed mb-3 line-clamp-3">{post.body}</p>
                  
                  {post.mediaType === 'image' && post.mediaUrl && (
                    <div className="mb-3 rounded-xl overflow-hidden border border-gray-100 bg-gray-50 h-56 relative shadow-inner">
                      <img src={post.mediaUrl} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                   {post.mediaType === 'link' && post.mediaUrl && (
                    <div className="mb-3 p-3 rounded-xl border border-gray-100 bg-cyan-50/30 flex items-center gap-3">
                      <div className="p-2 bg-white rounded-full text-cyan-500">
                         <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                      </div>
                      <span className="text-cyan-700 text-xs font-bold truncate">{post.mediaUrl}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-6 pt-2 border-t border-gray-50">
                  <button onClick={(e) => handleLike(post, e)} className={`flex items-center gap-1.5 px-2 py-1 rounded-full transition-colors ${isLiked ? "bg-red-50 text-red-500" : "hover:bg-gray-50 text-gray-500"}`}>
                     <svg className={`w-5 h-5 ${isLiked ? "fill-current" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>
                     <span className="text-xs font-bold">{post.votes || 0}</span>
                  </button>
                  <div className="flex items-center gap-1.5 text-gray-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                    <span className="text-xs font-bold">{post.comments || 0}</span>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-gray-100 px-6 py-3 flex justify-between items-center z-50">
        <div className="flex flex-col items-center cursor-pointer text-black" onClick={() => {
           setSelectedCommunity("All");
           setSearchQuery("");
           window.history.pushState({}, '', '/');
        }}>
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" /></svg>
          <span className="text-[10px] font-bold mt-1">Home</span>
        </div>
        <Link href="/explore" className="flex flex-col items-center text-gray-400 hover:text-black">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
          <span className="text-[10px] mt-1">Explore</span>
        </Link>
        <Link href="/create" className="flex flex-col items-center -mt-6">
          <div className="bg-black text-white p-3 rounded-full shadow-lg hover:bg-gray-800 hover:scale-105 transition">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          </div>
          <span className="text-[10px] font-bold mt-1 text-gray-400">Create</span>
        </Link>
        <Link href="/chat" className="flex flex-col items-center text-gray-400 hover:text-black transition">
           <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
           <span className="text-[10px] mt-1">Chat</span>
        </Link>
        <Link href="/messages" className="flex flex-col items-center text-gray-400 hover:text-black transition">
           <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
           <span className="text-[10px] mt-1">Inbox</span>
        </Link>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="p-10 text-center">Loading...</div>}>
      <HomeContent />
    </Suspense>
  );
}
