"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db, auth } from '../../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

export default function CreatePost() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [community, setCommunity] = useState('c/General');
  const [loading, setLoading] = useState(false);
  
  // LOGIN CHECK
  const [user, setUser] = useState(null);
  
  // RANDOM NAME STATE
  const [randomName, setRandomName] = useState('');
  // Default is TRUE (Use the random name)
  const [useRandomName, setUseRandomName] = useState(true);

  const communities = [
    "c/General",
    "c/CaymanFitness",
    "c/IslandJobs",
    "c/AskLocals",
    "c/Events",
    "c/RealEstate"
  ];

  // --- 1. THE CAYMAN NAME GENERATOR ---
  const generateCaymanName = () => {
    const adjectives = [
      "Salty", "Breezy", "Grand", "Little", "Coral", "Sunny", "Hidden", 
      "Ironshore", "Tropical", "Golden", "SevenMile", "Happy"
    ];
    const nouns = [
      "Iguana", "Stingray", "Turtle", "Rooster", "Conch", "Pirate", 
      "Diver", "Snapper", "Coconut", "Palm", "Shark", "Marlin"
    ];
    
    const randomAdj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
    const randomNumber = Math.floor(Math.random() * 99) + 1; // 1-99
    
    return `${randomAdj}${randomNoun}${randomNumber}`;
  };

  // --- 2. SETUP ON LOAD ---
  useEffect(() => {
    // Generate a random name as soon as page loads
    setRandomName(generateCaymanName());

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        router.push('/signup'); 
      } else {
        setUser(currentUser);
      }
    });
    return () => unsubscribe();
  }, [router]);

  // Helper to get a new name if they don't like the first one
  const shuffleName = (e) => {
    e.preventDefault();
    setRandomName(generateCaymanName());
  };

  const handlePost = async () => {
    if (!title) return alert("Please enter a title!");
    if (!user) return alert("You must be logged in!");
    
    setLoading(true);

    // LOGIC: Use Random Name OR Real Email Name
    const authorName = useRandomName ? randomName : user.email.split('@')[0];

    try {
      await addDoc(collection(db, "posts"), {
        title: title,
        body: body,
        community: community,
        author: authorName,
        // If using random name, we hide the real User ID to keep it truly private
        userId: useRandomName ? "hidden" : user.uid, 
        votes: 1,
        comments: 0,
        createdAt: serverTimestamp()
      });

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
        
        {/* IDENTITY CARD */}
        <div className={`flex flex-col gap-3 p-4 rounded-xl border transition-all ${useRandomName ? "bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-100" : "bg-gray-50 border-gray-200"}`}>
          
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1 block">Posting As</span>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black text-gray-800">
                  u/{useRandomName ? randomName : (user ? user.email.split('@')[0] : '...')}
                </span>
                
                {/* Shuffle Button (Only shows if Random mode is ON) */}
                {useRandomName && (
                  <button onClick={shuffleName} className="bg-white p-1 rounded-full shadow-sm hover:scale-110 transition border border-gray-200" title="Get new name">
                    🎲
                  </button>
                )}
              </div>
            </div>

            {/* The Toggle Switch */}
            <div className="flex items-center gap-2">
               <span className="text-xs text-gray-400 font-bold">{useRandomName ? "Incognito" : "Public"}</span>
               <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={useRandomName}
                  onChange={(e) => setUseRandomName(e.target.checked)} 
                  className="sr-only peer" 
                />
                <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>

          <p className="text-xs text-gray-500">
            {useRandomName 
              ? "Your real identity is hidden. This random name is unique to this post." 
              : "Your username comes from your email address."}
          </p>
        </div>

        {/* Community Selector */}
        <div className="relative">
          <select 
            value={community}
            onChange={(e) => setCommunity(e.target.value)}
            className="appearance-none w-full bg-white border border-gray-300 text-gray-900 py-3 px-4 pr-8 rounded leading-tight focus:outline-none focus:border-blue-500 font-bold"
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
          placeholder="What's happening?" 
          className="w-full h-64 text-lg placeholder-gray-300 outline-none resize-none"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />

      </div>
    </div>
  );
}
