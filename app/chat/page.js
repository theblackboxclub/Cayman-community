"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '../../firebase'; 
import { onAuthStateChanged } from 'firebase/auth';
import { 
  collection, query, where, onSnapshot, addDoc, serverTimestamp, getDocs 
} from 'firebase/firestore';
import Link from 'next/link';

export default function ChatList() {
  const router = useRouter();
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newChatUsername, setNewChatUsername] = useState('');
  const [searchError, setSearchError] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        router.push('/signup');
        return;
      }
      setUser(currentUser);

      const q = query(
        collection(db, "chats"),
        where("participants", "array-contains", currentUser.uid)
      );

      const unsubChats = onSnapshot(q, (snapshot) => {
        const chatData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        chatData.sort((a, b) => {
           const timeA = a.lastUpdated?.toDate ? a.lastUpdated.toDate() : new Date(0);
           const timeB = b.lastUpdated?.toDate ? b.lastUpdated.toDate() : new Date(0);
           return timeB - timeA;
        });

        setChats(chatData);
        setLoading(false);
      });

      return () => unsubChats();
    });

    return () => unsubscribe();
  }, [router]);

  const handleStartChat = async () => {
    setSearchError('');
    if (!newChatUsername.trim()) return;

    const usersRef = collection(db, "users");
    const q = query(usersRef, where("username", "==", newChatUsername.trim()));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      setSearchError("User not found.");
      return;
    }

    const recipient = querySnapshot.docs[0].data();
    const recipientId = querySnapshot.docs[0].id;

    if (recipientId === user.uid) {
      setSearchError("Cannot chat with yourself.");
      return;
    }

    const existingChat = chats.find(c => c.participants.includes(recipientId));
    if (existingChat) {
      router.push(`/chat/${existingChat.id}`);
      return;
    }

    try {
      const docRef = await addDoc(collection(db, "chats"), {
        participants: [user.uid, recipientId],
        participantNames: [user.email.split('@')[0], recipient.username], 
        lastMessage: "Chat started",
        lastUpdated: serverTimestamp()
      });
      router.push(`/chat/${docRef.id}`);
    } catch (error) {
      console.error("Error creating chat:", error);
    }
  };

  const getOtherParticipantName = (chat) => {
    if (!chat.participantNames) return "Unknown";
    return chat.participantNames.find(name => name !== user.email.split('@')[0]) || "Chat";
  };

  if (loading) return <div className="p-10 text-center text-gray-400 text-sm">Loading Chats...</div>;

  return (
    <div className="min-h-screen bg-gradient-to-b from-cyan-50 to-white pb-24">
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-md border-b border-gray-100 sticky top-0 z-10 px-4 py-3 flex items-center justify-between shadow-sm">
         <h1 className="font-black text-xl text-gray-900 tracking-tight">Messages</h1>
         <button 
           onClick={() => setIsCreating(!isCreating)} 
           className="bg-cyan-600 text-white px-4 py-1.5 rounded-full text-xs font-bold shadow-md hover:bg-cyan-700 transition"
         >
           + New Chat
         </button>
      </div>

      <div className="max-w-md mx-auto">
        
        {/* New Chat Input */}
        {isCreating && (
          <div className="p-4 bg-white/50 border-b border-gray-100 backdrop-blur-sm">
            <p className="text-xs font-bold text-gray-500 mb-2">Who do you want to message?</p>
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="Username (e.g. SaltyIguana99)" 
                className="flex-1 bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-cyan-100"
                value={newChatUsername}
                onChange={(e) => setNewChatUsername(e.target.value)}
              />
              <button onClick={handleStartChat} className="bg-black text-white px-4 py-2 rounded-xl text-sm font-bold shadow-sm">Go</button>
            </div>
            {searchError && <p className="text-xs text-red-500 mt-2 font-bold">{searchError}</p>}
          </div>
        )}

        {/* Chat List */}
        {chats.length === 0 ? (
          <div className="text-center py-20">
             <div className="w-16 h-16 bg-cyan-100 rounded-full flex items-center justify-center mx-auto mb-4 text-cyan-600">
               <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
             </div>
             <p className="text-gray-500 text-sm font-medium">No messages yet.</p>
          </div>
        ) : (
          chats.map(chat => {
            const unreadCount = chat[`unreadCount_${user.uid}`] || 0;
            const isUnread = unreadCount > 0;

            return (
              <Link key={chat.id} href={`/chat/${chat.id}`}>
                <div className={`p-4 border-b border-gray-50 hover:bg-white/60 transition cursor-pointer flex gap-3 ${isUnread ? 'bg-cyan-50/50' : 'bg-transparent'}`}>
                  <div className="w-12 h-12 bg-white border border-gray-100 shadow-sm rounded-full flex items-center justify-center font-bold text-gray-700 text-sm relative">
                    {getOtherParticipantName(chat).charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 pt-1">
                    <div className="flex justify-between items-center mb-1">
                      <span className={`text-sm ${isUnread ? 'font-black text-gray-900' : 'font-bold text-gray-700'}`}>
                        {getOtherParticipantName(chat)}
                      </span>
                      <span className={`text-[10px] font-bold ${isUnread ? 'text-cyan-600' : 'text-gray-400'}`}>
                        {chat.lastUpdated?.toDate ? chat.lastUpdated.toDate().toLocaleDateString() : ''}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <p className={`text-sm truncate max-w-[200px] ${isUnread ? 'font-bold text-gray-900' : 'text-gray-500'}`}>
                        {chat.lastMessage}
                      </p>
                      {isUnread && (
                        <div className="w-2.5 h-2.5 bg-cyan-500 rounded-full shadow-sm"></div>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>

      {/* Bottom Nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-gray-100 px-6 py-3 flex justify-between items-center z-50">
        <Link href="/" className="flex flex-col items-center text-gray-400 hover:text-black">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
          <span className="text-[10px] mt-1">Home</span>
        </Link>
        <Link href="/explore" className="flex flex-col items-center text-gray-400 hover:text-black">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
          <span className="text-[10px] mt-1">Explore</span>
        </Link>
        <Link href="/create" className="flex flex-col items-center -mt-6">
          <div className="bg-black text-white p-3 rounded-full shadow-lg hover:bg-gray-800 hover:scale-105 transition">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          </div>
          <span className="text-[10px] font-bold mt-1 text-gray-400">Create</span>
        </Link>
        <div className="flex flex-col items-center text-black cursor-pointer">
           <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
           <span className="text-[10px] mt-1 font-bold">Chat</span>
        </div>
        <Link href="/messages" className="flex flex-col items-center text-gray-400 hover:text-black">
           <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
           <span className="text-[10px] mt-1">Inbox</span>
        </Link>
      </div>
    </div>
  );
}
