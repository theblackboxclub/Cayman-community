"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '../../firebase'; 
import { onAuthStateChanged } from 'firebase/auth';
import { 
  collection, query, where, onSnapshot, addDoc, serverTimestamp, getDocs, orderBy, doc, setDoc, getDoc 
} from 'firebase/firestore';
import Link from 'next/link';

// Official Communities List
const officialCommunities = [
  { id: "official_General", name: "General", desc: "Main island discussion" },
  { id: "official_CaymanFitness", name: "CaymanFitness", desc: "Gym & Run clubs" },
  { id: "official_IslandJobs", name: "IslandJobs", desc: "Work & Careers" },
  { id: "official_AskLocals", name: "AskLocals", desc: "Q&A for residents" },
  { id: "official_Events", name: "Events", desc: "Parties & Gatherings" },
  { id: "official_RealEstate", name: "RealEstate", desc: "Housing market" }
];

export default function ChatList() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('dms'); 
  const [chats, setChats] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [isCreatingDM, setIsCreatingDM] = useState(false);
  const [newChatUsername, setNewChatUsername] = useState('');
  const [searchError, setSearchError] = useState('');

  // Initialize Official Groups
  useEffect(() => {
    const initOfficialGroups = async () => {
      for (const comm of officialCommunities) {
        const docRef = doc(db, "groups", comm.id);
        const docSnap = await getDoc(docRef);
        
        if (!docSnap.exists()) {
          await setDoc(docRef, {
            name: comm.name,
            description: comm.desc,
            isPublic: true,
            creatorId: "system",
            admins: [],
            members: [],
            memberCount: 0,
            createdAt: serverTimestamp(),
            lastUpdated: serverTimestamp(),
            isOfficial: true
          });
        }
      }
    };
    initOfficialGroups();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) return router.push('/signup');
      setUser(currentUser);

      // Listen for DMs
      const qDMs = query(
        collection(db, "chats"),
        where("participants", "array-contains", currentUser.uid)
      );

      const unsubDMs = onSnapshot(qDMs, (snapshot) => {
        const dmData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        dmData.sort((a, b) => (b.lastUpdated?.toMillis() || 0) - (a.lastUpdated?.toMillis() || 0));
        setChats(dmData);
        setLoading(false);
      });

      // Listen for Groups
      const qGroups = query(collection(db, "groups"), orderBy("memberCount", "desc"));
      
      const unsubGroups = onSnapshot(qGroups, (snapshot) => {
        const groupData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // Sort: Official first, then by members
        groupData.sort((a, b) => {
            if (a.isOfficial && !b.isOfficial) return -1;
            if (!a.isOfficial && b.isOfficial) return 1;
            return (b.memberCount || 0) - (a.memberCount || 0);
        });
        setGroups(groupData);
      });

      return () => {
        unsubDMs();
        unsubGroups();
      };
    });

    return () => unsubscribe();
  }, [router]);

  const handleStartDM = async () => {
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
        participantNames: [user.displayName || "User", recipient.username], 
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
    return chat.participantNames.find(name => name !== (user?.displayName || "")) || "Chat";
  };

  if (loading) return <div className="p-10 text-center text-gray-400 text-sm">Loading...</div>;

  return (
    <div className="min-h-screen bg-gradient-to-b from-cyan-50 to-white pb-24">
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-md border-b border-gray-100 sticky top-0 z-10 px-4 py-3 flex flex-col gap-3 shadow-sm">
         <div className="flex justify-between items-center">
           <h1 className="font-black text-xl text-gray-900 tracking-tight">Messages</h1>
           {activeTab === 'dms' ? (
             <button onClick={() => setIsCreatingDM(!isCreatingDM)} className="bg-black text-white px-4 py-1.5 rounded-full text-xs font-bold shadow-md">
               + New Message
             </button>
           ) : (
             <Link href="/chat/create">
               <button className="bg-cyan-600 text-white px-4 py-1.5 rounded-full text-xs font-bold shadow-md">
                 + Create Group
               </button>
             </Link>
           )}
         </div>

         <div className="flex bg-gray-100 p-1 rounded-xl">
           <button 
             onClick={() => setActiveTab('dms')}
             className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${activeTab === 'dms' ? 'bg-white shadow-sm text-black' : 'text-gray-500'}`}
           >
             Inbox
           </button>
           <button 
             onClick={() => setActiveTab('groups')}
             className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${activeTab === 'groups' ? 'bg-white shadow-sm text-cyan-600' : 'text-gray-500'}`}
           >
             Communities
           </button>
         </div>
      </div>

      <div className="max-w-md mx-auto">
        {activeTab === 'dms' && isCreatingDM && (
          <div className="p-4 bg-white/50 border-b border-gray-100 backdrop-blur-sm animate-fade-in">
            <p className="text-xs font-bold text-gray-500 mb-2">Who to message?</p>
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="Username..." 
                className="flex-1 bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-cyan-100"
                value={newChatUsername}
                onChange={(e) => setNewChatUsername(e.target.value)}
              />
              <button onClick={handleStartDM} className="bg-black text-white px-4 py-2 rounded-xl text-sm font-bold shadow-sm">Go</button>
            </div>
            {searchError && <p className="text-xs text-red-500 mt-2 font-bold">{searchError}</p>}
          </div>
        )}

        {activeTab === 'dms' ? (
          chats.length === 0 ? (
            <div className="text-center py-20 text-gray-400 text-sm">No direct messages yet.</div>
          ) : (
            chats.map(chat => (
              <Link key={chat.id} href={`/chat/${chat.id}`}>
                <div className="p-4 border-b border-gray-50 hover:bg-white/60 transition cursor-pointer flex gap-3">
                  <div className="w-12 h-12 bg-white border border-gray-100 shadow-sm rounded-full flex items-center justify-center font-bold text-gray-700 text-sm">
                    {getOtherParticipantName(chat).charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 pt-1">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-bold text-gray-900">{getOtherParticipantName(chat)}</span>
                      <span className="text-[10px] text-gray-400 font-bold">{chat.lastUpdated?.toDate ? chat.lastUpdated.toDate().toLocaleDateString() : ''}</span>
                    </div>
                    <p className="text-sm text-gray-500 truncate">{chat.lastMessage}</p>
                  </div>
                </div>
              </Link>
            ))
          )
        ) : (
          groups.length === 0 ? (
            <div className="text-center py-20 text-gray-400 text-sm">Loading communities...</div>
          ) : (
            groups.map(group => (
              <Link key={group.id} href={`/group/${group.id}`}>
                <div className="p-4 border-b border-gray-50 hover:bg-white/60 transition cursor-pointer flex gap-3 items-center">
                  <div className={`w-12 h-12 rounded-xl shadow-sm flex items-center justify-center font-bold text-lg flex-shrink-0 ${group.isOfficial ? 'bg-black text-white' : group.isPublic ? 'bg-cyan-100 text-cyan-700' : 'bg-gray-100 text-gray-600'}`}>
                    {group.isOfficial ? '★' : (group.isPublic ? '#' : '🔒')}
                  </div>
                  <div className="flex-1 pt-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <div className="flex items-center gap-1.5 overflow-hidden">
                        <span className="text-sm font-black text-gray-900 truncate">{group.name}</span>
                        {group.isOfficial && (
                          <svg className="w-3 h-3 text-cyan-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
                        )}
                      </div>
                      {/* FIX: Added "members" text */}
                      <span className="text-[10px] font-bold bg-gray-100 px-2 py-0.5 rounded-full text-gray-500 flex-shrink-0">
                        {group.memberCount || 0} members
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 truncate">{group.description}</p>
                  </div>
                </div>
              </Link>
            ))
          )
        )}
      </div>

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
        <Link href="/chat" className="flex flex-col items-center text-black">
           <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
           <span className="text-[10px] mt-1 font-bold">Chat</span>
        </Link>
        <Link href="/messages" className="flex flex-col items-center text-gray-400 hover:text-black transition">
           <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
           <span className="text-[10px] mt-1">Inbox</span>
        </Link>
      </div>
    </div>
  );
}
