"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db, auth } from '../../firebase';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

export default function CreatePost() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [community, setCommunity] = useState('c/General');
  const [mediaUrl, setMediaUrl] = useState(''); 
  const [mediaType, setMediaType] = useState('none'); 
  const [loading, setLoading] = useState(false);
  
  const [user, setUser] = useState(null);
  const [randomName, setRandomName] = useState('Loading...'); 
  const [useRandomName, setUseRandomName] = useState(true);

  const communities = [
    "c/General", "c/CaymanFitness", "c/IslandJobs", 
    "c/AskLocals", "c/Events", "c/RealEstate"
  ];

  const generateCaymanName = () => {
    const adjectives = ["Salty", "Breezy", "Grand", "Little", "Coral", "Sunny", "Hidden", "Ironshore"];
    const nouns = ["Iguana", "Stingray", "Turtle", "Rooster", "Conch", "Pirate", "Diver", "Snapper"];
    const randomAdj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
    const randomNumber = Math.floor(Math.random() * 99) + 1;
    return `${randomAdj}${randomNoun}${randomNumber}`;
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.push('/signup');
      } else {
        setUser(currentUser);
        
        const userRef = doc(db, "users", currentUser.uid);
        try {
          const snap = await getDoc(userRef);
          if (snap.exists() && snap.data().username) {
            setRandomName(snap.data().username);
          } else {
            setRandomName(generateCaymanName());
          }
        } catch (error) {
          console.error("Error fetching name:", error);
          setRandomName(generateCaymanName());
        }
      }
    });
    return () => unsubscribe();
  }, [router]);

  const handlePost = async () => {
    if (!title) return alert("Please enter a title!");
    setLoading(true);

    // VISUAL IDENTITY: This is what the public sees
    const authorName = useRandomName ? randomName : user.email.split('@')[0];

    try {
      await addDoc(collection(db, "posts"), {
        title: title,
        body: body,
        community: community,
        author: authorName,
        
        // OWNERSHIP ID: We ALWAYS save the real ID now, so you can delete it later.
        // The public never sees this ID, only the 'author' name above.
        userId: user.uid, 
        
        votes: 1,
        comments: 0,
        mediaUrl: mediaUrl,
        mediaType: mediaType, 
        createdAt: serverTimestamp()
      });

      router.push('/'); 
    } catch (error) {
      console.error("Error adding post: ", error);
      alert("Error posting.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Top Nav */}
      <div className="flex justify-between items-center px-4 py-3 border-b border-gray-100 sticky top-0 bg-white z-10">
        <button onClick={() => router.back()} className="text-gray-500 font-bold text-sm">Cancel</button>
        <h1 className="font-bold text-lg">Create Post</h1>
        <button onClick={handlePost} disabled={loading} className={`bg-blue-600 text-white px-4 py-1.5 rounded-full font-bold text-sm ${loading ? "opacity-50" : ""}`}>
          {loading ? "Posting..." : "Post"}
        </button>
      </div>

      <div className="p-4 flex flex-col gap-4 max-w-2xl mx-auto">
        {/* Identity Card */}
        <div className={`flex flex-col gap-3 p-4 rounded-xl border transition-all ${useRandomName ? "bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-100" : "bg-gray-50 border-gray-200"}`}>
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1 block">Posting As</span>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black text-gray-800">u/{useRandomName ? randomName : (user ? user.email.split('@')[0] : '...')}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
               <span className="text-xs text-gray-400 font-bold">{useRandomName ? "Incognito" : "Public"}</span>
               <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={useRandomName} onChange={(e) => setUseRandomName(e.target.checked)} className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {useRandomName 
             ? "You will post as this random name. Only YOU can see that you created it (so you can delete it later)." 
             : "Your real username will be visible to everyone."}
          </p>
        </div>

        {/* Community & Title */}
        <div className="relative">
          <select value={community} onChange={(e) => setCommunity(e.target.value)} className="appearance-none w-full bg-white border border-gray-300 text-gray-900 py-3 px-4 rounded font-bold">
            {communities.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <input type="text" placeholder="An interesting title" className="text-2xl font-bold placeholder-gray-300 outline-none w-full" value={title} onChange={(e) => setTitle(e.target.value)} />
        
        {/* Body */}
        <textarea placeholder="What's happening?" className="w-full h-32 text-lg placeholder-gray-300 outline-none resize-none" value={body} onChange={(e) => setBody(e.target.value)} />

        {/* Media Inputs */}
        <div className="border-t border-gray-100 pt-4">
          <div className="flex gap-4 mb-2">
            <button onClick={() => setMediaType('image')} className={`text-sm font-bold px-3 py-1 rounded-full ${mediaType === 'image' ? 'bg-black text-white' : 'bg-gray-100 text-gray-500'}`}>📷 Add Image</button>
            <button onClick={() => setMediaType('link')} className={`text-sm font-bold px-3 py-1 rounded-full ${mediaType === 'link' ? 'bg-black text-white' : 'bg-gray-100 text-gray-500'}`}>🔗 Add Link</button>
            <button onClick={() => {setMediaType('none'); setMediaUrl('')}} className={`text-sm font-bold px-3 py-1 rounded-full ${mediaType === 'none' ? 'bg-black text-white' : 'bg-gray-100 text-gray-500'}`}>No Media</button>
          </div>
          {mediaType !== 'none' && (
            <input 
              type="text" 
              placeholder={mediaType === 'image' ? "Paste Image URL (e.g. https://...jpg)" : "Paste Website Link (e.g. https://google.com)"}
              className="w-full bg-gray-50 border border-gray-200 rounded p-2 text-sm"
              value={mediaUrl}
              onChange={(e) => setMediaUrl(e.target.value)}
            />
          )}
        </div>

      </div>
    </div>
  );
}
