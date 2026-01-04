"use client";
import React, { useState, useEffect } from 'react';
import { db } from '../firebase'; 
import { collection, onSnapshot, query, orderBy, doc, updateDoc, increment } from 'firebase/firestore';

export default function Home() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  // 1. LISTEN TO DATABASE
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

  // 2. HANDLE LIKE CLICK
  const handleLike = async (postId) => {
    // Determine the reference to the specific post
    const postRef = doc(db, "posts", postId);
    
    // Update the 'votes' field by +1 in the database
    await updateDoc(postRef, {
      votes: increment(1)
    });
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

  return (
    <div className="min-h-screen bg-[#DAE0E6] pb-20"> 

      {/* --- TOP NAV --- */}
      <div className="bg-white px-4 py-2 flex items-center justify-between sticky top-0 z-50 shadow-sm">
        <button className="p-2">
           <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>
        <div className="flex-1 mx-3 bg-gray-100 rounded-full px-4 py-2 flex items-center">
          <svg className="w-5 h-5 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input type="text" placeholder="Find anything" className="bg-transparent outline-none text-sm w-full placeholder-gray-500" />
        </div>
        <div className="w-8 h-8 bg-green-500 rounded-full border-2 border-white shadow-sm"></div>
      </div>

      {/* --- FEED --- */}
      <div className="max-w-md mx-auto md:max-w-2xl md:mt-4">
        
        {loading && <div className="p-10 text-center text-gray-500 font-bold">Loading Cayman... 🌴</div>}

        {!loading && posts.length === 0 && (
           <div className="p-10 text-center text-gray-500">
             <div className="text-4xl mb-2">🦗</div>
             <div className="font-bold">It's quiet here.</div>
             <p>Be the first to post something!</p>
           </div>
        )}

        {posts.map((post) => (
          <div key={post.id} className="bg-white mb-2 md:rounded-md border-b md:border border-gray-200">
            
            {/* Post Header */}
            <div className="px-4 pt-3 flex items-center text-xs text-gray-500 mb-2">
              <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center font-bold mr-2 text-sm">
                {post.community ? post.community.charAt(2) : "G"}
              </div>
              <div className="flex flex-col">
                <div className="flex items-center">
                  <span className="font-bold text-gray-900 mr-1">{post.community}</span>
                  <span className="text-gray-400">• {post.time}</span>
                </div>
                <div className="text-gray-500">u/{post.author}</div>
              </div>
            </div>

            {/* Post Content */}
            <div className="px-4 pb-2">
              <h3 className="text-lg font-bold text-gray-900 leading-snug mb-2">{post.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed mb-3 line-clamp-3">{post.body}</p>
            </div>

            {/* ACTION BAR (Now with Working Likes) */}
            <div className="px-4 py-3 flex items-center gap-6 border-t border-gray-50 text-gray-500">
              
              {/* Like Button (Heart) */}
              <button 
                onClick={() => handleLike(post.id)}
                className="flex items-center gap-2 hover:text-red-500 transition-colors group"
              >
                <svg className="w-5 h-5 group-hover:fill-red-500 group-active:scale-125 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                {/* DISPLAY THE LIKE COUNT HERE */}
                <span className="text-sm font-bold">{post.votes || 0}</span>
              </button>

              {/* Comment Button */}
              <button className="flex items-center gap-2 hover:text-blue-500 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                <span className="text-sm font-bold">{post.comments || 0}</span>
              </button>

              {/* Share Button */}
              <button className="flex items-center gap-2 hover:text-green-500 transition-colors ml-auto">
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
              </button>
            </div>

          </div>
        ))}
      </div>

      {/* --- BOTTOM NAV --- */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-3 flex justify-between items-center z-50">
        <div className="flex flex-col items-center">
          <svg className="w-6 h-6 text-black" fill="currentColor" viewBox="0 0 20 20"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" /></svg>
          <span className="text-[10px] font-bold mt-1">Home</span>
        </div>
        <div className="flex flex-col items-center text-gray-400">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" /></svg>
          <span className="text-[10px] mt-1">Communities</span>
        </div>
        <a href="/create" className="flex flex-col items-center -mt-6">
          <div className="bg-black text-white p-3 rounded-full shadow-lg">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          </div>
          <span className="text-[10px] font-bold mt-1 text-gray-400">Create</span>
        </a>
        <div className="flex flex-col items-center text-gray-400">
           <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
           <span className="text-[10px] mt-1">Chat</span>
        </div>
        <div className="flex flex-col items-center text-gray-400">
           <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
           <span className="text-[10px] mt-1">Inbox</span>
        </div>
      </div>
    </div>
  );
}
