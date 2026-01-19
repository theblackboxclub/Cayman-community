"use client";
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { db, auth, storage } from '../firebase'; 
import { onAuthStateChanged } from 'firebase/auth';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export default function CreatePost() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Post State
  const [activeTab, setActiveTab] = useState('text'); // 'text', 'image', 'poll'
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [community, setCommunity] = useState('General');
  
  // Image State
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);

  // Poll State
  const [pollOptions, setPollOptions] = useState(['', '']); 

  const communities = ["General", "CaymanFitness", "IslandJobs", "AskLocals", "Events", "RealEstate"];

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (!u) router.push('/signup');
      setUser(u);
    });
    return () => unsubscribe();
  }, [router]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setActiveTab('image');
    }
  };

  const handlePollOptionChange = (index, value) => {
    const newOptions = [...pollOptions];
    newOptions[index] = value;
    setPollOptions(newOptions);
  };

  const addPollOption = () => {
    if (pollOptions.length < 4) setPollOptions([...pollOptions, '']);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return alert("Title is required");
    setLoading(true);

    try {
      let mediaUrl = null;
      let postType = activeTab;
      let finalPollData = null;

      // 1. Handle Image Upload
      if (activeTab === 'image' && imageFile) {
        const storageRef = ref(storage, `posts/${user.uid}/${Date.now()}_${imageFile.name}`);
        const snapshot = await uploadBytes(storageRef, imageFile);
        mediaUrl = await getDownloadURL(snapshot.ref);
      }

      // 2. Handle Poll Data
      if (activeTab === 'poll') {
        const validOptions = pollOptions.filter(o => o.trim() !== '');
        if (validOptions.length < 2) {
          setLoading(false);
          return alert("Polls need at least 2 options.");
        }
        // Structure: [{ text: "Burger King", votes: [] }, ...]
        finalPollData = validOptions.map(opt => ({ text: opt, votes: [] }));
      }

      // 3. Save to Firestore
      await addDoc(collection(db, "posts"), {
        title: title,
        body: body,
        community: community,
        userId: user.uid,
        author: user.displayName || "Anonymous",
        type: postType, // 'text', 'image', 'poll'
        mediaUrl: mediaUrl,
        pollOptions: finalPollData, // Array of options
        votes: 0,
        comments: 0,
        likedBy: [],
        createdAt: serverTimestamp()
      });

      router.push('/');
    } catch (error) {
      console.error("Error creating post:", error);
      alert("Failed to post.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-white px-4 py-3 border-b border-gray-200 sticky top-0 flex justify-between items-center shadow-sm">
        <button onClick={() => router.back()} className="text-gray-500 font-bold">Cancel</button>
        <h1 className="font-black text-lg">Create Post</h1>
        <button 
          onClick={handleSubmit} 
          disabled={loading}
          className="bg-black text-white px-4 py-1.5 rounded-full text-sm font-bold disabled:opacity-50"
        >
          {loading ? "Posting..." : "Post"}
        </button>
      </div>

      <div className="max-w-md mx-auto p-4">
        {/* Type Selector */}
        <div className="flex bg-gray-200 p-1 rounded-xl mb-6">
           <button onClick={() => setActiveTab('text')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${activeTab === 'text' ? 'bg-white shadow-sm text-black' : 'text-gray-500'}`}>Text</button>
           <button onClick={() => fileInputRef.current.click()} className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${activeTab === 'image' ? 'bg-white shadow-sm text-black' : 'text-gray-500'}`}>Image 📷</button>
           <button onClick={() => setActiveTab('poll')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${activeTab === 'poll' ? 'bg-white shadow-sm text-black' : 'text-gray-500'}`}>Poll 📊</button>
        </div>

        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageChange} />

        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
          <div className="mb-4">
            <label className="text-xs font-bold text-gray-400 uppercase">Community</label>
            <select 
              className="w-full mt-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm font-bold outline-none"
              value={community}
              onChange={(e) => setCommunity(e.target.value)}
            >
              {communities.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <input 
            type="text" 
            placeholder="Title" 
            className="w-full text-lg font-black placeholder-gray-300 outline-none mb-4"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          {activeTab === 'text' && (
            <textarea 
              placeholder="What's on your mind?" 
              className="w-full h-40 text-sm text-gray-800 outline-none resize-none"
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          )}

          {activeTab === 'image' && imagePreview && (
            <div className="relative mb-4">
              <img src={imagePreview} className="w-full rounded-xl border border-gray-100" />
              <button onClick={() => {setImagePreview(null); setImageFile(null); setActiveTab('text');}} className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded-full"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
          )}

          {activeTab === 'poll' && (
            <div className="space-y-3 mb-2 animate-fade-in">
              <textarea 
                placeholder="Ask a question..." 
                className="w-full h-20 text-sm text-gray-800 outline-none resize-none mb-2"
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
              {pollOptions.map((opt, idx) => (
                <input 
                  key={idx}
                  type="text" 
                  placeholder={`Option ${idx + 1}`} 
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-cyan-100"
                  value={opt}
                  onChange={(e) => handlePollOptionChange(idx, e.target.value)}
                />
              ))}
              {pollOptions.length < 4 && (
                <button onClick={addPollOption} className="text-xs font-bold text-cyan-600 hover:underline">+ Add Option</button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
