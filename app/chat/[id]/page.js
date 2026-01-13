"use client";
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '../../../firebase'; 
import { onAuthStateChanged } from 'firebase/auth';
import { 
  collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, getDoc 
} from 'firebase/firestore';

export default function ChatRoom({ params }) {
  const router = useRouter();
  const { id } = params;
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [user, setUser] = useState(null);
  const [chatData, setChatData] = useState(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.push('/signup');
        return;
      }
      setUser(currentUser);

      const chatDoc = await getDoc(doc(db, "chats", id));
      if (chatDoc.exists()) {
        setChatData(chatDoc.data());
      }

      // FIX: Remove orderBy to prevent index errors if they occur
      const q = query(collection(db, "chats", id, "messages"));

      const unsubMessages = onSnapshot(q, (snapshot) => {
        const msgs = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Sort in JS
        msgs.sort((a, b) => {
           const timeA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
           const timeB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
           return timeA - timeB; // Oldest first
        });

        setMessages(msgs);
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      });

      return () => unsubMessages();
    });

    return () => unsubscribe();
  }, [id, router]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      await addDoc(collection(db, "chats", id, "messages"), {
        text: newMessage,
        senderId: user.uid,
        createdAt: serverTimestamp()
      });

      await updateDoc(doc(db, "chats", id), {
        lastMessage: newMessage,
        lastUpdated: serverTimestamp()
      });

      setNewMessage('');
    } catch (error) {
      console.error("Error sending:", error);
    }
  };

  const getHeaderName = () => {
    if (!chatData || !user) return "Chat";
    return chatData.participantNames?.find(name => name !== user.email.split('@')[0]) || "Chat";
  };

  return (
    <div className="flex flex-col h-screen bg-white">
      
      {/* Header */}
      <div className="bg-white px-4 py-3 border-b border-gray-100 sticky top-0 z-10 flex items-center gap-3 shadow-sm">
        <button onClick={() => router.back()} className="text-gray-900">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <div className="flex items-center gap-3">
           <div className="w-8 h-8 bg-gray-100 text-gray-500 rounded-full flex items-center justify-center font-bold text-sm">
             {getHeaderName().charAt(0).toUpperCase()}
           </div>
           <h1 className="font-bold text-base text-gray-900">{getHeaderName()}</h1>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-1.5 pb-20">
        {messages.map((msg) => {
          const isMe = msg.senderId === user?.uid;
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[70%] px-4 py-2.5 text-sm rounded-3xl ${
                isMe 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-100 text-gray-900'
              }`}>
                {msg.text}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Instagram-Style Input Area */}
      <div className="fixed bottom-0 left-0 right-0 bg-white px-4 py-3 border-t border-gray-100">
        <form onSubmit={handleSend} className="max-w-md mx-auto relative flex items-center">
          <input 
            type="text" 
            className="w-full bg-gray-100 border-none rounded-full pl-5 pr-12 py-3 text-sm focus:ring-0 outline-none placeholder-gray-500 text-gray-900"
            placeholder="Message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
          />
          {newMessage.trim() && (
            <button 
              type="submit" 
              className="absolute right-2 p-2 text-blue-500 hover:text-blue-700 transition"
            >
              <span className="text-sm font-bold">Send</span>
            </button>
          )}
        </form>
      </div>

    </div>
  );
}
