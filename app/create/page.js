"use client";
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { db, auth, storage } from '../../firebase'; 
import { onAuthStateChanged } from 'firebase/auth';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export default function CreatePost() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('post');
  
  // Shared State
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [community, setCommunity] = useState('General');
  const [selectedFlair, setSelectedFlair] = useState(null); // <--- NEW: Flair State
  
  // Attachments
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const fileInputRef = useRef(null);

  // Poll State
  const [pollOptions, setPollOptions] = useState(['', '', '', '']); 

  const communities = ["General", "CaymanFitness", "IslandJobs", "AskLocals", "Events", "RealEstate"];

  // --- FLAIR CONFIGURATION ---
  const flairs = [
    { name: "Question", emoji: "❓", color: "bg-orange-100 text-orange-700 border-orange-200" },
    { name: "Rant", emoji: "😤", color: "bg-red-100 text-red-700 border-red-200" },
    { name: "News", emoji: "📰", color: "bg-blue-100 text-blue-700 border-blue-200" },
    { name: "Buy/Sell", emoji: "💰", color: "bg-green-100 text-green-700 border-green-200" },
    { name: "Alert", emoji: "🚨", color: "bg-yellow-100 text-yellow-800 border-yellow-200" },
    { name: "Review", emoji: "⭐", color: "bg-purple-100 text-purple-700 border-purple-200" },
  ];

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
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if(fileInputRef.current) fileInputRef.current.value = "";
  };

  const handlePollOptionChange = (index, value) => {
    const newOptions = [...pollOptions];
    newOptions[index] = value;
    setPollOptions(newOptions);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return alert("Please add a title.");
    setLoading(true);

    try {
      let mediaUrl = null;
      let finalPollData = null;

      // Safe check for storage
      if (imageFile) {
        if (!storage) throw new Error("Storage is not configured.");
        const storageRef = ref(storage, `posts/${user.uid}/${Date.now()}_${imageFile.name}`);
        const snapshot = await uploadBytes(storageRef, imageFile);
        mediaUrl = await getDownloadURL(snapshot.ref);
      }

      if (activeTab === 'poll') {
        const validOptions = pollOptions.filter(o => o.trim() !== '');
        if (validOptions.length < 2) {
          setLoading(false);
          return alert("Polls need at least 2 options.");
        }
        finalPollData = validOptions.map(opt => ({ text: opt, votes: [] }));
      }

      await addDoc(collection(db, "posts"), {
        title: title,
        body: body,
        community: community,
        flair: selectedFlair, // <--- SAVING FLAIR
        userId: user.uid,
        author: user.displayName || "Anonymous",
        type: activeTab,
        mediaUrl: mediaUrl,
        linkUrl: linkUrl.trim() || null, 
        pollOptions: finalPollData,
        votes: 0,
        comments: 0,
        likedBy: [],
        createdAt: serverTimestamp()
      });

      router.push('/');
    } catch (error) {
      console.error("Error creating post:", error);
      alert("Failed to post: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-cyan-50 to-white pb-20">
      <div className="bg-white/90 backdrop-blur-md px-4 py-3 border-b border-gray-100 sticky top-0 flex justify-between items-center shadow-sm z-20">
        <button onClick={() => router.back()} className="text-gray-500 font-bold text-sm">Cancel</button>
        <h1 className="font-black text-lg text-gray-900">Create</h1>
        <button onClick={handleSubmit} disabled={loading || !title.trim()} className="bg-black text-white px-6 py-2 rounded-full text-sm font-bold disabled:opacity-50 shadow-lg transition-transform active:scale-95">
          {loading ? "Posting..." : "Post"}
        </button>
      </div>

      <div className="max-w-xl mx-auto p-4">
        {/* Top Row: Community & Tab Toggle */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2 bg-white p-2 rounded-full shadow-sm border border-gray-100">
             <div className="w-8 h-8 rounded-full bg-cyan-100 flex items-center justify-center text-cyan-700 font-bold text-xs">c/</div>
             <select className="bg-transparent font-bold text-sm text-gray-800 outline-none pr-4 cursor-pointer" value={community} onChange={(e) => setCommunity(e.target.value)}>
               {communities.map(c => <option key={c} value={c}>{c}</option>)}
             </select>
          </div>
          
          <div className="flex bg-gray-100 p-1 rounded-full">
             <button onClick={() => setActiveTab('post')} className={`px-4 py-1.5 text-xs font-bold rounded-full transition ${activeTab === 'post' ? 'bg-white shadow-sm text-black' : 'text-gray-400'}`}>📝 Post</button>
             <button onClick={() => setActiveTab('poll')} className={`px-4 py-1.5 text-xs font-bold rounded-full transition ${activeTab === 'poll' ? 'bg-white shadow-sm text-black' : 'text-gray-400'}`}>📊 Poll</button>
          </div>
        </div>

        <input type="text" placeholder="An interesting title..." className="w-full text-xl font-black placeholder-gray-300 outline-none bg-transparent mb-4 px-1" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />

        {/* FLAIR SELECTOR (NEW) */}
        <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide mb-2">
          {flairs.map((f) => (
            <button
              key={f.name}
              onClick={() => setSelectedFlair(selectedFlair === f.name ? null : f.name)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${selectedFlair === f.name ? f.color + " ring-2 ring-offset-1 ring-cyan-200" : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"}`}
            >
              {f.emoji} {f.name}
            </button>
          ))}
        </div>

        <div className="bg-white p-4 rounded-3xl shadow-lg border border-gray-50 min-h-[300px] flex flex-col relative">
            <textarea placeholder={activeTab === 'poll' ? "Add context to your poll (optional)..." : "What's on your mind?"} className="w-full h-32 text-base text-gray-800 outline-none resize-none bg-transparent placeholder-gray-400 mb-4" value={body} onChange={(e) => setBody(e.target.value)} />

            {activeTab === 'poll' && (
              <div className="space-y-3 mb-6 animate-fade-in">
                {pollOptions.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                     <span className="text-xs font-bold text-gray-400 w-4">{idx+1}.</span>
                     <input type="text" placeholder={`Option ${idx + 1}`} className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-cyan-100 transition" value={opt} onChange={(e) => handlePollOptionChange(idx, e.target.value)} />
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-3 mb-4">
              {imagePreview && (
                <div className="relative rounded-xl overflow-hidden border border-gray-200">
                  <img src={imagePreview} className="w-full max-h-60 object-cover" />
                  <button onClick={removeImage} className="absolute top-2 right-2 bg-black/60 text-white p-1.5 rounded-full hover:bg-black/80 transition"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                </div>
              )}

              {(showLinkInput || linkUrl) && (
                <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 flex items-center gap-2">
                   <div className="bg-blue-200 p-2 rounded-full text-blue-700"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg></div>
                   <input type="text" placeholder="Paste link here (https://...)" className="flex-1 bg-transparent text-sm text-blue-800 placeholder-blue-300 outline-none font-medium" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} autoFocus />
                   <button onClick={() => {setLinkUrl(''); setShowLinkInput(false);}} className="text-blue-400 hover:text-blue-600"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                </div>
              )}
            </div>

            <div className="mt-auto pt-3 border-t border-gray-100 flex gap-4">
               <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 text-gray-500 hover:text-cyan-600 transition font-bold text-xs bg-gray-50 px-3 py-2 rounded-lg hover:bg-cyan-50"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>Photo</button>
               <button onClick={() => setShowLinkInput(true)} className="flex items-center gap-2 text-gray-500 hover:text-blue-600 transition font-bold text-xs bg-gray-50 px-3 py-2 rounded-lg hover:bg-blue-50"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>Link</button>
               <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageChange} />
            </div>
        </div>
      </div>
    </div>
  );
}
