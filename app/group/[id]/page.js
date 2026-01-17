"use client";
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db, storage } from '../../../firebase'; 
import { onAuthStateChanged } from 'firebase/auth';
import { 
  doc, onSnapshot, updateDoc, arrayUnion, arrayRemove, collection, addDoc, query, orderBy, serverTimestamp, deleteDoc, getDoc, where, getDocs 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export default function GroupChat({ params }) {
  const router = useRouter();
  const { id } = params;
  
  const [group, setGroup] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [user, setUser] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  
  // Member Management State
  const [memberDetails, setMemberDetails] = useState([]); // Stores {id, username, profilePic}
  const [newMemberName, setNewMemberName] = useState('');
  const [addError, setAddError] = useState('');
  
  // Permissions
  const [isAdmin, setIsAdmin] = useState(false);
  const [isMember, setIsMember] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' or 'members'
  
  const bottomRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) return router.push('/signup');
      setUser(currentUser);
    });

    const unsubGroup = onSnapshot(doc(db, "groups", id), async (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setGroup({ id: docSnap.id, ...data });
        
        if (auth.currentUser) {
          const uid = auth.currentUser.uid;
          setIsAdmin(data.admins?.includes(uid));
          setIsMember(data.members?.includes(uid));
          setIsPending(data.pendingRequests?.includes(uid));
        }

        // Fetch Member Details (Optimization: Only fetch if panel open or small group)
        if (data.members && data.members.length > 0) {
           // Firestore 'in' query supports up to 10 items. For larger groups, you'd pagination or separate collection.
           // For this MVP, we fetch individually if list is large or batch if small. 
           // Let's do a simple robust fetch for all members:
           const membersData = [];
           // Batching in chunks of 10 for 'in' query is safer, but loop is easier for MVP:
           for (const memberId of data.members) {
             const userDoc = await getDoc(doc(db, "users", memberId));
             if (userDoc.exists()) {
               membersData.push({ id: userDoc.id, ...userDoc.data() });
             }
           }
           setMemberDetails(membersData);
        }
      } else {
        router.push('/chat');
      }
    });

    return () => {
      unsubscribeAuth();
      unsubGroup();
    };
  }, [id, router]);

  useEffect(() => {
    if (group && (group.isPublic || isMember)) {
      const q = query(collection(db, "groups", id, "messages"), orderBy("createdAt", "asc"));
      const unsubMsg = onSnapshot(q, (snapshot) => {
        setMessages(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
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
      type: "text",
      likes: [],
      replyTo: replyTo ? { text: replyTo.text, sender: replyTo.senderName } : null,
      createdAt: serverTimestamp()
    });
    setNewMessage('');
    setReplyTo(null);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);

    try {
      const storageRef = ref(storage, `group_images/${id}/${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const url = await getDownloadURL(snapshot.ref);

      await addDoc(collection(db, "groups", id, "messages"), {
        senderId: user.uid,
        senderName: user.displayName || "Unknown",
        type: "image",
        mediaUrl: url,
        likes: [],
        createdAt: serverTimestamp()
      });
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const handleLike = async (msgId, currentLikes) => {
    const msgRef = doc(db, "groups", id, "messages", msgId);
    if (currentLikes?.includes(user.uid)) {
      await updateDoc(msgRef, { likes: arrayRemove(user.uid) });
    } else {
      await updateDoc(msgRef, { likes: arrayUnion(user.uid) });
    }
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
      admins: arrayRemove(user.uid),
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
    
    // Notify user
    await addDoc(collection(db, "notifications"), {
      toUserId: requesterId,
      fromUser: group.name,
      type: "group_approved",
      text: "Your request to join was approved.",
      contentType: "group",
      read: false,
      createdAt: serverTimestamp()
    });
  };

  const kickMember = async (memberId) => {
    if (!confirm("Remove this user?")) return;
    const groupRef = doc(db, "groups", id);
    await updateDoc(groupRef, {
      members: arrayRemove(memberId),
      admins: arrayRemove(memberId),
      memberCount: (group.memberCount || 1) - 1
    });
  };

  const toggleAdmin = async (memberId, isCurrentlyAdmin) => {
    const groupRef = doc(db, "groups", id);
    if (isCurrentlyAdmin) {
      await updateDoc(groupRef, { admins: arrayRemove(memberId) });
    } else {
      await updateDoc(groupRef, { admins: arrayUnion(memberId) });
    }
  };

  const handleAddMember = async () => {
    setAddError('');
    if (!newMemberName.trim()) return;

    // Find user ID
    const q = query(collection(db, "users"), where("username", "==", newMemberName.trim()));
    const snap = await getDocs(q);

    if (snap.empty) {
      setAddError("User not found.");
      return;
    }

    const newUserId = snap.docs[0].id;
    
    if (group.members.includes(newUserId)) {
      setAddError("Already a member.");
      return;
    }

    const groupRef = doc(db, "groups", id);
    await updateDoc(groupRef, {
      members: arrayUnion(newUserId),
      memberCount: (group.memberCount || 0) + 1
    });
    setNewMemberName('');
    alert(`Added ${newMemberName}!`);
  };

  const deleteGroup = async () => {
    if (!confirm("Delete group permanently?")) return;
    await deleteDoc(doc(db, "groups", id));
    router.push('/chat');
  };

  if (!group || !user) return <div className="p-10 text-center">Loading...</div>;

  return (
    <div className="flex flex-col h-screen bg-white">
      
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-md px-4 py-3 border-b border-gray-200 sticky top-0 z-20 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()}><svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg></button>
          <div onClick={() => setShowAdminPanel(!showAdminPanel)} className="cursor-pointer">
            <h1 className="font-bold text-gray-900 leading-none flex items-center gap-1">
              {group.name} 
              {isAdmin && <svg className="w-3 h-3 text-cyan-500" fill="currentColor" viewBox="0 0 20 20"><path d="M9 12h2v2H9z" /></svg>}
            </h1>
            <p className="text-xs text-gray-500">{group.memberCount} members</p>
          </div>
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <button 
              onClick={() => { setShowAdminPanel(true); setActiveTab('members'); }} 
              className="text-cyan-600 font-bold text-xs bg-cyan-50 px-3 py-1 rounded-full"
            >
              Manage
            </button>
          )}
          {isMember && !isAdmin && (
             <button onClick={handleLeave} className="text-red-500 font-bold text-xs bg-red-50 px-3 py-1 rounded-full">Leave</button>
          )}
        </div>
      </div>

      {/* ADMIN / INFO PANEL OVERLAY */}
      {showAdminPanel && (
        <div className="fixed inset-0 bg-black/50 z-50 flex justify-end">
          <div className="w-80 bg-white h-full shadow-2xl p-4 overflow-y-auto animate-slide-in">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-black text-lg">Group Info</h2>
              <button onClick={() => setShowAdminPanel(false)} className="text-gray-400 hover:text-black">Close</button>
            </div>

            {/* Panel Tabs */}
            {isAdmin && (
              <div className="flex mb-4 border-b border-gray-100">
                <button 
                  onClick={() => setActiveTab('members')} 
                  className={`flex-1 pb-2 text-xs font-bold ${activeTab === 'members' ? 'text-cyan-600 border-b-2 border-cyan-600' : 'text-gray-400'}`}
                >
                  Members ({group.memberCount})
                </button>
                <button 
                  onClick={() => setActiveTab('requests')} 
                  className={`flex-1 pb-2 text-xs font-bold ${activeTab === 'requests' ? 'text-cyan-600 border-b-2 border-cyan-600' : 'text-gray-400'}`}
                >
                  Requests ({group.pendingRequests?.length || 0})
                </button>
              </div>
            )}

            {/* ADD MEMBER (Admin Only) */}
            {isAdmin && activeTab === 'members' && (
              <div className="mb-6 bg-gray-50 p-3 rounded-xl">
                <p className="text-xs font-bold text-gray-500 mb-2">Add Member</p>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Username" 
                    className="flex-1 bg-white border border-gray-200 rounded-lg px-2 py-1 text-sm outline-none"
                    value={newMemberName}
                    onChange={(e) => setNewMemberName(e.target.value)}
                  />
                  <button onClick={handleAddMember} className="bg-black text-white px-3 rounded-lg text-xs font-bold">Add</button>
                </div>
                {addError && <p className="text-xs text-red-500 mt-1">{addError}</p>}
              </div>
            )}

            {/* MEMBERS LIST */}
            {activeTab === 'members' && (
              <div className="space-y-3">
                {memberDetails.map(member => (
                  <div key={member.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center font-bold text-xs text-gray-500 overflow-hidden">
                        {member.profilePic ? <img src={member.profilePic} className="w-full h-full object-cover" /> : member.username.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">{member.username}</p>
                        {group.admins.includes(member.id) && <span className="text-[10px] text-cyan-600 font-bold bg-cyan-50 px-1.5 py-0.5 rounded">Admin</span>}
                      </div>
                    </div>
                    
                    {isAdmin && user.uid !== member.id && (
                      <div className="flex gap-2">
                        <button 
                          onClick={() => toggleAdmin(member.id, group.admins.includes(member.id))} 
                          className="text-gray-400 hover:text-cyan-600" 
                          title="Toggle Admin"
                        >
                          🛡️
                        </button>
                        <button 
                          onClick={() => kickMember(member.id)} 
                          className="text-gray-400 hover:text-red-500"
                          title="Kick"
                        >
                          🚫
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* REQUESTS LIST */}
            {isAdmin && activeTab === 'requests' && (
              <div className="space-y-2">
                {group.pendingRequests?.length === 0 && <p className="text-sm text-gray-400">No pending requests.</p>}
                {group.pendingRequests?.map(reqId => (
                  <div key={reqId} className="flex justify-between items-center bg-gray-50 p-2 rounded-lg">
                    <span className="text-xs font-bold text-gray-600">ID: {reqId.substring(0,6)}...</span>
                    <button onClick={() => approveRequest(reqId)} className="text-green-600 text-xs font-bold bg-green-50 px-3 py-1 rounded-full">Approve</button>
                  </div>
                ))}
              </div>
            )}

            {/* DANGER ZONE */}
            {isAdmin && (
              <div className="mt-10 pt-4 border-t border-gray-100">
                <button onClick={deleteGroup} className="w-full text-red-600 bg-red-50 py-2 rounded-xl text-xs font-bold">Delete Group Permanently</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col justify-end min-h-0 bg-gray-50">
        {!group.isPublic && !isMember ? (
          <div className="text-center py-20 mb-auto">
            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">🔒</div>
            <h2 className="font-bold text-gray-900">Private Group</h2>
            {isPending ? (
              <button disabled className="bg-gray-300 text-white px-6 py-2 rounded-full font-bold text-sm mt-4">Request Sent</button>
            ) : (
              <button onClick={handleJoin} className="bg-black text-white px-6 py-2 rounded-full font-bold text-sm shadow-lg mt-4">Request to Join</button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {!isMember && group.isPublic && (
               <div className="bg-cyan-50 p-3 rounded-xl text-center mb-4 border border-cyan-100">
                 <button onClick={handleJoin} className="bg-cyan-600 text-white px-4 py-1.5 rounded-full text-xs font-bold">Join Group</button>
               </div>
            )}

            {messages.map((msg) => {
              const isMe = msg.senderId === user.uid;
              const isLiked = msg.likes?.includes(user.uid);
              return (
                <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-1 group items-end gap-2`}>
                  
                  {isMe && <button onClick={() => setReplyTo(msg)} className="opacity-0 group-hover:opacity-100 transition text-gray-300 hover:text-cyan-500"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg></button>}
                  
                  <div onDoubleClick={() => handleLike(msg.id, msg.likes)} className={`relative max-w-[75%] px-4 py-2 text-sm shadow-sm cursor-pointer select-none transition active:scale-95 ${isMe ? 'bg-gradient-to-r from-cyan-600 to-cyan-500 text-white rounded-2xl rounded-br-sm' : 'bg-white text-gray-900 border border-gray-200 rounded-2xl rounded-bl-sm'}`}>
                    
                    {!isMe && <p className="text-[10px] font-bold opacity-60 mb-0.5">{msg.senderName}</p>}
                    
                    {msg.replyTo && (
                      <div className={`text-xs mb-1 pl-2 border-l-2 ${isMe ? 'border-white/50 text-white/80' : 'border-cyan-500 text-gray-500'}`}>
                        <span className="font-bold block">{msg.replyTo.sender}</span>
                        <span className="truncate block max-w-[150px]">{msg.replyTo.text}</span>
                      </div>
                    )}

                    {msg.type === 'image' ? <img src={msg.mediaUrl} alt="Sent" className="rounded-lg mb-1 w-full h-auto" /> : <p className="leading-relaxed">{msg.text}</p>}
                    
                    {msg.likes?.length > 0 && <div className="absolute -bottom-2 -right-1 bg-white rounded-full p-0.5 border border-gray-100 shadow-sm flex items-center"><span className="text-[10px]">❤️</span></div>}
                  </div>

                  {!isMe && <button onClick={() => setReplyTo(msg)} className="opacity-0 group-hover:opacity-100 transition text-gray-300 hover:text-cyan-500"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg></button>}
                </div>
              );
            })}
            <div ref={bottomRef}></div>
          </div>
        )}
      </div>

      {isMember && (
        <div className="p-3 border-t border-gray-100 bg-white sticky bottom-0 z-20">
          {replyTo && (
            <div className="flex justify-between items-center bg-gray-50 p-2 rounded-lg mb-2 border-l-4 border-cyan-500">
              <div className="text-xs text-gray-600"><span className="font-bold text-cyan-600">Replying to {replyTo.senderName}</span><p className="truncate max-w-[200px]">{replyTo.text}</p></div>
              <button onClick={() => setReplyTo(null)} className="text-gray-400 hover:text-red-500"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
          )}
          <form onSubmit={handleSendMessage} className="flex gap-2 items-center">
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
            <button type="button" onClick={() => fileInputRef.current?.click()} className="text-cyan-600 p-2 bg-cyan-50 rounded-full hover:bg-cyan-100 transition"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg></button>
            <input type="text" className="flex-1 bg-gray-100 rounded-full px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-cyan-100 placeholder-gray-400" placeholder="Message..." value={newMessage} onChange={(e) => setNewMessage(e.target.value)} />
            <button type="submit" disabled={!newMessage.trim()} className="text-cyan-600 font-bold text-sm px-2 disabled:opacity-50">Send</button>
          </form>
        </div>
      )}
    </div>
  );
}
