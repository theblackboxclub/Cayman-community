"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link'; 
import { useRouter } from 'next/navigation';
import { db, auth } from '../../firebase'; 
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

export default function ChatList() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState(null);
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (!user) return router.push('/signup');
      setCurrentUser(user);

      // Listen for chats where user is a participant
      const q = query(collection(db, "chats"), where("participants", "array-contains", user.uid));
      const unsubscribeChats = onSnapshot(q, (snapshot) => {
        const chatData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setChats(chatData);
        setLoading(false);
      });
      return () => unsubscribeChats();
    });
    return () => unsubscribeAuth();
  }, []);

  return (
    <div className="min-h-screen bg-white pb-24">
      
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 sticky top-0 bg-white/90 backdrop-blur-md z-10 flex justify-between items-center">
        <h1 className="font-black text-2xl">Chats 💬</h1>
        <button className="bg-black text-white px-4 py-1.5 rounded-full text-xs font-bold shadow-lg" onClick={() => alert("Start chat from a User Profile!")}>+ New</button>
      </div>

      {/* List */}
      <div className="p-2">
        {loading ? <div className="text-center p-10 text-gray-400">Loading chats...</div> : 
         chats.length === 0 ? (
           <div className="text-center py-20 text-gray-400">
             <p className="font-bold text-lg mb-2">No chats yet 🦗</p>
             <p className="text-sm">Go to <span className="font-bold text-black cursor-pointer" onClick={() => router.push('/connect')}>Connect</span> to find people!</p>
           </div>
         ) : (
           chats.map(chat => (
             <div key={chat.id} onClick={() => router.push(`/chat/${chat.id}`)} className="flex items-center gap-4 p-4 hover:bg-gray-50 rounded-2xl cursor-pointer transition border-b border-gray-50">
               <div className="w-12 h-12 bg-cyan-100 rounded-full flex items-center justify-center text-cyan-700 font-bold text-lg">
                 {chat.users?.find(id => id !== currentUser.uid)?.substring(0,2).toUpperCase() || "?"}
               </div>
               <div className="flex-1">
                 <h3 className="font-bold text-gray-900">Chat</h3>
                 <p className="text-xs text-gray-500 truncate">{chat.lastMessage || "No messages yet"}</p>
               </div>
               <span className="text-[10px] text-gray-300 font-bold">Open ›</span>
             </div>
           ))
         )
        }
      </div>

      {/* FIXED NAVIGATION BAR */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-gray-100 px-6 py-3 flex justify-between items-center z-50">
        <button onClick={() => router.push('/')} className="flex flex-col items-center text-gray-400 hover:text-black"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg><span className="text-[10px] mt-1">Home</span></button>
        <button onClick={() => router.push('/connect')} className="flex flex-col items-center text-gray-400 hover:text-black"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg><span className="text-[10px] mt-1">Connect</span></button>
        <button onClick={() => router.push('/create')} className="flex flex-col items-center -mt-6"><div className="bg-black text-white p-3 rounded-full shadow-lg hover:bg-gray-800 hover:scale-105 transition"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg></div><span className="text-[10px] font-bold mt-1 text-gray-400">Create</span></button>
        <button onClick={() => router.push('/chat')} className="flex flex-col items-center text-black"><svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg><span className="text-[10px] font-bold mt-1">Chat</span></button>
        <button onClick={() => router.push('/messages')} className="flex flex-col items-center text-gray-400 hover:text-black"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg><span className="text-[10px] mt-1">Inbox</span></button>
      </div>
    </div>
  );
}
