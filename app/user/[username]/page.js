"use client";
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db, storage } from '../../../firebase'; 
import { onAuthStateChanged, signOut } from 'firebase/auth'; 
import { 
  collection, query, where, getDocs, doc, updateDoc 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const getAvatarColor = (name) => {
  const colors = [
    'bg-red-500', 'bg-orange-500', 'bg-amber-500', 
    'bg-green-500', 'bg-emerald-500', 'bg-teal-500', 
    'bg-cyan-500', 'bg-blue-500', 'bg-indigo-500', 
    'bg-violet-500', 'bg-fuchsia-500', 'bg-pink-500', 'bg-rose-500'
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};

const generateRandomUsername = () => {
  const adjs = ['Salty', 'Sunny', 'Tropical', 'Grand', 'Blue', 'Sandy', 'Coral', 'Golden', 'Breezy', 'Royal', 'Lazy', 'Happy'];
  const nouns = ['Iguana', 'Stingray', 'Turtle', 'Conch', 'Rooster', 'Coconut', 'Shark', 'Marlin', 'Palm', 'Pirate', 'Diver', 'Reef'];
  const adj = adjs[Math.floor(Math.random() * adjs.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(Math.random() * 1000) + 100;
  return `${adj}${noun}${num}`;
};

export default function PublicProfile({ params }) {
  const router = useRouter();
  const profileUsername = decodeURIComponent(params.username);
  
  const [profileUser, setProfileUser] = useState(null);
  const [profilePosts, setProfilePosts] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [uploading, setUploading] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [saveError, setSaveError] = useState('');
  
  const fileInputRef = useRef(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      
      try {
        const usersRef = collection(db, "users");
        const qUser = query(usersRef, where("username", "==", profileUsername));
        const userSnap = await getDocs(qUser);

        if (userSnap.empty) {
          setLoading(false);
          return;
        }

        const userData = userSnap.docs[0].data();
        const userId = userSnap.docs[0].id;
        setProfileUser({ id: userId, ...userData });
        setNewUsername(userData.username);

        const postsRef = collection(db, "posts");
        const qPosts = query(postsRef, where("userId", "==", userId));
        const postsSnap = await getDocs(qPosts);
        
        const posts = postsSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        posts.sort((a, b) => {
           const timeA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
           const timeB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
           return timeB - timeA;
        });

        setProfilePosts(posts);

      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [profileUsername]);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !currentUser) return;

    setUploading(true);
    try {
      const storageRef = ref(storage, `profile_pics/${currentUser.uid}/${Date.now()}-${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);

      const userRef = doc(db, "users", profileUser.id);
      await updateDoc(userRef, { profilePic: downloadURL });

      setProfileUser(prev => ({ ...prev, profilePic: downloadURL }));
      alert("Profile picture updated!");
    } catch (error) {
      console.error("Error uploading photo:", error);
      alert("Failed to upload photo.");
    } finally {
      setUploading(false);
    }
  };

  const handleUsernameSave = async () => {
    setSaveError('');
    if (!newUsername.trim() || newUsername.length < 3) {
      setSaveError("Too short (min 3 chars).");
      return;
    }

    if (newUsername === profileUser.username) {
      setIsEditingName(false);
      return;
    }
    
    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("username", "==", newUsername));
      const snap = await getDocs(q);

      if (!snap.empty) {
        setSaveError("Username already taken.");
        return;
      }

      const userRef = doc(db, "users", profileUser.id);
      await updateDoc(userRef, { username: newUsername });
      
      setProfileUser(prev => ({ ...prev, username: newUsername }));
      setIsEditingName(false);
      router.push(`/user/${newUsername}`);
    } catch (error) {
      console.error("Error updating username:", error);
      setSaveError("Failed to update.");
    }
  };

  const handleRandomize = async () => {
    let randomName = generateRandomUsername();
    setNewUsername(randomName);
  };

  const handleStartChat = async () => {
    if (!currentUser) return router.push('/signup');
    try {
      // 1. Check if chat already exists
      const chatsRef = collection(db, "chats");
      const qChat = query(chatsRef, where("participants", "array-contains", currentUser.uid));
      const chatSnap = await getDocs(qChat);
      
      let existingChatId = null;
      chatSnap.forEach(doc => {
        const data = doc.data();
        if (data.participants.includes(profileUser.id)) {
          existingChatId = doc.id;
        }
      });

      if (existingChatId) {
        // Chat exists -> Go to it
        router.push(`/chat/${existingChatId}`);
      } else {
        // Chat DOES NOT exist -> Go to 'new' staging area
        // We pass the target user's ID and Name in the URL
        router.push(`/chat/new?uid=${profileUser.id}&name=${encodeURIComponent(profileUser.username)}`);
      }
    } catch (error) {
      console.error("Error starting chat:", error);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/signup');
  };

  if (loading) return <div className="p-10 text-center text-gray-400 font-medium">Loading Profile...</div>;
  if (!profileUser) return <div className="p-10 text-center text-gray-500">User not found.</div>;

  const totalLikes = profilePosts.reduce((acc, post) => acc + (post.votes || 0), 0);
  const bgColor = getAvatarColor(profileUser.username); 
  const isOwner = currentUser?.uid === profileUser.id;

  return (
    <div className="min-h-screen bg-gradient-to-b from-cyan-50 to-white pb-20">
      
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-md px-4 py-3 border-b border-gray-100 sticky top-0 z-10 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-gray-500 hover:text-black">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>
          <h1 className="font-bold text-lg text-gray-900">Profile</h1>
        </div>
        {isOwner && (
          <button onClick={handleLogout} className="text-xs font-bold text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-full transition">Sign Out</button>
        )}
      </div>

      <div className="max-w-md mx-auto pt-6 px-4">
        
        {/* Profile Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col items-center text-center mb-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-cyan-50 to-white opacity-50 z-0"></div>
          
          <div className="relative z-10 group w-full">
            <div className={`w-24 h-24 rounded-full flex items-center justify-center text-4xl font-bold mb-3 border-[4px] border-white shadow-md mx-auto overflow-hidden relative ${!profileUser.profilePic ? bgColor : 'bg-white'}`}>
              {profileUser.profilePic ? (
                <img src={profileUser.profilePic} alt={profileUser.username} className="w-full h-full object-cover" />
              ) : (
                <span className="text-white">{profileUser.username.charAt(0).toUpperCase()}</span>
              )}
              {isOwner && (
                <div onClick={() => fileInputRef.current?.click()} className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition cursor-pointer">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                </div>
              )}
            </div>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
            {uploading && <p className="text-xs text-cyan-600 font-bold mb-1">Uploading...</p>}
            
            {isEditingName ? (
              <div className="flex flex-col items-center gap-2 mb-4 bg-gray-50 p-3 rounded-xl border border-gray-100 w-full">
                <input type="text" className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-center font-bold text-gray-900 outline-none w-full mb-2" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} placeholder="Enter name" />
                {saveError && <p className="text-xs text-red-500 font-bold mb-2">{saveError}</p>}
                <div className="flex gap-2 w-full">
                  <button onClick={handleRandomize} className="flex-1 bg-cyan-100 text-cyan-700 py-2 rounded-lg text-xs font-bold">Random 🎲</button>
                  <button onClick={handleUsernameSave} className="flex-1 bg-black text-white py-2 rounded-lg text-xs font-bold">Save</button>
                </div>
                <button onClick={() => {setIsEditingName(false); setSaveError('');}} className="mt-2 text-xs font-bold text-gray-400">Cancel</button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1 mb-2">
                <h2 className="text-2xl font-black text-gray-900">{profileUser.username}</h2>
                {isOwner && <button onClick={() => setIsEditingName(true)} className="text-xs font-bold text-cyan-600 hover:text-cyan-800 bg-cyan-50 px-3 py-1 rounded-full mt-1">Change Username</button>}
              </div>
            )}
            
            <p className="text-xs text-cyan-600 font-bold uppercase tracking-widest mb-6">CircleCayman Member</p>
            
            <div className="flex justify-center gap-4 mb-6 w-full">
              <div className="flex-1 bg-gray-50 p-3 rounded-xl border border-gray-100">
                <span className="block text-xl font-black text-gray-900">{profilePosts.length}</span>
                <span className="text-[10px] font-bold text-gray-400 uppercase">Posts</span>
              </div>
              <div className="flex-1 bg-gray-50 p-3 rounded-xl border border-gray-100">
                <span className="block text-xl font-black text-gray-900">{totalLikes}</span>
                <span className="text-[10px] font-bold text-gray-400 uppercase">Likes</span>
              </div>
            </div>

            {!isOwner && (
              <button onClick={handleStartChat} disabled={chatLoading} className="w-full bg-cyan-600 text-white py-3 rounded-xl text-sm font-bold shadow-md hover:bg-cyan-700 transition flex items-center justify-center gap-2">
                {chatLoading ? "Loading..." : "Send Message"}
              </button>
            )}
          </div>
        </div>

        <div className="space-y-3 pb-10">
          {profilePosts.map(post => (
            <div key={post.id} onClick={() => router.push(`/post/${post.id}`)} className="bg-white p-4 rounded-2xl border border-gray-100 cursor-pointer hover:shadow-md transition shadow-sm">
                <h3 className="font-bold text-base text-gray-900 mb-1">{post.title}</h3>
                <p className="text-xs text-gray-500 line-clamp-2">{post.body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
