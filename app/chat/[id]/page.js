"use client";
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db, storage } from '../../../firebase'; 
import { onAuthStateChanged } from 'firebase/auth';
import { 
  doc, onSnapshot, collection, addDoc, query, orderBy, serverTimestamp, updateDoc, arrayUnion, arrayRemove, getDoc 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export default function DMChat({ params }) {
  const router = useRouter();
  const { id } = params;
  
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [user, setUser] = useState(null);
  const [chatName, setChatName] = useState("Chat");
  const [uploading, setUploading] = useState(false);
  
  const bottomRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) return router.push('/signup');
      setUser(currentUser);

      // Get Chat Info
      const chatDoc = await getDoc(doc(db, "chats", id));
      if (chatDoc.exists()) {
        const data = chatDoc.data();
        const otherName = data.participantNames.find(n => n !== currentUser.displayName);
        setChatName(otherName || "Chat");
      }
    });

    // Listen to Messages
    const q = query(collection(db, "chats", id, "messages"), orderBy("createdAt", "asc"));
    const unsubMsg = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setMessages(msgs);
      // Auto scroll to bottom
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });

    return () => {
      unsubscribeAuth();
      unsubMsg();
    };
  }, [id, router]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    await addDoc(collection(db, "chats", id, "messages"), {
      text: newMessage,
      senderId: user.uid,
      type: "text",
      likes: [],
      createdAt: serverTimestamp()
    });
    
    // Update Chat Metadata
    await updateDoc(doc(db, "chats", id), {
      lastMessage: newMessage,
      lastUpdated: serverTimestamp()
    });

    setNewMessage('');
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);

    try {
      const storageRef = ref(storage, `chat_images/${id}/${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const url = await getDownloadURL(snapshot.ref);

      await addDoc(collection(db, "chats", id, "messages"), {
        senderId: user.uid,
        type: "image",
        mediaUrl: url,
        likes: [],
        createdAt: serverTimestamp()
      });

      await updateDoc(doc(db, "chats", id), {
        lastMessage: "📷 Photo sent",
        lastUpdated: serverTimestamp()
      });

    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const handleLike = async (msgId, currentLikes) => {
    const msgRef = doc(db, "chats", id, "messages", msgId);
    if (currentLikes?.includes(user.uid)) {
      await updateDoc(msgRef, { likes: arrayRemove(user.uid) });
    } else {
      await updateDoc(msgRef, { likes: arrayUnion(user.uid) });
    }
  };

  if (!user) return <div className="p-10 text-center">Loading...</div>;

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-md px-4 py-3 border-b border-gray-100 flex items-center gap-3 sticky top-0 z-20 shadow-sm">
        <button onClick={() => router.back()}><svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg></button>
        <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center font-bold text-gray-600 text-sm">
          {chatName.charAt(0).toUpperCase()}
        </div>
        <h1 className="font-bold text-gray-900">{chatName}</h1>
      </div>

      {/* Messages Area - Starts from bottom */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col justify-end min-h-0 bg-white">
        <div className="flex flex-col gap-2"> {/* Actual list container */}
          {messages.map((msg) => {
            const isMe = msg.senderId === user.uid;
            const isLiked = msg.likes?.length > 0;
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-1 group items-end gap-2`}>
                
                {/* Message Bubble */}
                <div className={`relative max-w-[70%] px-4 py-2 text-sm shadow-sm ${isMe ? 'bg-cyan-500 text-white rounded-2xl rounded-br-none' : 'bg-gray-100 text-gray-800 rounded-2xl rounded-bl-none'}`}>
                  
                  {msg.type === 'image' ? (
                    <img src={msg.mediaUrl} alt="Sent" className="rounded-lg mb-1 w-full h-auto" />
                  ) : (
                    <p>{msg.text}</p>
                  )}

                  {/* Reaction Heart (Bottom right of bubble) */}
                  {isLiked && (
                    <div className="absolute -bottom-2 -right-1 bg-white rounded-full p-0.5 border border-gray-100 shadow-sm">
                      <span className="text-[10px]">❤️</span>
                    </div>
                  )}
                </div>

                {/* Like Button (Visible on hover or click) */}
                <button 
                  onClick={() => handleLike(msg.id, msg.likes)}
                  className={`text-gray-300 hover:text-red-500 transition ${isLiked ? 'text-red-500' : 'opacity-0 group-hover:opacity-100'}`}
                >
                  <svg className="w-4 h-4" fill={msg.likes?.includes(user.uid) ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                </button>
              </div>
            );
          })}
          <div ref={bottomRef}></div>
        </div>
      </div>

      {/* Input Area */}
      <div className="p-3 border-t border-gray-100 bg-white sticky bottom-0 z-20">
        <form onSubmit={handleSendMessage} className="flex gap-2 items-center">
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*" 
            onChange={handleImageUpload} 
          />
          <button 
            type="button" 
            onClick={() => fileInputRef.current?.click()}
            className="text-cyan-600 p-2 bg-cyan-50 rounded-full hover:bg-cyan-100"
          >
            {uploading ? (
              <span className="text-xs font-bold">...</span>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            )}
          </button>

          <input 
            type="text" 
            className="flex-1 bg-gray-100 rounded-full px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-cyan-100 placeholder-gray-400"
            placeholder="Message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
          />
          
          <button type="submit" disabled={!newMessage.trim()} className="text-cyan-600 font-bold text-sm px-2 disabled:opacity-50">
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
