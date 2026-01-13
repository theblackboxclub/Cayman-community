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

      // Fetch Chat Info (to get participant names)
      const chatDoc = await getDoc(doc(db, "chats", id));
      if (chatDoc.exists()) {
        setChatData(chatDoc.data());
      }

      // Listen for Messages
      const q = query(
        collection(db, "chats", id, "messages"),
        orderBy("createdAt", "asc")
      );

      const unsubMessages = onSnapshot(q, (snapshot) => {
        const msgs = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setMessages(msgs);
        // Scroll to bottom
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
      // Add message
      await addDoc(collection(db, "chats", id, "messages"), {
        text: newMessage,
        senderId: user.uid,
        createdAt: serverTimestamp()
      });

      // Update main chat doc (for last message preview)
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
    // Find name that isn't mine
    return chatData.participantNames?.find(name => name !== user.email.split('@')[0]) || "Chat";
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      
      {/* Header */}
      <div className="bg-white px-4 py-3 border-b border-gray-200 sticky top-0 z-10 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-gray-500 hover:text-black">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <div className="flex items-center gap-2">
           <div className="w-8 h-8 bg-black text-white rounded-full flex items-center justify-center font-bold text-sm">
             {getHeaderName().charAt(0).toUpperCase()}
           </div>
           <h1 className="font-bold text-lg text-gray-900">{getHeaderName()}</h1>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
        {messages.map((msg) => {
          const isMe = msg.senderId === user?.uid;
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] px-4 py-2 rounded-2xl text-sm ${
                isMe ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none'
              }`}>
                {msg.text}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input Area */}
      <div className="bg-white p-3 border-t border-gray-200">
        <form onSubmit={handleSend} className="max-w-2xl mx-auto flex gap-2">
          <input 
            type="text" 
            className="flex-1 bg-gray-100 border-none rounded-full px-4 py-3 text-sm focus:ring-1 focus:ring-black outline-none"
            placeholder="Message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
          />
          <button 
            type="submit" 
            disabled={!newMessage.trim()}
            className={`p-3 rounded-full transition ${newMessage.trim() ? 'bg-black text-white' : 'bg-gray-200 text-gray-400'}`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
          </button>
        </form>
      </div>

    </div>
  );
}
