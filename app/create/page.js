"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
// Import the database connection we set up earlier
import { db } from '../../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export default function CreatePost() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [community, setCommunity] = useState('c/General');
  const [loading, setLoading] = useState(false);

  const communities = [
    "c/General",
    "c/CaymanFitness",
    "c/IslandJobs",
    "c/AskLocals",
    "c/Events",
    "c/RealEstate"
  ];

  // This function runs when you click "Post"
  const handlePost = async () => {
    if (!title) return alert("Please enter a title!");
    
    setLoading(true);

    try {
      // 1. Save the data to the "posts" collection in Firebase
      await addDoc(collection(db, "posts"), {
        title: title,
        body: body,
        community: community,
        author: "CaymanLocal", // We will use real names later
        votes: 1,
        comments: 0,
        createdAt: serverTimestamp() // Timestamp is crucial for sorting
      });

      // 2. Success! Go back to the home page
      router.push('/'); 
      
    } catch (error) {
      console.error("Error adding post: ", error);
      alert("Error posting. Check console.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      
      {/* Top Navigation */}
      <div className="flex justify-between items-center px-4 py-3 border-b border-gray-100 sticky top-0 bg-white z-10">
        <button onClick={() => router.back()} className="text-gray-500 font-bold text-sm">Cancel</button>
        <h1 className="font-bold text-lg">Create Post</h1>
        <button 
          onClick={handlePost}
          disabled={loading}
          className={`bg-blue-600 text-white px-4 py-1.5 rounded-full font-bold text-sm ${loading ? "opacity-50" : ""}`}
        >
          {loading ? "Posting..." : "Post"}
        </button>
      </div>

      {/* Input Form */}
      <div className="p-4 flex flex-col gap-4 max-w-2xl mx-auto">
        
        {/* Community Selector */}
        <div className="relative">
          <select 
            value={community}
            onChange={(e) => setCommunity(e.target.value)}
            className="appearance-none w-full bg-gray-50 border border-gray-200 text-gray-700 py-3 px-4 pr-8 rounded leading-tight focus:outline-none focus:bg-white focus:border-gray-500 font-bold"
          >
            {communities.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
            <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
          </div>
        </div>

        {/* Title Input */}
        <input 
          type="text" 
          placeholder="An interesting title" 
          className="text-2xl font-bold placeholder-gray-300 outline-none w-full"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        {/* Body Input */}
        <textarea 
          placeholder="What's on your mind?" 
          className="w-full h-64 text-lg placeholder-gray-300 outline-none resize-none"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />

      </div>
    </div>
  );
}
