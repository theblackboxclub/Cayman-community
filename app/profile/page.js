"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '../../firebase';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { 
  collection, query, where, getDocs, doc, getDoc, updateDoc 
} from 'firebase/firestore';
import Link from 'next/link';

export default function Profile() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [username, setUsername] = useState('Loading...');
  const [myPosts, setMyPosts] = useState([]);
  const [stats, setStats] = useState({ postCount: 0, totalLikes: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.push('/signup');
        return;
      }
      setUser(currentUser);

      try {
        // A. Get Username
        const userRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists() && userSnap.data().username) {
          setUsername(userSnap.data().username);
        } else {
          setUsername(currentUser.email.split('@')[0]);
        }

        // B. Get My Posts (FIXED: Removed 'orderBy' to avoid Index Error)
        const q = query(collection(db, "posts"), where("userId", "==", currentUser.uid));
        const querySnapshot = await getDocs(q);
        
        const postsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Sort in Javascript (Newest First)
        postsData.sort((a, b) => {
           return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
        });

        setMyPosts(postsData);

        // C. Calculate Stats
        const totalLikes = postsData.reduce((acc, curr) => acc + (curr.votes || 0), 0);
        setStats({ postCount: postsData.length, totalLikes });

      } catch (error) {
        console.error("Error loading profile:", error);
      } finally {
        // Ensure loading stops even if there is an error
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [router]);

  // Shuffle Username
  const handleShuffleName = async () => {
    if (!user) return;
    const confirm = window.confirm("Are you sure? This will change your name for ALL future posts.");
    if (!confirm) return;

    const adjectives = ["Salty", "Breezy", "Grand", "Little", "Coral", "Sunny", "Happy", "Lazy", "Ironshore"];
    const nouns = ["Iguana", "Stingray", "Turtle", "Rooster", "Shark", "Marlin", "Crab", "Conch"];
    const randomNum = Math.floor(Math.random() * 9999);
    const newName = `${adjectives[Math.floor(Math.random() * adjectives.length)]}${nouns[Math.floor(Math.random() * nouns.length)]}${randomNum}`;

    const userRef = doc(db, "users", user.uid);
    await updateDoc(userRef, { username: newName });
    
    setUsername(newName);
    alert(`You are now u/${newName}!`);
  };

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/signup');
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-gray-500 font-bold animate-pulse">Loading Profile...</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      
      {/* Top Nav */}
      <div className="bg-white px-4 py-3 flex items-center shadow-sm sticky top-0 z-50">
        <button onClick={() => router.back()} className="mr-4 text-gray-600">
           <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <span className="font-bold text-lg">My Profile</span>
        <button onClick={handleLogout} className="ml-auto text-red-500 text-sm font-bold">Sign Out</button>
      </div>

      {/* Profile Card */}
      <div className="bg-white p-6 mb-4 flex flex-col items-center border-b border-gray-200">
        <div className="w-20 h-20 bg-green-500 rounded-full border-4 border-white shadow-lg mb-3 flex items-center justify-center text-3xl text-white font-bold">
          {username.charAt(0)}
        </div>
        
        <h1 className="text-2xl font-black text-gray-900">u/{username}</h1>
        <p className="text-gray-400 text-sm mb-4">{user?.email}</p>

        <div className="flex gap-8 mb-6">
          <div className="text-center">
            <span className="block text-xl font-bold text-black">{stats.postCount}</span>
            <span className="text-xs text-gray-500 uppercase tracking-wide">Posts</span>
          </div>
          <div className="text-center">
            <span className="block text-xl font-bold text-black">{stats.totalLikes}</span>
            <span className="text-xs text-gray-500 uppercase tracking-wide">Karma</span>
          </div>
        </div>

        <button 
          onClick={handleShuffleName}
          className="bg-gray-100 text-gray-700 px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 hover:bg-gray-200 transition"
        >
          🎲 Change Username
        </button>
      </div>

      {/* My Posts Feed */}
      <div className="max-w-md mx-auto px-4">
        <h2 className="font-bold text-gray-500 text-sm mb-3 uppercase tracking-wider">My Recent Posts</h2>
        
        {myPosts.length === 0 && (
          <div className="text-center py-10 text-gray-400 bg-white rounded-xl border border-dashed border-gray-300">
            You haven't posted anything publicly yet.
          </div>
        )}

        {myPosts.map((post) => (
          <Link href={`/post/${post.id}`} key={post.id}>
            <div className="bg-white p-4 mb-2 rounded-lg border border-gray-200 shadow-sm cursor-pointer hover:bg-gray-50">
              <div className="text-xs text-gray-400 mb-1">{post.community}</div>
              <h3 className="font-bold text-md mb-1">{post.title}</h3>
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span>❤️ {post.votes}</span>
                <span>💬 {post.comments}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>

    </div>
  );
}
