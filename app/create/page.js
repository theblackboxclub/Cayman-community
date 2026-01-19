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
  const [pollOptions, setPollOptions] = useState(['', '', '', '']); // Start with 4 empty slots

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return alert("Please add a title underneath the tabs.");
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
          return alert("Polls need at least 2 options filled in.");
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
        type: postType,
        mediaUrl: mediaUrl,
        pollOptions: finalPollData,
        votes: 0,
        comments: 0,
        likedBy: [],
        createdAt: serverTimestamp()
      });

      router.push('/');
    } catch (error) {
      console.error("Error creating post:", error);
      alert("Failed to post. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const tabBase = "flex-1 py-3 text-sm font-bold rounded-full transition-all flex items-center justify-center gap-2";
  const tabActive = "bg-cyan-100 text-cyan-700 shadow-sm";
  const tabInactive = "text-gray-500 hover:bg-gray-50";

  return (
    <div className="min-h-screen bg-gradient-to-b from-cyan-50 to-white pb-20">
      
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-md px-4 py-3 border-b border-gray-100 sticky top-0 flex justify-between items-center shadow-sm z-10">
        <button onClick={() => router.back()} className="text-gray-500 font-bold text-sm px-2">Cancel</button>
        <h1 className="font-black text-lg text-gray-900">Create</h1>
        <button 
          onClick={handleSubmit} 
          disabled={loading || !title.trim()}
          className="bg-gradient-to-r from-cyan-600 to-cyan-500 text-white px-6 py-2 rounded-full text-sm font-bold disabled:opacity-50 shadow-md transition-transform active:scale-95"
        >
          {loading ? "Sharing..." : "Post"}
        </button>
      </div>

      <div className="max-w-xl mx-auto p-4 mt-2">
        
        {/* Community Selector & Title Input */}
        <div className="bg-white p-2 rounded-[2rem] shadow-sm border border-gray-100 mb-4 flex items-center">
          <select 
            className="bg-cyan-50 border-none rounded-full px-4 py-3 text-sm font-bold text-cyan-800 outline-none mr-2 cursor-pointer appearance-none text-center"
            value={community}
            onChange={(e) => setCommunity(e.target.value)}
            style={{backgroundImage: `url('data:image/svg+xml;charset=US-ASCII,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="%230e7490" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-chevron-down"><polyline points="6 9 12 15 18 9"></polyline></svg>')`, backgroundRepeat: "no-repeat", backgroundPosition: "right 8px center", backgroundSize: "16px", paddingRight: "32px"}}
          >
            {communities.map(c => <option key={c} value={c}>c/{c}</option>)}
          </select>
          <input 
            type="text" 
            placeholder="An interesting title..." 
            className="flex-1 text-lg font-black placeholder-gray-300 outline-none px-2 py-2 bg-transparent"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
          />
        </div>

        <div className="bg-white p-5 rounded-[2rem] shadow-lg border border-gray-50 relative overflow-hidden">
           {/* Background decorative blob */}
           <div className="absolute top-0 right-0 -mt-10 -mr-10 w-32 h-32 bg-cyan-50 rounded-full blur-3xl opacity-50 pointer-events-none"></div>

          {/* Friendly Tab Switcher */}
          <div className="flex bg-gray-50 p-1.5 rounded-full mb-6 relative z-10">
             <button onClick={() => setActiveTab('text')} className={`${tabBase} ${activeTab === 'text' ? tabActive : tabInactive}`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                Text
             </button>
             <button onClick={() => fileInputRef.current?.click()} className={`${tabBase} ${activeTab === 'image' ? tabActive : tabInactive}`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                Photo
             </button>
             <button onClick={() => setActiveTab('poll')} className={`${tabBase} ${activeTab === 'poll' ? tabActive : tabInactive}`}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" /></svg>
                Poll
             </button>
          </div>

          <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageChange} />

          {/* Main Content Area */}
          <div className="relative z-10 min-h-[200px]">
            {activeTab === 'text' && (
              <textarea 
                placeholder="Share your thoughts, stories, or questions..." 
                className="w-full h-48 p-3 text-base text-gray-800 outline-none resize-none bg-transparent placeholder-gray-400"
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
            )}

            {activeTab === 'image' && (
              <div className="flex flex-col items-center justify-center h-full">
                 {imagePreview ? (
                  <div className="relative w-full rounded-2xl overflow-hidden shadow-sm border border-gray-100">
                    <img src={imagePreview} className="w-full h-auto max-h-64 object-cover" />
                    <button onClick={() => {setImagePreview(null); setImageFile(null); setActiveTab('text');}} className="absolute top-3 right-3 bg-black/60 text-white p-2 rounded-full hover:bg-black/80 transition"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                  </div>
                ) : (
                  <div onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-cyan-200 rounded-2xl bg-cyan-50/50 text-cyan-600 cursor-pointer hover:bg-cyan-50 transition">
                     <svg className="w-10 h-10 mb-2 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                     <p className="font-bold text-sm">Tap to select a photo</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'poll' && (
              <div className="space-y-3 animate-fade-in">
                <textarea 
                  placeholder="Ask a question about this poll (optional)..." 
                  className="w-full h-20 p-2 text-sm text-gray-800 outline-none resize-none bg-transparent placeholder-gray-400 mb-4 border-b border-gray-100"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                />
                {pollOptions.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                     <span className="text-xs font-bold text-cyan-600 w-6">{idx+1}.</span>
                     <input 
                      type="text" 
                      placeholder={idx < 2 ? `Option ${idx + 1} (Required)` : `Option ${idx + 1} (Optional)`}
                      className="flex-1 bg-gray-50/80 border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-cyan-200 focus:border-cyan-300 transition-all placeholder-gray-400"
                      value={opt}
                      onChange={(e) => handlePollOptionChange(idx, e.target.value)}
                    />
                  </div>
                ))}
                <p className="text-center text-xs text-gray-400 mt-2">Fill at least 2 options.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
