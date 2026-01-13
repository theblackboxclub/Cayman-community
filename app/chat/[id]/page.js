"use client";
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '../../../firebase'; 
import { onAuthStateChanged } from 'firebase/auth';
import { 
  collection, query, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, getDoc 
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

      const q = query(collection(db, "chats", id, "messages"));

      const unsubMessages = onSnapshot(q, (snapshot) => {
        const msgs = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Sort in JS (Oldest first)
        msgs.sort((a, b) => {
           const timeA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
           const timeB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
           return timeA - timeB; 
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
      
      {/* Header - Very Compact */}
      <div className="bg-white px-4 py-2 border-b border-gray-100 sticky top-0 z-10 flex items-center gap-3 shadow-sm">
        <button onClick={() => router.back()} className="text-gray-900">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <div className="flex items-center gap-2">
           <div className="w-6 h-6 bg-gray-100 text-gray-500 rounded-full flex items-center justify-center font-bold text-xs">
             {getHeaderName().charAt(0).toUpperCase()}
           </div>
           <h1 className="font-bold text-sm text-gray-900">{getHeaderName()}</h1>
        </div>
      </div>

      {/* Messages Area - Compact Bubbles */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-1 pb-20">
        {messages.map((msg, index) => {
          const isMe = msg.senderId === user?.uid;
          
          return (
            <div key={msg.id} className={`flex w-full ${isMe ? 'justify-end' : 'justify-start items-end gap-2'}`}>
              
              {/* Show Avatar for Other Person */}
              {!isMe && (
                <div className="w-5 h-5 bg-gray-200 rounded-full flex-shrink-0 flex items-center justify-center text-[8px] font-bold text-gray-500">
                   {getHeaderName().charAt(0).toUpperCase()}
                </div>
              )}

              <div className={`max-w-[65%] px-3 py-1.5 text-sm rounded-2xl ${
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

      {/* Input Area - Ultra Slim */}
      <div className="fixed bottom-0 left-0 right-0 bg-white px-3 py-2 border-t border-gray-100">
        <form onSubmit={handleSend} className="max-w-md mx-auto relative flex items-center">
          <input 
            type="text" 
            className="w-full bg-gray-100 border-none rounded-full pl-4 pr-10 py-1.5 text-sm focus:ring-0 outline-none placeholder-gray-400 text-gray-900"
            placeholder="Message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
          />
          {newMessage.trim() && (
            <button 
              type="submit" 
              className="absolute right-1.5 p-1 bg-blue-500 rounded-full text-white hover:bg-blue-600 transition flex items-center justify-center"
            >
              <svg className="w-3 h-3 transform rotate-90" fill="currentColor" viewBox="0 0 20 20"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>
            </button>
          )}
        </form>
      </div>

    </div>
  );
}
