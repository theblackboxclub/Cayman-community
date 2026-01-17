"use client";
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db, storage } from '../../../firebase'; 
import { onAuthStateChanged, signOut } from 'firebase/auth'; 
import { 
  collection, query, where, getDocs, doc, updateDoc 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// Helper for colors
const getAvatarColor = (name) => {
  if (!name) return 'bg-gray-400';
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
  
  const rawUsername = params?.username;
  const profileUsername = rawUsername ? decodeURIComponent(rawUsername) : null;
  
  const [profileUser, setProfileUser] = useState(null);
  const [profilePosts, setProfilePosts] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [uploading, setUploading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newBio, setNewBio] = useState('');
  const [saveError, setSaveError] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!profileUsername) {
        setLoading(false);
        return;
    }

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
        setNewUsername(userData.username || "");
        setNewBio(userData.bio || ""); // Load existing bio

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

  const handleProfileSave = async () => {
    setSaveError('');
    
    // Validate Username
    if (!newUsername.trim() || newUsername.length < 3) {
      setSaveError("Username too short.");
      return;
    }

    try {
      // If username changed, check uniqueness
      if (newUsername !== profileUser.username) {
        const usersRef = collection(db, "users");
        const q = query(usersRef, where("username", "==", newUsername));
        const snap = await getDocs(q);

        if (!snap.empty) {
          setSaveError("Username already taken.");
          return;
        }
      }

      // Update Firestore
      const userRef = doc(db, "users", profileUser.id);
      await updateDoc(userRef, { 
        username: newUsername,
        bio: newBio 
      });
      
      setProfileUser(prev => ({ ...prev, username: newUsername, bio: newBio }));
      setIsEditing(false);
      
      // If username changed, redirect to new URL
      if (newUsername !== profileUser.username) {
        router.push(`/user/${newUsername}`);
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      setSaveError("Failed to update.");
    }
  };

  const handleRandomize = async () => {
    let randomName = generateRandomUsername();
    setNewUsername(randomName);
  };

  const handleStartChat = async () => {
    if (!currentUser) return router.push('/signup');
    setChatLoading(true);
    
    try {
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
        router.push(`/chat/${existingChatId}`);
      } else {
        router.push(`/chat/new?uid=${profileUser.id}&name=${encodeURIComponent(profileUser.username)}`);
      }
    } catch (error) {
      console.error("Error starting chat:", error);
    } finally {
      setChatLoading(false);
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
            {/* Avatar */}
            <div className={`w-24 h-24 rounded-full flex items-center justify-center text-4xl font-bold mb-3 border-[4px] border-white shadow-md mx-auto overflow-hidden relative ${!profileUser.profilePic ? bgColor : 'bg-white'}`}>
              {profileUser.profilePic ? (
                <img src={profileUser.profilePic} alt={profileUser.username} className="w-full h-full object-cover" />
              ) : (
                <span className="text-white">{profileUser.username?.charAt(0).toUpperCase() || "?"}</span>
              )}
              {isOwner && (
                <div onClick={() => fileInputRef.current?.click()} className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition cursor-pointer">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                </div>
              )}
            </div>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
            {uploading && <p className="text-xs text-cyan-600 font-bold mb-1">Uploading...</p>}
            
            {/* EDIT MODE */}
            {isEditing ? (
              <div className="flex flex-col items-center gap-2 mb-4 bg-gray-50 p-4 rounded-xl border border-gray-100 w-full animate-fade-in">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest self-start ml-1">Username</p>
                <div className="flex gap-2 w-full mb-2">
                  <input 
                    type="text" 
                    className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold text-gray-900 outline-none" 
                    value={newUsername} 
                    onChange={(e) => setNewUsername(e.target.value)} 
                    placeholder="Username" 
                  />
                  <button onClick={handleRandomize} className="bg-cyan-100 text-cyan-700 px-3 rounded-lg text-xs font-bold">🎲</button>
                </div>

                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest self-start ml-1">Bio</p>
                <textarea 
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 outline-none mb-3 resize-none h-20"
                  value={newBio}
                  onChange={(e) => setNewBio(e.target.value)}
                  placeholder="Tell us about yourself..."
                  maxLength={150}
                />

                {saveError && <p className="text-xs text-red-500 font-bold mb-2">{saveError}</p>}
                
                <div className="flex gap-2 w-full">
                  <button onClick={handleProfileSave} className="flex-1 bg-black text-white py-2 rounded-lg text-xs font-bold shadow-md hover:scale-[1.02] transition">Save Profile</button>
                  <button onClick={() => {setIsEditing(false); setSaveError('');}} className="px-4 py-2 text-xs font-bold text-gray-400 hover:text-gray-600">Cancel</button>
                </div>
              </div>
            ) : (
              // VIEW MODE
              <div className="flex flex-col items-center gap-1 mb-2">
                <h2 className="text-2xl font-black text-gray-900">{profileUser.username}</h2>
                <p className="text-sm text-gray-600 max-w-[250px] leading-relaxed mb-1">{profileUser.bio || "CircleCayman Member"}</p>
                
                {isOwner && (
                  <button 
                    onClick={() => setIsEditing(true)} 
                    className="text-xs font-bold text-cyan-600 hover:text-cyan-800 bg-cyan-50 px-4 py-1.5 rounded-full mt-2 transition hover:bg-cyan-100"
                  >
                    Edit Profile
                  </button>
                )}
              </div>
            )}
            
            <div className="flex justify-center gap-4 mb-6 w-full mt-4">
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
                <div className="flex items-center justify-between mb-2">
                   <div className="text-[10px] font-bold text-cyan-600 bg-cyan-50 px-2 py-0.5 rounded-full">{post.community?.replace('c/', '') || "General"}</div>
                   <div className="text-[10px] text-gray-400 font-bold">{post.createdAt?.toDate ? new Date(post.createdAt.toDate()).toLocaleDateString() : ''}</div>
                </div>
                <h3 className="font-bold text-base text-gray-900 mb-1">{post.title}</h3>
                <p className="text-xs text-gray-500 line-clamp-2">{post.body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
