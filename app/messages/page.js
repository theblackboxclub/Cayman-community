"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link'; 
import { useRouter } from 'next/navigation';
import { db, auth } from '../../firebase'; 
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';

export default function InboxPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (!u) return router.push('/signup');
      setUser(u);

      // Fetch all chats (DMs and Groups) ordered by time
      const q = query(
        collection(db, "chats"), 
        where("participants", "array-contains", u.uid),
        orderBy("createdAt", "desc") // Ensure you have an index for this, or remove orderBy if it errors
      );

      const unsubChats = onSnapshot(q, (snapshot) => {
        const chatList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setChats(chatList);
        setLoading(false);
      });

      return () => unsubChats();
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className="min-h-screen bg-white pb-24">
      
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 sticky top-0 bg-white/90 backdrop-blur-md z-10">
        <h1 className="font-black text-2xl text-gray-900">Inbox</h1>
      </div>

      {/* Message List */}
      <div className="p-2">
        {loading ? (
          <div className="text-center p-10 text-gray-400 font-bold">Loading...</div>
        ) : chats.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-4xl mb-2">📭</p>
            <p className="font-bold text-lg text-gray-600">No messages yet</p>
            <p className="text-sm mb-4">Join a community or match with someone!</p>
            <button onClick={() => router.push('/connect')} className="bg-cyan-600 text-white px-6 py-2 rounded-full font-bold text-sm">Find People</button>
          </div>
        ) : (
          <div className="space-y-1">
            {chats.map(chat => {
              // Logic to determine chat name (Group name OR Other User's name)
              const isGroup = chat.type === 'group';
              const otherUserId = chat.participants?.find(uid => uid !== user?.uid);
              const displayName = isGroup ? chat.name : (chat.otherUserName || "Private Chat"); // Ideally you fetch the user profile here

              return (
                <div 
                  key={chat.id} 
                  onClick={() => router.push(`/chat/${chat.id}`)} 
                  className="flex items-center gap-4 p-4 hover:bg-gray-50 rounded-2xl cursor-pointer transition border-b border-gray-50"
                >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg shadow-sm ${isGroup ? 'bg-orange-100 text-orange-600' : 'bg-cyan-100 text-cyan-600'}`}>
                    {isGroup ? (chat.name?.[0] || "G") : "👤"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <h3 className="font-bold text-gray-900 truncate">{displayName}</h3>
                      {chat.lastMessageTime && <span className="text-[10px] text-gray-400">Recently</span>}
                    </div>
                    <p className={`text-xs truncate ${chat.unread ? 'font-bold text-gray-900' : 'text-gray-500'}`}>
                      {chat.lastMessage || "No messages yet"}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* --- FIXED NAVIGATION BAR (Inbox Highlighted) --- */}
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
