"use client";
import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { auth, db, storage } from '../../../firebase'; 
import { onAuthStateChanged } from 'firebase/auth';
import { 
  doc, onSnapshot, collection, addDoc, query, orderBy, serverTimestamp, updateDoc, arrayUnion, arrayRemove, getDoc 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export default function DMChat({ params }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { id } = params;
  
  // "New" chat state
  const isNewChat = id === 'new';
  const targetUid = searchParams.get('uid');
  const targetName = searchParams.get('name') || "User";

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [user, setUser] = useState(null);
  const [chatName, setChatName] = useState(isNewChat ? targetName : "Chat");
  const [uploading, setUploading] = useState(false);
  
  // Reply State
  const [replyTo, setReplyTo] = useState(null); // { id, text, senderName }

  const bottomRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) return router.push('/signup');
      setUser(currentUser);

      if (!isNewChat) {
        // Fetch existing chat name
        const chatDoc = await getDoc(doc(db, "chats", id));
        if (chatDoc.exists()) {
          const data = chatDoc.data();
          const otherName = data.participantNames.find(n => n !== (currentUser.displayName || "User"));
          setChatName(otherName || "Chat");
        }
      }
    });

    if (!isNewChat) {
      const q = query(collection(db, "chats", id, "messages"), orderBy("createdAt", "asc"));
      const unsubMsg = onSnapshot(q, (snapshot) => {
        const msgs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        setMessages(msgs);
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      });
      return () => unsubMsg();
    }

    return () => unsubscribeAuth();
  }, [id, isNewChat, router]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() && !uploading) return;

    let chatId = id;

    // 1. Create Chat Doc if New
    if (isNewChat) {
      try {
        const docRef = await addDoc(collection(db, "chats"), {
          participants: [user.uid, targetUid],
          participantNames: [user.displayName || "User", targetName], 
          lastMessage: "Chat started",
          lastUpdated: serverTimestamp()
        });
        chatId = docRef.id;
        // Do not redirect yet, send the message first
      } catch (error) {
        console.error("Error creating chat:", error);
        return;
      }
    }

    // 2. Add Message
    await addDoc(collection(db, "chats", chatId, "messages"), {
      text: newMessage,
      senderId: user.uid,
      senderName: user.displayName || "User",
      type: "text",
      likes: [],
      replyTo: replyTo ? { text: replyTo.text, sender: replyTo.senderName } : null,
      createdAt: serverTimestamp()
    });
    
    // 3. Update Chat Metadata
    await updateDoc(doc(db, "chats", chatId), {
      lastMessage: newMessage,
      lastUpdated: serverTimestamp()
    });

    setNewMessage('');
    setReplyTo(null);

    // If we just created it, now switch URL
    if (isNewChat) {
      router.replace(`/chat/${chatId}`);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);

    // If new chat, must create doc first (simplified: force text first for new chats or handle complex logic. 
    // For MVP, alerting user to send text first is safer, but let's try to handle it)
    if (isNewChat) {
      alert("Please send a text message first to start the conversation.");
      setUploading(false);
      return;
    }

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
    if (isNewChat) return;
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

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col justify-end min-h-0 bg-gray-50">
        <div className="flex flex-col gap-2">
          {messages.map((msg) => {
            const isMe = msg.senderId === user.uid;
            const isLiked = msg.likes?.includes(user.uid); // Fixed check
            
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-1 group items-end gap-2`}>
                
                {/* Reply Arrow (Left side for me, Right side for them) */}
                {isMe && (
                  <button onClick={() => setReplyTo(msg)} className="opacity-0 group-hover:opacity-100 transition text-gray-300 hover:text-cyan-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
                  </button>
                )}

                <div 
                  onDoubleClick={() => handleLike(msg.id, msg.likes)}
                  className={`relative max-w-[75%] px-4 py-2 text-sm shadow-sm cursor-pointer select-none transition active:scale-95 ${
                    isMe 
                    ? 'bg-gradient-to-r from-cyan-600 to-cyan-500 text-white rounded-2xl rounded-br-sm' 
                    : 'bg-white text-gray-900 border border-gray-200 rounded-2xl rounded-bl-sm'
                  }`}
                >
                  {/* Quoted Reply */}
                  {msg.replyTo && (
                    <div className={`text-xs mb-1 pl-2 border-l-2 ${isMe ? 'border-white/50 text-white/80' : 'border-cyan-500 text-gray-500'}`}>
                      <span className="font-bold block">{msg.replyTo.sender}</span>
                      <span className="truncate block max-w-[150px]">{msg.replyTo.text}</span>
                    </div>
                  )}

                  {msg.type === 'image' ? (
                    <img src={msg.mediaUrl} alt="Sent" className="rounded-lg mb-1 w-full h-auto" />
                  ) : (
                    <p className="leading-relaxed">{msg.text}</p>
                  )}

                  {/* Heart */}
                  {(msg.likes?.length > 0) && (
                    <div className="absolute -bottom-2 -right-1 bg-white rounded-full p-0.5 border border-gray-100 shadow-sm flex items-center">
                      <span className="text-[10px]">❤️</span>
                      {msg.likes.length > 1 && <span className="text-[8px] text-gray-500 font-bold ml-0.5">{msg.likes.length}</span>}
                    </div>
                  )}
                </div>

                {/* Reply Arrow (For received messages) */}
                {!isMe && (
                  <button onClick={() => setReplyTo(msg)} className="opacity-0 group-hover:opacity-100 transition text-gray-300 hover:text-cyan-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
                  </button>
                )}
              </div>
            );
          })}
          <div ref={bottomRef}></div>
        </div>
      </div>

      {/* Input Area */}
      <div className="p-3 border-t border-gray-100 bg-white sticky bottom-0 z-20">
        
        {/* Reply Preview Banner */}
        {replyTo && (
          <div className="flex justify-between items-center bg-gray-50 p-2 rounded-lg mb-2 border-l-4 border-cyan-500">
            <div className="text-xs text-gray-600">
              <span className="font-bold text-cyan-600">Replying to {replyTo.senderName}</span>
              <p className="truncate max-w-[200px]">{replyTo.text}</p>
            </div>
            <button onClick={() => setReplyTo(null)} className="text-gray-400 hover:text-red-500">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        )}

        <form onSubmit={handleSendMessage} className="flex gap-2 items-center">
          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
          <button type="button" onClick={() => fileInputRef.current?.click()} className="text-cyan-600 p-2 bg-cyan-50 rounded-full hover:bg-cyan-100 transition">
            {uploading ? <span className="text-xs font-bold">...</span> : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
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
