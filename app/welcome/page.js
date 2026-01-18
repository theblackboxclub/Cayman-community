"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '../../firebase'; 
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

export default function Welcome() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.push('/signup');
        return;
      }
      setUser(currentUser);

      // Fetch the generated username to show them
      try {
        const docRef = doc(db, "users", currentUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setUsername(docSnap.data().username);
        }
      } catch (e) {
        console.error("Error fetching user", e);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-cyan-600 font-bold">Loading...</div>;

  return (
    <div className="min-h-screen bg-gradient-to-b from-cyan-50 to-white flex flex-col items-center justify-center p-6 text-center">
      
      {/* Animation / Icon */}
      <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-xl mb-8 animate-bounce">
        <div className="w-16 h-16 rounded-full border-[6px] border-cyan-500"></div>
      </div>

      <h1 className="text-3xl font-black text-gray-900 mb-2 tracking-tight">
        Welcome to the Circle.
      </h1>
      
      <p className="text-gray-500 mb-8 max-w-xs mx-auto leading-relaxed text-sm">
        You are now part of the anonymous community for Grand Cayman.
      </p>

      {/* Identity Reveal Card */}
      <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 w-full max-w-sm mb-8 transform transition duration-300">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Your Secret Identity</p>
        <div className="flex flex-col items-center gap-2">
          <div className="w-16 h-16 bg-cyan-100 rounded-full flex items-center justify-center font-bold text-cyan-700 text-2xl mb-1">
            {username.charAt(0).toUpperCase()}
          </div>
          <span className="text-2xl font-black text-gray-900">{username}</span>
        </div>
        <p className="text-[10px] text-gray-400 mt-3 bg-gray-50 p-2 rounded-lg">
          You can change this or add a bio in your profile settings later.
        </p>
      </div>

      <button 
        onClick={() => router.push('/')}
        className="w-full max-w-sm bg-black text-white py-4 rounded-xl font-bold text-lg shadow-xl hover:bg-gray-800 transition active:scale-95"
      >
        Enter CircleCayman
      </button>

    </div>
  );
}
