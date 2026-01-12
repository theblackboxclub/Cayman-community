"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '../firebase'; 
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { 
  doc, getDoc, collection, query, where, getDocs, orderBy, updateDoc 
} from 'firebase/firestore';

export default function Profile() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [userPosts, setUserPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.push('/signup');
        return;
      }
      setUser(currentUser);

      // 1. Fetch User Profile (Username + Stats)
      try {
        const docRef = doc(db, "users", currentUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setUserData(docSnap.data());
        }
      } catch (err) {
        console.error("Error fetching user data:", err);
      }

      // 2. Fetch User's Posts
      try {
        const q = query(
          collection(db, "posts"), 
          where("userId", "==", currentUser.uid),
          orderBy("createdAt", "desc")
        );
        const querySnapshot = await getDocs(q);
        const posts = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setUserPosts(posts);
      } catch (err) {
        console.error("Error fetching posts:", err);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/signup');
  };

  const handleChangeUsername = async () => {
    if (!user) return;
    const confirmChange = window.confirm("Generate a new random username?");
    if (!confirmChange) return;

    // Generate new name
    const adjectives = ["Salty", "Breezy", "Grand", "Little", "Coral", "Sunny", "Hidden", "Ironshore"];
    const nouns = ["Iguana", "Stingray", "Turtle", "Rooster", "Conch", "Pirate", "Diver", "Snapper"];
    const randomAdj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
    const randomNumber = Math.floor(Math.random() * 999) + 1;
    const newName = `${randomAdj}${randomNoun}${randomNumber}`;

    // Update in DB
    const userRef = doc(db, "users", user.uid);
    await updateDoc(userRef, { username: newName });
    
    // Update local state
    setUserData(prev => ({ ...prev, username: newName }));
  };

  if (loading) return <div className="p-10 text-center text-gray-500 text-sm">Loading Profile...</div>;

  // Calculate total likes from all posts
  const totalLikes = userPosts.reduce((acc, post) => acc + (post.votes || 0), 0);

  return (
    <div className="min-h-screen bg-gray-50">
      
      {/* Top Nav */}
      <div className="bg-white px-4 py-3 border-b border-gray-200 sticky top-0 z-10 flex items-center justify-between">
         <div className="flex items-center gap-3">
            <button onClick={() => router.push('/')} className="text-gray-500 hover:text-black">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            </button>
            <h1 className="font-bold text-lg text-gray-900">My Profile</h1>
         </div>
         <button onClick={handleLogout} className="text-xs font-bold text-red-500 hover:text-red-700">
           Sign Out
         </button>
      </div>

      <div className="max-w-md mx-auto pt-6 pb-20 px-4">
        
        {/* Profile Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col items-center text-center mb-6">
          <div className="w-20 h-20 bg-black text-white rounded-full flex items-center justify-center text-3xl font-bold mb-3">
            {userData?.username ? userData.username.charAt(0).toUpperCase() : user?.email.charAt(0).toUpperCase()}
          </div>
          
          <h2 className="text-xl font-black text-gray-900">u/{userData?.username || "Loading..."}</h2>
          <p className="text-xs text-gray-400 mb-6">{user?.email}</p>

          <div className="flex gap-10 mb-6">
            <div className="flex flex-col items-center">
              <span className="text-lg font-black text-gray-900">{userPosts.length}</span>
              <span className="text-[10px] font-bold text-gray-400 tracking-wider uppercase">Posts</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-lg font-black text-gray-900">{totalLikes}</span>
              <span className="text-[10px] font-bold text-gray-400 tracking-wider uppercase">Likes</span>
            </div>
          </div>

          <button 
            onClick={handleChangeUsername}
            className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-full text-xs font-bold transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            Change Username
          </button>
        </div>

        {/* Recent Posts Header */}
        <div className="flex items-center gap-2 mb-3 px-1">
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">My Recent Posts</span>
        </div>

        {/* Posts List */}
        <div className="space-y-3">
          {userPosts.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-sm bg-white rounded-lg border border-gray-200 border-dashed">
              You haven't posted anything yet.
            </div>
          ) : (
            userPosts.map(post => (
              <div key={post.id} onClick={() => router.push(`/post/${post.id}`)} className="bg-white p-4 rounded-lg border border-gray-200 cursor-pointer hover:border-black transition shadow-sm">
                <div className="text-[10px] font-bold text-gray-400 mb-1">{post.community || "c/General"}</div>
                <h3 className="font-bold text-sm text-gray-900 mb-3 truncate">{post.title}</h3>
                
                <div className="flex items-center gap-4 text-gray-400">
                  <div className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                    <span className="text-xs font-bold">{post.votes || 0}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                    <span className="text-xs font-bold">{post.comments || 0}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
}
