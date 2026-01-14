"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '../../../firebase'; 
import { onAuthStateChanged } from 'firebase/auth';
import { 
  collection, query, where, getDocs, addDoc, serverTimestamp 
} from 'firebase/firestore';

export default function PublicProfile({ params }) {
  const router = useRouter();
  const profileUsername = decodeURIComponent(params.username);
  
  const [profileUser, setProfileUser] = useState(null);
  const [profilePosts, setProfilePosts] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [chatLoading, setChatLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      
      try {
        const usersRef = collection(db, "users");
        const qUser = query(usersRef, where("username", "==", profileUsername));
        const userSnap = await getDocs(qUser);

        if (userSnap.empty) {
          setLoading(false);
          return;
        }

        const userData = userSnap.docs[0].data();
        const userId = userSnap.docs[0].id;
        setProfileUser({ id: userId, ...userData });

        const postsRef = collection(db, "posts");
        const qPosts = query(postsRef, where("userId", "==", userId));
        const postsSnap = await getDocs(qPosts);
        
        const posts = postsSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        posts.sort((a, b) => {
           const timeA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
           const timeB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
           return timeB - timeA;
        });

        setProfilePosts(posts);

      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [profileUsername]);

  const handleStartChat = async () => {
    if (!currentUser) {
      router.push('/signup');
      return;
    }
    setChatLoading(true);

    try {
      const chatsRef = collection(db, "chats");
      const qChat = query(chatsRef, where("participants", "array-contains", currentUser.uid));
      const chatSnap = await getDocs(qChat);
      
      let existingChatId = null;
      chatSnap.forEach(doc => {
        const data = doc.data();
        if (data.participants.includes(profileUser.id)) {
          existingChatId = doc.id;
        }
      });

      if (existingChatId) {
        router.push(`/chat/${existingChatId}`);
        return;
      }

      const currentUsername = currentUser.email.split('@')[0]; 
      const docRef = await addDoc(collection(db, "chats"), {
        participants: [currentUser.uid, profileUser.id],
        participantNames: [currentUsername, profileUser.username],
        lastMessage: "Chat started",
        lastUpdated: serverTimestamp()
      });

      router.push(`/chat/${docRef.id}`);
      
    } catch (error) {
      console.error("Error starting chat:", error);
      alert("Could not start chat.");
      setChatLoading(false);
    }
  };

  if (loading) return <div className="p-10 text-center text-gray-400 font-medium">Loading Profile...</div>;
  if (!profileUser) return <div className="p-10 text-center text-gray-500">User not found.</div>;

  const totalLikes = profilePosts.reduce((acc, post) => acc + (post.votes || 0), 0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-cyan-50 to-white pb-20">
      
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-md px-4 py-3 border-b border-gray-100 sticky top-0 z-10 flex items-center gap-3 shadow-sm">
        <button onClick={() => router.back()} className="text-gray-500 hover:text-black">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
        </button>
        <h1 className="font-bold text-lg text-gray-900">Profile</h1>
      </div>

      <div className="max-w-md mx-auto pt-6 px-4">
        
        {/* Profile Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col items-center text-center mb-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-cyan-50 to-white opacity-50 z-0"></div>
          
          <div className="relative z-10">
            <div className="w-24 h-24 bg-black text-white rounded-full flex items-center justify-center text-4xl font-bold mb-3 border-[4px] border-white shadow-md mx-auto">
              {profileUser.username.charAt(0).toUpperCase()}
            </div>
            
            <h2 className="text-2xl font-black text-gray-900 mb-1">u/{profileUser.username}</h2>
            <p className="text-xs text-cyan-600 font-bold uppercase tracking-widest mb-6">CircleCayman Member</p>
            
            <div className="flex justify-center gap-4 mb-6 w-full">
              <div className="flex-1 bg-gray-50 p-3 rounded-xl border border-gray-100">
                <span className="block text-xl font-black text-gray-900">{profilePosts.length}</span>
                <span className="text-[10px] font-bold text-gray-400 uppercase">Posts</span>
              </div>
              <div className="flex-1 bg-gray-50 p-3 rounded-xl border border-gray-100">
                <span className="block text-xl font-black text-gray-900">{totalLikes}</span>
                {/* CHANGED KARMA TO LIKES */}
                <span className="text-[10px] font-bold text-gray-400 uppercase">Likes</span>
              </div>
            </div>

            {currentUser?.uid !== profileUser.id && (
              <button 
                onClick={handleStartChat}
                disabled={chatLoading}
                className="w-full bg-cyan-600 text-white py-3 rounded-xl text-sm font-bold shadow-md hover:bg-cyan-700 transition flex items-center justify-center gap-2"
              >
                {chatLoading ? "Loading..." : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                    Send Message
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 mb-3 px-1">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Recent Activity</span>
        </div>

        <div className="space-y-3 pb-10">
          {profilePosts.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-sm bg-white/50 rounded-2xl border border-dashed border-gray-200">
              No posts yet.
            </div>
          ) : (
            profilePosts.map(post => (
              <div key={post.id} onClick={() => router.push(`/post/${post.id}`)} className="bg-white p-4 rounded-2xl border border-gray-100 cursor-pointer hover:shadow-md transition shadow-sm">
                <div className="flex items-center justify-between mb-2">
                   <div className="text-[10px] font-bold text-cyan-600 bg-cyan-50 px-2 py-0.5 rounded-full">{post.community || "c/General"}</div>
                   <div className="text-[10px] text-gray-400 font-bold">{post.createdAt?.toDate ? new Date(post.createdAt.toDate()).toLocaleDateString() : ''}</div>
                </div>
                <h3 className="font-bold text-base text-gray-900 mb-1 leading-snug">{post.title}</h3>
                <p className="text-xs text-gray-500 line-clamp-2 mb-3">{post.body}</p>
                
                <div className="flex items-center gap-4 text-gray-400 border-t border-gray-50 pt-2">
                  <div className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                    <span className="text-xs font-bold">{post.votes || 0}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                    <span className="text-xs font-bold">{post.comments || 0}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
}
