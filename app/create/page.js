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
  
  // Media States
  const [mediaType, setMediaType] = useState('none'); 
  const [mediaUrl, setMediaUrl] = useState('');     
  const [imageFile, setImageFile] = useState(null); 
  
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [randomName, setRandomName] = useState('Loading...'); 
  const [useRandomName, setUseRandomName] = useState(true);

  // --- 🛠️ CLOUDINARY CONFIG ---
  const CLOUD_NAME = "dt2lajmvo";        // Your Cloud Name
  const UPLOAD_PRESET = "cayman_preset"; // The name you typed in the box
  // -----------------------------

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

  // --- NEW UPLOAD FUNCTION ---
  const uploadToCloudinary = async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", UPLOAD_PRESET); 

    const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
      method: "POST",
      body: formData
    });

    const data = await response.json();
    if (data.secure_url) {
      return data.secure_url;
    } else {
      throw new Error("Failed to upload image");
    }
  };

  const handlePost = async () => {
    if (!title) return alert("Please enter a title!");
    setLoading(true);

    const authorName = useRandomName ? randomName : user.email.split('@')[0];
    let finalMediaUrl = mediaUrl; 

    try {
      // 1. UPLOAD IMAGE IF SELECTED
      if (mediaType === 'image' && imageFile) {
        try {
           finalMediaUrl = await uploadToCloudinary(imageFile);
        } catch (uploadError) {
           console.error("Upload failed", uploadError);
           alert("Image upload failed. Please check your internet or Cloudinary settings.");
           setLoading(false);
           return;
        }
      }

      // 2. SAVE POST
      await addDoc(collection(db, "posts"), {
        title: title,
        body: body,
        community: community,
        author: authorName,
        userId: user.uid, 
        votes: 1,
        comments: 0,
        mediaUrl: finalMediaUrl, 
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
            <button onClick={() => setMediaType('image')} className={`text-sm font-bold px-3 py-1 rounded-full ${mediaType === 'image' ? 'bg-black text-white' : 'bg-gray-100 text-gray-500'}`}>📷 Upload Image</button>
            <button onClick={() => setMediaType('link')} className={`text-sm font-bold px-3 py-1 rounded-full ${mediaType === 'link' ? 'bg-black text-white' : 'bg-gray-100 text-gray-500'}`}>🔗 Add Link</button>
            <button onClick={() => {setMediaType('none'); setMediaUrl(''); setImageFile(null);}} className={`text-sm font-bold px-3 py-1 rounded-full ${mediaType === 'none' ? 'bg-black text-white' : 'bg-gray-100 text-gray-500'}`}>No Media</button>
          </div>

          {/* UPLOAD INPUT */}
          {mediaType === 'image' && (
            <div className="bg-gray-50 p-4 rounded-lg border border-dashed border-gray-300 text-center">
              <input 
                type="file" 
                accept="image/*"
                onChange={(e) => setImageFile(e.target.files[0])}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-black file:text-white hover:file:bg-gray-800 cursor-pointer"
              />
              {imageFile && <p className="text-xs text-green-600 mt-2 font-bold">Selected: {imageFile.name}</p>}
            </div>
          )}

          {/* LINK INPUT */}
          {mediaType === 'link' && (
            <input 
              type="text" 
              placeholder="Paste Website Link (e.g. https://google.com)"
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
