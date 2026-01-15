"use client";
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '../../../firebase'; 
import { onAuthStateChanged } from 'firebase/auth';
import { 
  doc, onSnapshot, updateDoc, arrayUnion, arrayRemove, collection, addDoc, query, orderBy, serverTimestamp, getDoc, deleteDoc 
} from 'firebase/firestore';

export default function GroupChat({ params }) {
  const router = useRouter();
  const { id } = params;
  
  const [group, setGroup] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isMember, setIsMember] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  
  const dummyRef = useRef(null);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) return router.push('/signup');
      setUser(currentUser);
    });

    // Listen to Group Metadata
    const unsubGroup = onSnapshot(doc(db, "groups", id), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setGroup({ id: docSnap.id, ...data });
        
        if (auth.currentUser) {
          setIsAdmin(data.admins?.includes(auth.currentUser.uid));
          setIsMember(data.members?.includes(auth.currentUser.uid));
          setIsPending(data.pendingRequests?.includes(auth.currentUser.uid));
        }
      } else {
        alert("Group not found");
        router.push('/chat');
      }
    });

    return () => {
      unsubscribeAuth();
      unsubGroup();
    };
  }, [id, router]);

  // Listen to Messages (Only if member or public)
  useEffect(() => {
    if (group && (group.isPublic || isMember)) {
      const q = query(collection(db, "groups", id, "messages"), orderBy("createdAt", "asc"));
      const unsubMsg = onSnapshot(q, (snapshot) => {
        setMessages(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
        dummyRef.current?.scrollIntoView({ behavior: 'smooth' });
      });
      return () => unsubMsg();
    }
  }, [group, isMember, id]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    await addDoc(collection(db, "groups", id, "messages"), {
      text: newMessage,
      senderId: user.uid,
      senderName: user.displayName || "Unknown",
      createdAt: serverTimestamp()
    });
    setNewMessage('');
  };

  const handleJoin = async () => {
    const groupRef = doc(db, "groups", id);
    if (group.isPublic) {
      await updateDoc(groupRef, { 
        members: arrayUnion(user.uid),
        memberCount: (group.memberCount || 0) + 1
      });
    } else {
      await updateDoc(groupRef, { pendingRequests: arrayUnion(user.uid) });
      alert("Request sent!");
    }
  };

  const handleLeave = async () => {
    if(!confirm("Leave group?")) return;
    const groupRef = doc(db, "groups", id);
    await updateDoc(groupRef, { 
      members: arrayRemove(user.uid),
      admins: arrayRemove(user.uid), // Remove admin status if leaving
      memberCount: (group.memberCount || 1) - 1
    });
    router.push('/chat');
  };

  // --- ADMIN ACTIONS ---
  const approveRequest = async (requesterId) => {
    const groupRef = doc(db, "groups", id);
    await updateDoc(groupRef, {
      members: arrayUnion(requesterId),
      pendingRequests: arrayRemove(requesterId),
      memberCount: (group.memberCount || 0) + 1
    });
  };

  const kickMember = async (memberId) => {
    if (!confirm("Kick this user?")) return;
    const groupRef = doc(db, "groups", id);
    await updateDoc(groupRef, {
      members: arrayRemove(memberId),
      admins: arrayRemove(memberId),
      memberCount: (group.memberCount || 1) - 1
    });
  };

  const deleteGroup = async () => {
    if (!confirm("Delete group permanently? This cannot be undone.")) return;
    await deleteDoc(doc(db, "groups", id));
    router.push('/chat');
  };

  if (!group || !user) return <div className="p-10 text-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      
      {/* Header */}
      <div className="bg-white px-4 py-3 border-b border-gray-200 sticky top-0 z-10 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()}><svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg></button>
          <div>
            <h1 className="font-bold text-gray-900 leading-none">{group.name}</h1>
            <p className="text-xs text-gray-500">{group.memberCount} members • {group.isPublic ? "Public" : "Private"}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <button onClick={() => setShowAdminPanel(!showAdminPanel)} className="text-cyan-600 font-bold text-xs bg-cyan-50 px-3 py-1 rounded-full">
              Admin
            </button>
          )}
          {isMember && !isAdmin && (
             <button onClick={handleLeave} className="text-red-500 font-bold text-xs bg-red-50 px-3 py-1 rounded-full">Leave</button>
          )}
        </div>
      </div>

      {/* Admin Panel */}
      {showAdminPanel && isAdmin && (
        <div className="bg-white border-b border-gray-200 p-4 animate-fade-in">
          <h3 className="font-bold text-sm mb-2 text-gray-900">Pending Requests</h3>
          {group.pendingRequests?.length === 0 && <p className="text-xs text-gray-400 mb-4">No pending requests.</p>}
          {group.pendingRequests?.map(reqId => (
            <div key={reqId} className="flex justify-between items-center bg-gray-50 p-2 rounded-lg mb-2">
              <span className="text-xs font-bold text-gray-600">{reqId.substring(0,8)}...</span>
              <div className="flex gap-2">
                <button onClick={() => approveRequest(reqId)} className="text-green-600 text-xs font-bold">Approve</button>
              </div>
            </div>
          ))}
          
          <div className="mt-4 border-t border-gray-100 pt-2 flex justify-between">
             <button onClick={handleLeave} className="text-red-500 text-xs font-bold">Leave Group</button>
             <button onClick={deleteGroup} className="text-red-600 bg-red-50 px-3 py-1 rounded-lg text-xs font-bold">Delete Group</button>
          </div>
        </div>
      )}

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* If Private & Not Member */}
        {!group.isPublic && !isMember ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">🔒</div>
            <h2 className="font-bold text-gray-900">This group is private</h2>
            <p className="text-sm text-gray-500 mb-6">You need to request access to view messages.</p>
            
            {isPending ? (
              <button disabled className="bg-gray-300 text-white px-6 py-2 rounded-full font-bold text-sm">Request Sent</button>
            ) : (
              <button onClick={handleJoin} className="bg-black text-white px-6 py-2 rounded-full font-bold text-sm shadow-lg">Request to Join</button>
            )}
          </div>
        ) : (
          // Messages List
          <>
            {!isMember && group.isPublic && (
               <div className="bg-cyan-50 p-3 rounded-xl text-center mb-4 border border-cyan-100">
                 <p className="text-xs text-cyan-800 font-bold mb-2">Join this group to chat!</p>
                 <button onClick={handleJoin} className="bg-cyan-600 text-white px-4 py-1.5 rounded-full text-xs font-bold">Join Group</button>
               </div>
            )}

            {messages.map((msg) => {
              const isMe = msg.senderId === user.uid;
              return (
                <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] rounded-2xl px-4 py-2 shadow-sm ${isMe ? 'bg-cyan-500 text-white rounded-br-none' : 'bg-white text-gray-800 rounded-bl-none'}`}>
                    {!isMe && <p className="text-[10px] font-bold opacity-50 mb-0.5">{msg.senderName}</p>}
                    <p className="text-sm leading-relaxed">{msg.text}</p>
                  </div>
                </div>
              );
            })}
            <div ref={dummyRef}></div>
          </>
        )}
      </div>

      {/* Input Area (Only if Member) */}
      {isMember && (
        <div className="bg-white p-3 border-t border-gray-100 sticky bottom-0">
          <form onSubmit={handleSendMessage} className="flex gap-2 items-center max-w-md mx-auto">
            <input 
              type="text" 
              className="flex-1 bg-gray-100 rounded-full px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-cyan-100"
              placeholder="Message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
            />
            <button type="submit" disabled={!newMessage.trim()} className="bg-cyan-600 text-white p-2.5 rounded-full disabled:opacity-50">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
