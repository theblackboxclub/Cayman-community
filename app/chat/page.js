"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link'; 
import { useRouter } from 'next/navigation';
import { db, auth } from '../../firebase'; 
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';

export default function ChatHub() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('communities'); // 'communities' or 'private'
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // Creation State
  const [newChatName, setNewChatName] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);

  // Data State
  const [myChats, setMyChats] = useState([]);

  // Hardcoded Community Groups (Public)
  const communityGroups = [
    { id: "general_chat", name: "General Chat", icon: "🌴", description: "Island vibes for everyone." },
    { id: "market_chat", name: "Buy & Sell", icon: "💰", description: "Marketplace discussions." },
    { id: "nightlife_chat", name: "Nightlife", icon: "🥂", description: "What's happening tonight?" },
    { id: "tech_chat", name: "Tech & Crypto", icon: "💻", description: "Developers and investors." },
  ];

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (!u) return router.push('/signup');
      setUser(u);

      // Listen for My Private Chats
      const q = query(collection(db, "chats"), where("participants", "array-contains", u.uid));
      const unsubChats = onSnapshot(q, (snapshot) => {
        setMyChats(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
      return () => unsubChats();
    });
    return () => unsubscribe();
  }, []);

  const handleCreateChat = async () => {
    if (!newChatName.trim()) return alert("Enter a name!");
    
    await addDoc(collection(db, "chats"), {
      name: newChatName,
      isPrivate: isPrivate,
      participants: [user.uid], // Creator joins automatically
      createdAt: serverTimestamp(),
      lastMessage: "Chat created.",
      type: "group"
    });
    
    setShowCreateModal(false);
    setNewChatName('');
    setActiveTab('private'); // Switch to see new chat
  };

  return (
    // Blue & Sand Gradient Restored
    <div className="min-h-screen bg-gradient-to-b from-cyan-50 to-orange-50/30 pb-24">
      
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-md px-6 py-4 sticky top-0 z-50 border-b border-white/50 flex justify-between items-center shadow-sm">
        <h1 className="font-black text-2xl text-cyan-900 tracking-tight">Circle<span className="text-orange-500">Chat</span></h1>
        <button onClick={() => setShowCreateModal(true)} className="bg-cyan-600 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-lg hover:scale-105 transition">
          + New Group
        </button>
      </div>

      {/* Toggles */}
      <div className="p-4">
        <div className="bg-white/60 p-1 rounded-xl flex shadow-sm border border-white">
          <button onClick={() => setActiveTab('communities')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${activeTab === 'communities' ? 'bg-white shadow text-cyan-700' : 'text-gray-400'}`}>
            Public Communities
          </button>
          <button onClick={() => setActiveTab('private')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${activeTab === 'private' ? 'bg-white shadow text-cyan-700' : 'text-gray-400'}`}>
            My Chats
          </button>
        </div>
      </div>

      {/* List */}
      <div className="px-4 space-y-3">
        {activeTab === 'communities' && (
          <div className="animate-fade-in">
             {communityGroups.map(group => (
               <div key={group.id} onClick={() => router.push(`/chat/${group.id}`)} className="bg-white p-4 rounded-2xl shadow-sm border border-cyan-100 flex items-center gap-4 cursor-pointer hover:scale-[1.02] transition">
                 <div className="w-12 h-12 bg-cyan-100 rounded-full flex items-center justify-center text-2xl shadow-inner">
                   {group.icon}
                 </div>
                 <div className="flex-1">
                   <h3 className="font-bold text-gray-900">{group.name}</h3>
                   <p className="text-xs text-gray-500">{group.description}</p>
                 </div>
                 <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-300">
                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                 </div>
               </div>
             ))}
          </div>
        )}

        {activeTab === 'private' && (
           <div className="animate-fade-in">
             {myChats.length === 0 ? (
               <div className="text-center py-10 text-gray-400">
                 <p>No private chats yet.</p>
                 <button onClick={() => router.push('/connect')} className="text-cyan-600 font-bold text-sm mt-2">Find people to message!</button>
               </div>
             ) : (
               myChats.map(chat => (
                 <div key={chat.id} onClick={() => router.push(`/chat/${chat.id}`)} className="bg-white p-4 rounded-2xl shadow-sm border border-orange-100 flex items-center gap-4 cursor-pointer hover:scale-[1.02] transition">
                   <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 font-bold text-lg shadow-inner">
                     {chat.name?.[0] || "G"}
                   </div>
                   <div className="flex-1">
                     <h3 className="font-bold text-gray-900">{chat.name || "Group Chat"}</h3>
                     <p className="text-xs text-gray-400 truncate">{chat.lastMessage || "Start talking..."}</p>
                   </div>
                 </div>
               ))
             )}
           </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-scale-in">
            <h2 className="font-black text-xl mb-4 text-gray-900">Create Group Chat</h2>
            
            <input 
              type="text" 
              placeholder="Group Name (e.g. Sunday Brunch)" 
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-bold text-sm mb-4 outline-none focus:ring-2 focus:ring-cyan-200"
              value={newChatName}
              onChange={(e) => setNewChatName(e.target.value)}
              autoFocus
            />

            <div className="flex gap-2 mb-6">
               <button onClick={() => setIsPrivate(false)} className={`flex-1 py-2 rounded-lg text-xs font-bold border ${!isPrivate ? 'bg-cyan-50 border-cyan-200 text-cyan-700' : 'border-gray-100 text-gray-400'}`}>Public Group</button>
               <button onClick={() => setIsPrivate(true)} className={`flex-1 py-2 rounded-lg text-xs font-bold border ${isPrivate ? 'bg-orange-50 border-orange-200 text-orange-700' : 'border-gray-100 text-gray-400'}`}>Private Group</button>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setShowCreateModal(false)} className="flex-1 py-3 rounded-xl font-bold text-sm text-gray-500 hover:bg-gray-50">Cancel</button>
              <button onClick={handleCreateChat} className="flex-1 py-3 rounded-xl font-bold text-sm bg-black text-white shadow-lg hover:scale-105 transition">Create</button>
            </div>
          </div>
        </div>
      )}

      {/* CORRECT NAVIGATION BAR (No Explore) */}
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
