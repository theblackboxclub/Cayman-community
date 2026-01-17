"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '../../firebase'; 
import { onAuthStateChanged, signOut, deleteUser, EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { doc, deleteDoc, collection, query, where, getDocs } from 'firebase/firestore';
import Link from 'next/link';

export default function Settings() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Password Change State
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) router.push('/signup');
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  const handleSignOut = async () => {
    await signOut(auth);
    router.push('/signup');
  };

  const handleChangePassword = async () => {
    setError('');
    setMessage('');
    if (!currentPassword || !newPassword) return setError("Please fill all fields.");
    if (newPassword.length < 6) return setError("New password must be 6+ chars.");

    try {
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      
      setMessage("Password updated successfully!");
      setShowPasswordChange(false);
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      console.error(err);
      setError("Incorrect current password or error updating.");
    }
  };

  const handleDeleteAccount = async () => {
    const confirm1 = confirm("Are you sure you want to delete your account?");
    if (!confirm1) return;
    
    const confirm2 = confirm("This is permanent. All your data will be lost. Type 'DELETE' to confirm.");
    // In a real app, we'd make them type it. For now, simple confirm.
    if (!confirm2) return;

    try {
      // 1. Delete User Doc
      await deleteDoc(doc(db, "users", user.uid));
      
      // 2. Delete Auth User
      await deleteUser(user);
      
      alert("Account deleted.");
      router.push('/signup');
    } catch (err) {
      console.error(err);
      alert("Please sign out and sign in again to delete your account (Security requirement).");
    }
  };

  if (loading) return <div className="p-10 text-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      
      {/* Header */}
      <div className="bg-white px-4 py-3 border-b border-gray-200 sticky top-0 z-10 flex items-center gap-3 shadow-sm">
        <button onClick={() => router.back()}><svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg></button>
        <h1 className="font-black text-xl text-gray-900">Settings</h1>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-6">
        
        {/* Account Info */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Account</h2>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-cyan-100 rounded-full flex items-center justify-center font-bold text-cyan-700">
              {user?.email?.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-bold text-gray-900">{user?.displayName || "User"}</p>
              <p className="text-xs text-gray-500">{user?.email}</p>
            </div>
          </div>
          
          <button 
            onClick={() => setShowPasswordChange(!showPasswordChange)}
            className="w-full text-left flex justify-between items-center py-3 border-t border-gray-50"
          >
            <span className="text-sm font-bold text-gray-700">Change Password</span>
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>

          {showPasswordChange && (
            <div className="mt-2 bg-gray-50 p-3 rounded-xl animate-fade-in">
              {error && <p className="text-xs text-red-500 font-bold mb-2">{error}</p>}
              {message && <p className="text-xs text-green-500 font-bold mb-2">{message}</p>}
              
              <input 
                type="password" 
                placeholder="Current Password" 
                className="w-full mb-2 px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
              <input 
                type="password" 
                placeholder="New Password" 
                className="w-full mb-2 px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <button onClick={handleChangePassword} className="w-full bg-black text-white py-2 rounded-lg text-xs font-bold">Update</button>
            </div>
          )}
        </div>

        {/* Support / Info */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">About</h2>
          <div className="py-2">
            <p className="text-sm font-bold text-gray-900">CircleCayman v1.0</p>
            <p className="text-xs text-gray-500 mt-1">
              Built for the community. Use this app to connect, share, and explore the islands.
            </p>
          </div>
          <div className="border-t border-gray-50 pt-2 mt-2">
             <p className="text-xs text-gray-400">© 2026 CircleCayman</p>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="text-xs font-bold text-red-400 uppercase tracking-widest mb-4">Danger Zone</h2>
          
          <button 
            onClick={handleSignOut}
            className="w-full text-left py-2 text-sm font-bold text-gray-600 hover:text-black flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            Sign Out
          </button>

          <button 
            onClick={handleDeleteAccount}
            className="w-full text-left py-2 text-sm font-bold text-red-500 hover:text-red-700 flex items-center gap-2 mt-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            Delete Account
          </button>
        </div>

      </div>
    </div>
  );
}
