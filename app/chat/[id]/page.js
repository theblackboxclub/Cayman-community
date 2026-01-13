"use client";
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db, storage } from '../../../firebase'; // Added storage import
import { onAuthStateChanged } from 'firebase/auth';
import { 
  collection, query, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, getDoc, arrayUnion, arrayRemove 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'; // Added storage functions

export default function ChatRoom({ params }) {
  const router = useRouter();
  const { id } = params;
  
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [imageFile, setImageFile] = useState(null); // Track selected image
  const [isSending, setIsSending] = useState(false); // Track upload status
  const [replyingTo, setReplyingTo] = useState(null);
  
  const [user, setUser] = useState(null);
  const [chatData, setChatData] = useState(null);
  
  const bottomRef = useRef(null);
  const fileInputRef = useRef(null); // Ref for hidden file input

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
        
        // Sort Oldest first
        msgs.sort((a, b) => {
           const timeA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
           const timeB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
           return timeA - timeB; 
        });

        setMessages(msgs);
        // Scroll only if we are near bottom or new message
        if (bottomRef.current) {
             setTimeout(() => bottomRef.current.scrollIntoView({ behavior: 'auto' }), 100);
        }
      });

      return () => unsubMessages();
    });

    return () => unsubscribe();
  }, [id, router]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() && !imageFile) return;

    setIsSending(true);

    try {
      let mediaUrl = null;
      let mediaType = 'text';

      // 1. Upload Image if exists
      if (imageFile) {
        const uniqueName = `chat-media/${id}/${Date.now()}-${imageFile.name}`;
        const storageRef = ref(storage, uniqueName);
        const snapshot = await uploadBytes(storageRef, imageFile);
        mediaUrl = await getDownloadURL(snapshot.ref);
        mediaType = 'image';
      }

      const payload = {
        text: newMessage,
        senderId: user.uid,
        createdAt: serverTimestamp(),
        likedBy: [],
        mediaUrl: mediaUrl,
        mediaType: mediaType
      };

      if (replyingTo) {
        payload.replyTo = {
          id: replyingTo.id,
          text: replyingTo.mediaType === 'image' ? '📷 Image' : replyingTo.text,
          senderId: replyingTo.senderId
        };
      }

      await addDoc(collection(db, "chats", id, "messages"), payload);

      // Determine preview text for chat list
      const previewText = mediaType === 'image' ? (newMessage ? `📷 ${newMessage}` : '📷 Image') : newMessage;

      await updateDoc(doc(db, "chats", id), {
        lastMessage: previewText,
        lastUpdated: serverTimestamp()
      });

      setNewMessage('');
      setImageFile(null);
      setReplyingTo(null);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (error) {
      console.error("Error sending:", error);
      alert("Error sending message.");
    } finally {
      setIsSending(false);
    }
  };

  const handleLike = async (msg) => {
    const msgRef = doc(db, "chats", id, "messages", msg.id);
    const isLiked = msg.likedBy?.includes(user.uid);

    if (isLiked) {
      await updateDoc(msgRef, { likedBy: arrayRemove(user.uid) });
    } else {
      await updateDoc(msgRef, { likedBy: arrayUnion(user.uid) });
    }
  };

  const getHeaderName = () => {
    if (!chatData || !user) return "Chat";
    return chatData.participantNames?.find(name => name !== user.email.split('@')[0]) || "Chat";
  };

  return (
    <div className="flex flex-col h-screen bg-white">
      
      {/* Header */}
      <div className="bg-white px-4 py-2 border-b border-gray-100 sticky top-0 z-10 flex items-center gap-3 shadow-sm">
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
        <div className="flex flex-col justify-end min-h-full px-3 pb-28 pt-4 gap-2">
          {messages.map((msg, index) => {
            const isMe = msg.senderId === user?.uid;
            const isLiked = msg.likedBy?.length > 0;
            const isSequence = index > 0 && messages[index - 1].senderId === msg.senderId;

            return (
              <div key={msg.id} className={`flex w-full group ${isMe ? 'justify-end' : 'justify-start items-end gap-2'}`}>
                
                {/* Avatar */}
                {!isMe && (
                  <div className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-[9px] font-bold text-gray-500 ${isSequence ? 'invisible' : 'bg-gray-200'}`}>
                     {!isSequence && getHeaderName().charAt(0).toUpperCase()}
                  </div>
                )}

                {/* Bubble Wrapper */}
                <div className={`relative flex items-center gap-2 max-w-[75%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                  
                  {/* Reply Button */}
                  <button 
                    onClick={() => setReplyingTo(msg)}
                    className="opacity-0 group-hover:opacity-100 transition text-gray-400 hover:text-gray-600 p-1"
                  >
                    <svg className="w-4 h-4 transform scale-x-[-1]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
                  </button>

                  {/* The Bubble */}
                  <div 
                    onDoubleClick={() => handleLike(msg)}
                    className={`relative px-3 py-2 text-sm rounded-2xl cursor-pointer select-none transition active:scale-95 overflow-hidden ${
                    isMe 
                      ? 'bg-blue-500 text-white rounded-br-sm' 
                      : 'bg-gray-100 text-gray-900 rounded-bl-sm'
                  }`}>
                    
                    {/* Reply Context */}
                    {msg.replyTo && (
                      <div className={`mb-1 pl-2 border-l-2 text-xs opacity-80 ${isMe ? 'border-white/50' : 'border-gray-400'}`}>
                        <p className="font-bold truncate">Replying to {msg.replyTo.senderId === user.uid ? 'You' : getHeaderName()}</p>
                        <p className="truncate line-clamp-1">{msg.replyTo.text}</p>
                      </div>
                    )}

                    {/* IMAGE DISPLAY */}
                    {msg.mediaType === 'image' && msg.mediaUrl && (
                      <div className="mb-1 rounded-lg overflow-hidden">
                        <img src={msg.mediaUrl} alt="Sent image" className="w-full h-auto object-cover max-h-60" />
                      </div>
                    )}

                    {msg.text && <p>{msg.text}</p>}

                    {/* Heart Overlay */}
                    {isLiked && (
                      <div className={`absolute -bottom-2 ${isMe ? '-left-2' : '-right-2'} bg-white border border-gray-100 rounded-full p-0.5 shadow-sm`}>
                        <span className="text-xs">❤️</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-20">
        
        {/* Reply Preview */}
        {replyingTo && (
          <div className="bg-gray-50 px-4 py-2 flex justify-between items-center border-b border-gray-100">
             <div className="text-xs text-gray-500">
               <span className="font-bold">Replying to:</span> {replyingTo.mediaType === 'image' ? '📷 Image' : replyingTo.text.substring(0, 30)}...
             </div>
             <button onClick={() => setReplyingTo(null)} className="text-gray-400 hover:text-gray-600">
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
             </button>
          </div>
        )}

        {/* Image Preview (Before Sending) */}
        {imageFile && (
           <div className="px-4 py-2 flex items-center gap-3 bg-gray-50 border-b border-gray-100">
             <div className="relative w-12 h-12 rounded overflow-hidden border border-gray-200">
                <img src={URL.createObjectURL(imageFile)} className="w-full h-full object-cover" />
             </div>
             <div className="flex-1 text-xs text-gray-500 truncate">
                {imageFile.name}
             </div>
             <button onClick={() => setImageFile(null)} className="text-gray-400 hover:text-red-500">
               <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
             </button>
           </div>
        )}

        <div className="px-3 py-3">
          <form onSubmit={handleSend} className="max-w-md mx-auto relative flex items-center gap-2">
            
            {/* Hidden File Input */}
            <input 
              type="file" 
              accept="image/*" 
              ref={fileInputRef} 
              className="hidden" 
              onChange={(e) => {
                if(e.target.files[0]) setImageFile(e.target.files[0]);
              }} 
            />

            {/* Media Button (Paperclip/Image Icon) */}
            <button 
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-gray-400 hover:text-gray-600 p-2"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            </button>

            <input 
              type="text" 
              className="flex-1 bg-gray-100 border-none rounded-full pl-5 pr-12 py-3 text-sm focus:ring-0 outline-none placeholder-gray-400 text-gray-900"
              placeholder={replyingTo ? "Type reply..." : "Message..."}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              disabled={isSending}
            />
            
            {(newMessage.trim() || imageFile) && (
              <button 
                type="submit" 
                disabled={isSending}
                className="absolute right-2 p-1.5 text-blue-500 hover:text-blue-600 transition font-bold text-sm"
              >
                {isSending ? '...' : 'Send'}
              </button>
            )}
          </form>
        </div>
      </div>

    </div>
  );
}
