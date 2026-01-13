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
        // Scroll to bottom whenever messages change
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'auto' }), 100);
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
      // Force scroll to bottom after sending
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
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
        <div className="flex items-center gap-2">
           <div className="w-8 h-8 bg-gray-100 text-gray-500 rounded-full flex items-center justify-center font-bold text-xs">
             {getHeaderName().charAt(0).toUpperCase()}
           </div>
           <h1 className="font-bold text-sm text-gray-900">{getHeaderName()}</h1>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto bg-white">
        {/* min-h-full + justify-end: This forces content to start at the bottom 
           pb-20: Adds padding at bottom so text isn't hidden behind input bar
        */}
        <div className="flex flex-col justify-end min-h-full px-3 pb-20 pt-4 gap-2">
          {messages.map((msg, index) => {
            const isMe = msg.senderId === user?.uid;
            
            // Check if previous message was from same sender (to group bubbles)
            const isSequence = index > 0 && messages[index - 1].senderId === msg.senderId;

            return (
              <div key={msg.id} className={`flex w-full ${isMe ? 'justify-end' : 'justify-start items-end gap-2'}`}>
                
                {/* Avatar (only show for others, and only at bottom of sequence or single message) */}
                {!isMe && (
                  <div className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-[9px] font-bold text-gray-500 ${isSequence ? 'invisible' : 'bg-gray-200'}`}>
                     {!isSequence && getHeaderName().charAt(0).toUpperCase()}
                  </div>
                )}

                <div className={`max-w-[70%] px-4 py-2 text-sm rounded-3xl break-words ${
                  isMe 
                    ? 'bg-blue-500 text-white rounded-br-md' 
                    : 'bg-gray-100 text-gray-900 rounded-bl-md'
                }`}>
                  {msg.text}
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input Area - Fixed to bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-white px-3 py-3 border-t border-gray-100">
        <form onSubmit={handleSend} className="max-w-md mx-auto relative flex items-center">
          <input 
            type="text" 
            className="w-full bg-gray-100 border-none rounded-full pl-5 pr-12 py-3 text-sm focus:ring-0 outline-none placeholder-gray-400 text-gray-900"
            placeholder="Message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
          />
          {newMessage.trim() && (
            <button 
              type="submit" 
              className="absolute right-2 p-1.5 text-blue-500 hover:text-blue-600 transition font-bold text-sm"
            >
              Send
            </button>
          )}
        </form>
      </div>

    </div>
  );
}
