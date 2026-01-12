"use client";
import React, { useState } from 'react';
import { auth, db } from '../../firebase'; 
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getDocs, collection, query, where } from 'firebase/firestore'; 
import { useRouter } from 'next/navigation';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // --- 1. RANDOM NAME GENERATOR ---
  const generateUniqueName = async () => {
    const adjectives = ["Salty", "Breezy", "Grand", "Little", "Coral", "Sunny", "Hidden", "Ironshore", "Sandy", "Blue"];
    const nouns = ["Iguana", "Stingray", "Turtle", "Rooster", "Conch", "Pirate", "Diver", "Snapper", "Shark", "Palm"];
    
    let isUnique = false;
    let newName = "";

    // Keep trying until we find a name that doesn't exist
    while (!isUnique) {
      const randomAdj = adjectives[Math.floor(Math.random() * adjectives.length)];
      const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
      const randomNumber = Math.floor(Math.random() * 999) + 1;
      newName = `${randomAdj}${randomNoun}${randomNumber}`;

      // Check Firestore to see if this name is taken
      const q = query(collection(db, "users"), where("username", "==", newName));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        isUnique = true;
      }
    }
    return newName;
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        // --- LOG IN ---
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        // --- SIGN UP ---
        // 1. Create Auth User
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // 2. Generate Unique Username
        const uniqueUsername = await generateUniqueName();

        // 3. Save to Database (Permanently)
        await setDoc(doc(db, "users", user.uid), {
          username: uniqueUsername,
          email: user.email,
          createdAt: new Date().toISOString(),
          reputation: 0
        });
      }
      router.push('/'); 
    } catch (err) {
      console.error(err);
      setError(err.message.replace('Firebase:', '').trim());
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-sm text-center">
        <h1 className="text-2xl font-bold mb-2">{isLogin ? 'Welcome Back' : 'Join CaymanCircle'}</h1>
        <p className="text-gray-500 mb-6 text-sm">The community is waiting for you.</p>

        {error && <div className="bg-red-50 text-red-500 text-xs p-3 rounded mb-4">{error}</div>}

        <form onSubmit={handleAuth} className="space-y-4">
          <input 
            type="email" 
            placeholder="Email" 
            className="w-full p-3 bg-gray-50 border border-gray-200 rounded outline-none focus:border-black transition"
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            disabled={loading}
          />
          <input 
            type="password" 
            placeholder="Password" 
            className="w-full p-3 bg-gray-50 border border-gray-200 rounded outline-none focus:border-black transition"
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            disabled={loading}
          />
          <button disabled={loading} className="w-full bg-black text-white font-bold py-3 rounded-lg hover:opacity-80 transition disabled:opacity-50">
            {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
          </button>
        </form>

        <p className="mt-6 text-xs text-gray-400">
          {isLogin ? "New to the island? " : "Already have an account? "}
          <span 
            onClick={() => setIsLogin(!isLogin)} 
            className="text-black font-bold cursor-pointer underline"
          >
            {isLogin ? 'Sign Up' : 'Log In'}
          </span>
        </p>
      </div>
    </div>
  );
}
