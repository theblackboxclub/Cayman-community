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
  
  // Form State
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  
  // Community Logic
  const defaultCommunities = ["General", "CaymanFitness", "IslandJobs", "AskLocals", "Events", "RealEstate"];
  const [community, setCommunity] = useState(''); 
  const [isCustomCommunity, setIsCustomCommunity] = useState(false);
  const [customCommunityName, setCustomCommunityName] = useState('');

  // Flair Logic
  const defaultFlairs = [
    { name: "Question", emoji: "❓", color: "bg-orange-100 text-orange-700 border-orange-200" },
    { name: "Rant", emoji: "😤", color: "bg-red-100 text-red-700 border-red-200" },
    { name: "News", emoji: "📰", color: "bg-blue-100 text-blue-700 border-blue-200" },
    { name: "Buy/Sell", emoji: "💰", color: "bg-green-100 text-green-700 border-green-200" },
  ];
  const [selectedFlair, setSelectedFlair] = useState(null);
  const [isCreatingFlair, setIsCreatingFlair] = useState(false);
  const [newFlairName, setNewFlairName] = useState('');
  
  // Attachments
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const fileInputRef = useRef(null);

  // Poll State
  const [pollOptions, setPollOptions] = useState(['', '', '', '']); 

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (!u) router.push('/signup');
      setUser(u);
    });
    return () => unsubscribe();
  }, [router]);

  // --- HANDLERS ---

  const handleCommunityChange = (e) => {
    const val = e.target.value;
    if (val === 'CREATE_NEW') {
      setIsCustomCommunity(true);
      setCommunity('');
    } else {
      setIsCustomCommunity(false);
      setCommunity(val);
    }
  };

  const handleCreateFlair = () => {
    if (newFlairName.trim()) {
      // Just save it as a simple string, we won't assign a color/emoji for custom ones yet
      setSelectedFlair(newFlairName.trim());
      setIsCreatingFlair(false);
    }
  };

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

    // 1. Validation Checks (with Alerts)
    const finalCommunity = isCustomCommunity ? customCommunityName : community;
    
    if (!finalCommunity.trim()) return alert("⚠️ Please select or create a community.");
    if (!title.trim()) return alert("⚠️ Please add a title to your post.");
    if (activeTab === 'poll') {
       const validOptions = pollOptions.filter(o => o.trim() !== '');
       if (validOptions.length < 2) return alert("⚠️ Polls need at least 2 options.");
    }
    
    setLoading(true);

    try {
      let mediaUrl = null;
      let finalPollData = null;

      // 2. Upload Image
      if (imageFile) {
        if (!storage) throw new Error("Storage is not configured.");
        const storageRef = ref(storage, `posts/${user.uid}/${Date.now()}_${imageFile.name}`);
        const snapshot = await uploadBytes(storageRef, imageFile);
        mediaUrl = await getDownloadURL(snapshot.ref);
      }

      // 3. Prepare Poll
      if (activeTab === 'poll') {
        const validOptions = pollOptions.filter(o => o.trim() !== '');
        finalPollData = validOptions.map(opt => ({ text: opt, votes: [] }));
      }

      // 4. Save to Firestore
      await addDoc(collection(db, "posts"), {
        title: title,
        body: body,
        community: finalCommunity, // Uses the custom name if typed
        flair: selectedFlair,
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
        <button 
          onClick={handleSubmit} 
          disabled={loading} // Only disable while actually uploading
          className="bg-black text-white px-6 py-2 rounded-full text-sm font-bold shadow-lg transition-transform active:scale-95 disabled:opacity-50"
        >
          {loading ? "Posting..." : "Post"}
        </button>
      </div>

      <div className="max-w-xl mx-auto p-4">
        
        {/* --- COMMUNITY SELECTOR --- */}
        <div className="mb-4">
          <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wide">Select Community</label>
          <div className="relative">
            {!isCustomCommunity ? (
              <select 
                className="w-full bg-white border border-gray-200 text-gray-900 text-sm font-bold rounded-xl px-4 py-3 outline-none appearance-none focus:ring-2 focus:ring-cyan-100 focus:border-cyan-300 transition shadow-sm"
                value={community}
                onChange={handleCommunityChange}
              >
                <option value="" disabled>Choose a community...</option>
                {defaultCommunities.map(c => <option key={c} value={c}>c/{c}</option>)}
                <option value="CREATE_NEW" className="text-cyan-600 font-bold">+ Create New Community</option>
              </select>
            ) : (
              <div className="flex gap-2">
                <div className="relative flex-1">
                   <span className="absolute left-4 top-3 text-gray-400 font-bold text-sm">c/</span>
                   <input 
                     type="text" 
                     placeholder="NewCommunityName" 
                     className="w-full bg-white border border-cyan-300 text-gray-900 text-sm font-bold rounded-xl pl-8 pr-4 py-3 outline-none focus:ring-2 focus:ring-cyan-100"
                     value={customCommunityName}
                     onChange={(e) => setCustomCommunityName(e.target.value.replace(/\s+/g, ''))} // No spaces allowed
                     autoFocus
                   />
                </div>
                <button onClick={() => setIsCustomCommunity(false)} className="text-xs font-bold text-gray-400 hover:text-black">Cancel</button>
              </div>
            )}
            
            {!isCustomCommunity && (
              <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-gray-500">
                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </div>
            )}
          </div>
        </div>

        {/* --- TITLE INPUT --- */}
        <div className="mb-6">
           <input 
            type="text" 
            placeholder="An interesting title..." 
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-lg font-bold text-gray-900 outline-none focus:bg-white focus:ring-2 focus:ring-cyan-100 transition"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        {/* --- TABS --- */}
        <div className="flex bg-gray-100 p-1 rounded-xl mb-6">
           <button onClick={() => setActiveTab('post')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition ${activeTab === 'post' ? 'bg-white shadow-sm text-black' : 'text-gray-500 hover:bg-gray-200'}`}>📝 Post</button>
           <button onClick={() => setActiveTab('poll')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition ${activeTab === 'poll' ? 'bg-white shadow-sm text-black' : 'text-gray-500 hover:bg-gray-200'}`}>📊 Poll</button>
        </div>

        {/* --- FLAIR / TAG SELECTOR --- */}
        <div className="mb-4">
          <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-wide">Add a Tag (Optional)</label>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide items-center">
            {/* Custom Tag Input */}
            {isCreatingFlair ? (
              <div className="flex items-center gap-2 mr-2">
                <input 
                  type="text" 
                  placeholder="TagName" 
                  className="w-24 bg-gray-50 border border-cyan-300 rounded-lg px-2 py-1 text-xs font-bold outline-none"
                  value={newFlairName}
                  onChange={(e) => setNewFlairName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateFlair()}
                  autoFocus
                />
                <button onClick={handleCreateFlair} className="bg-cyan-600 text-white px-2 py-1 rounded text-xs font-bold">✓</button>
                <button onClick={() => setIsCreatingFlair(false)} className="text-gray-400 text-xs">✕</button>
              </div>
            ) : (
              <button onClick={() => setIsCreatingFlair(true)} className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold border border-dashed border-gray-300 text-gray-400 hover:bg-gray-50 hover:text-cyan-600 transition">
               + Create
             </button>
            )}

            {/* Custom Flair Display (If selected) */}
            {selectedFlair && !defaultFlairs.find(f => f.name === selectedFlair) && (
               <button onClick={() => setSelectedFlair(null)} className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold border bg-cyan-100 text-cyan-700 border-cyan-200 ring-2 ring-offset-1 ring-cyan-200">
                  🏷️ {selectedFlair}
               </button>
            )}

            {/* Default Flairs */}
            {defaultFlairs.map((f) => (
              <button
                key={f.name}
                onClick={() => setSelectedFlair(selectedFlair === f.name ? null : f.name)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${selectedFlair === f.name ? f.color + " ring-2 ring-offset-1 ring-cyan-200" : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"}`}
              >
                {f.emoji} {f.name}
              </button>
            ))}
          </div>
        </div>

        {/* --- CONTENT AREA --- */}
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
