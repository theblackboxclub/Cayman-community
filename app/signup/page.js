"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
// Point to root firebase.js
import { auth, db } from '../../firebase'; 
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

// --- RANDOM USERNAME GENERATOR ---
const generateUsername = () => {
  const adjs = ['Salty', 'Sunny', 'Tropical', 'Grand', 'Blue', 'Sandy', 'Coral', 'Golden', 'Breezy', 'Royal', 'Lazy', 'Happy'];
  const nouns = ['Iguana', 'Stingray', 'Turtle', 'Conch', 'Rooster', 'Coconut', 'Shark', 'Marlin', 'Palm', 'Pirate', 'Diver', 'Reef'];
  
  const adj = adjs[Math.floor(Math.random() * adjs.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(Math.random() * 1000) + 100; // 100-1099
  
  return `${adj}${noun}${num}`;
};

export default function AuthPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true); // Default to Login now
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAuth = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        // --- LOG IN ---
        await signInWithEmailAndPassword(auth, email, password);
        router.push('/');
      } else {
        // --- SIGN UP (AUTO USERNAME) ---
        
        // 1. Generate Random Name
        const randomName = generateUsername();

        // 2. Create Auth User
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // 3. Update Display Name
        await updateProfile(user, { displayName: randomName });

        // 4. Create User Document
        await setDoc(doc(db, "users", user.uid), {
          username: randomName,
          email: email,
          createdAt: serverTimestamp(),
          profilePic: null 
        });

        router.push('/');
      }
    } catch (err) {
      console.error(err);
      setError(err.message.replace("Firebase: ", ""));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-cyan-50 to-white flex flex-col items-center justify-center p-6">
      
      {/* Logo */}
      <div className="flex items-center gap-2 mb-8">
         <div className="w-10 h-10 rounded-full border-[6px] border-cyan-600"></div>
         <span className="font-black text-3xl tracking-tighter text-gray-900">
           Circle<span className="text-cyan-600">Cayman</span>
         </span>
      </div>

      {/* Auth Card */}
      <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100 w-full max-w-sm">
        <h2 className="text-2xl font-black text-gray-900 mb-1">
          {isLogin ? "Welcome back" : "Join the circle"}
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          {isLogin ? "Enter your details to sign in." : "Sign up to get your anonymous identity."}
        </p>

        {error && (
          <div className="bg-red-50 text-red-500 text-xs font-bold p-3 rounded-xl mb-4 border border-red-100">
            {error}
          </div>
        )}

        <form onSubmit={handleAuth} className="flex flex-col gap-4">
          
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase ml-1">Email</label>
            <input 
              type="email" 
              placeholder="you@email.com" 
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-cyan-200 transition"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs font-bold text-gray-400 uppercase ml-1">Password</label>
            <input 
              type="password" 
              placeholder="••••••••" 
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-cyan-200 transition"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {!isLogin && (
             <div className="text-xs text-center text-gray-400 bg-gray-50 p-2 rounded-lg border border-gray-100">
               ✨ A random username (e.g. <b>SaltyIguana</b>) will be assigned to you.
             </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="mt-2 bg-cyan-600 text-white py-3 rounded-xl font-bold shadow-lg hover:bg-cyan-700 hover:scale-[1.02] transition active:scale-95"
          >
            {loading ? "Please wait..." : (isLogin ? "Sign In" : "Create Anonymous Account")}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            {isLogin ? "New here?" : "Already have an account?"}
            <button 
              onClick={() => setIsLogin(!isLogin)} 
              className="ml-2 font-bold text-cyan-600 hover:underline"
            >
              {isLogin ? "Sign Up" : "Log In"}
            </button>
          </p>
        </div>
      </div>
      
      <p className="mt-8 text-[10px] text-gray-400 font-bold">© 2026 CircleCayman</p>
    </div>
  );
}