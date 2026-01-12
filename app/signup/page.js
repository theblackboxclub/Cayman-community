"use client";
import React, { useState } from 'react';
import { auth } from '../../firebase'; // <--- UP TWO LEVELS
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { useRouter } from 'next/navigation';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleAuth = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
      router.push('/'); 
    } catch (err) {
      setError(err.message.replace('Firebase:', '').trim());
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
          />
          <input 
            type="password" 
            placeholder="Password" 
            className="w-full p-3 bg-gray-50 border border-gray-200 rounded outline-none focus:border-black transition"
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
          />
          <button className="w-full bg-black text-white font-bold py-3 rounded-lg hover:opacity-80 transition">
            {isLogin ? 'Sign In' : 'Create Account'}
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
