"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link'; 
import { useRouter } from 'next/navigation';
import { db, auth } from '../../firebase'; 
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

export default function ActivityInbox() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (!u) return router.push('/signup');
      setUser(u);

      // FIX: Removed 'orderBy' to prevent Index Errors. We sort manually below.
      const q = query(
        collection(db, "notifications"), 
        where("toUserId", "==", u.uid)
      );

      const unsubNotes = onSnapshot(q, (snapshot) => {
        const notes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Manual Sort (Newest First)
        notes.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        
        setNotifications(notes);
        setLoading(false);
      }, (error) => {
        console.error("Error fetching notifications:", error);
        setLoading(false); // Stop loading even if error
      });

      return () => unsubNotes();
    });
    return () => unsubscribe();
  }, []);

  // Helper to format notification text
  const getNotificationText = (note) => {
    if (note.type === 'like') return `liked your post: "${note.postTitle}"`;
    if (note.type === 'comment') return `commented: "${note.commentText}"`;
    if (note.type === 'reply') return `replied to you: "${note.commentText}"`;
    return "interacted with you.";
  };

  return (
    <div className="min-h-screen bg-white pb-24">
      
      {/* Header - NO EMOJI */}
      <div className="px-6 py-4 border-b border-gray-100 sticky top-0 bg-white/90 backdrop-blur-md z-10">
        <h1 className="font-black text-2xl text-cyan-900">Activity</h1>
      </div>

      {/* Notification List */}
      <div className="p-2">
        {loading ? (
          <div className="text-center p-10 text-gray-400 font-bold">Loading activity...</div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <div className="flex justify-center mb-4">
               <svg className="w-12 h-12 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
            </div>
            <p className="font-bold text-lg text-gray-600">No activity yet</p>
            <p className="text-sm mb-4 text-gray-400">When people like or comment, you'll see it here.</p>
          </div>
        ) : (
          <div className="space-y-1">
            {notifications.map(note => (
              <div 
                key={note.id} 
                onClick={() => router.push(`/post/${note.postId}`)} 
                className={`flex items-center gap-3 p-4 hover:bg-cyan-50/50 rounded-2xl cursor-pointer transition border-b border-gray-50 ${!note.read ? 'bg-orange-50/30' : ''}`}
              >
                {/* Icon based on type */}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg shadow-sm border ${note.type === 'like' ? 'bg-red-50 border-red-100 text-red-500' : 'bg-blue-50 border-blue-100 text-blue-500'}`}>
                  {note.type === 'like' ? (
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>
                  ) : (
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">
                    <span className="font-bold">{note.fromName}</span> <span className="text-gray-600">{getNotificationText(note)}</span>
                  </p>
                  <p className="text-[10px] text-gray-400 mt-1 font-bold">Tap to view post</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-gray-100 px-6 py-3 flex justify-between items-center z-50">
        <button onClick={() => router.push('/')} className="flex flex-col items-center text-gray-400 hover:text-black"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg><span className="text-[10px] mt-1">Home</span></button>
        <button onClick={() => router.push('/connect')} className="flex flex-col items-center text-gray-400 hover:text-black"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg><span className="text-[10px] mt-1">Connect</span></button>
        <button onClick={() => router.push('/create')} className="flex flex-col items-center -mt-6"><div className="bg-black text-white p-3 rounded-full shadow-lg hover:bg-gray-800 hover:scale-105 transition"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg></div><span className="text-[10px] font-bold mt-1 text-gray-400">Create</span></button>
        <button onClick={() => router.push('/chat')} className="flex flex-col items-center text-gray-400 hover:text-black"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg><span className="text-[10px] mt-1">Chat</span></button>
        <button onClick={() => router.push('/messages')} className="flex flex-col items-center text-black"><svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg><span className="text-[10px] font-bold mt-1">Inbox</span></button>
      </div>
    </div>
  );
}
