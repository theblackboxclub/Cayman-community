"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db, auth, storage } from '../../firebase'; 
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'; 

export default function CreatePost() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  
  const [community, setCommunity] = useState('General');
  const [isCustomCommunity, setIsCustomCommunity] = useState(false);
  const [customCommunityName, setCustomCommunityName] = useState('');

  const [mediaType, setMediaType] = useState('none'); 
  const [mediaUrl, setMediaUrl] = useState('');     
  const [imageFile, setImageFile] = useState(null); 
  
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [username, setUsername] = useState('Loading...'); 

  const communities = [
    "General", "CaymanFitness", "IslandJobs", 
    "AskLocals", "Events", "RealEstate"
  ];

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
            setUsername(snap.data().username);
          } else {
             setUsername(currentUser.email.split('@')[0]);
          }
        } catch (error) {
          console.error("Error fetching name:", error);
        }
      }
    });
    return () => unsubscribe();
  }, [router]);

  const handleCommunityChange = (e) => {
    const val = e.target.value;
    if (val === 'create_new') {
      setIsCustomCommunity(true);
      setCommunity('');
    } else {
      setIsCustomCommunity(false);
      setCommunity(val);
    }
  };

  const handlePost = async () => {
    if (!title) return alert("Please enter a title!");
    
    let finalCommunity = community;
    if (isCustomCommunity) {
      finalCommunity = customCommunityName.trim();
      if (finalCommunity.length < 3) return alert("Please enter a valid community name.");
    }

    setLoading(true);

    let finalMediaUrl = mediaUrl; 
    try {
      if (mediaType === 'image' && imageFile) {
        const uniqueFileName = `posts/${Date.now()}-${imageFile.name}`;
        const storageRef = ref(storage, uniqueFileName);
        const snapshot = await uploadBytes(storageRef, imageFile);
        finalMediaUrl = await getDownloadURL(snapshot.ref);
      }

      await addDoc(collection(db, "posts"), {
        title: title,
        body: body,
        community: finalCommunity, 
        author: username, 
        userId: user.uid, 
        votes: 0, 
        likedBy: [], 
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
    <div className="min-h-screen bg-gradient-to-b from-cyan-50 to-white pb-20">
      
      {/* Header */}
      <div className="flex justify-between items-center px-4 py-3 border-b border-gray-100 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <button onClick={() => router.back()} className="text-gray-500 font-bold text-sm">Cancel</button>
        <h1 className="font-bold text-lg text-gray-900">Create Post</h1>
        <button 
          onClick={handlePost} 
          disabled={loading} 
          className={`bg-cyan-600 text-white px-5 py-1.5 rounded-full font-bold text-sm shadow-md transition ${loading ? "opacity-50" : "hover:bg-cyan-700"}`}
        >
          {loading ? "Posting..." : "Post"}
        </button>
      </div>

      <div className="p-4 flex flex-col gap-4 max-w-2xl mx-auto mt-2">
        
        {/* Identity Card */}
        <div className="flex items-center justify-between p-4 rounded-2xl bg-white border border-gray-100 shadow-sm">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-0.5">Posting As</span>
            <span className="text-sm font-black text-gray-900">{username}</span>
          </div>
          
          <div className="relative">
            {!isCustomCommunity ? (
              <div className="relative">
                <select 
                  onChange={handleCommunityChange} 
                  className="appearance-none bg-gray-50 border border-gray-200 text-gray-700 py-2 pl-3 pr-8 rounded-lg font-bold text-xs outline-none focus:ring-2 focus:ring-cyan-100"
                >
                  {communities.map((c) => <option key={c} value={c}>{c}</option>)}
                  <option value="create_new">+ Create New</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                 <input 
                   type="text" 
                   className="w-32 bg-white border border-cyan-500 text-gray-900 py-1.5 px-3 rounded-lg font-bold text-xs outline-none"
                   value={customCommunityName}
                   onChange={(e) => setCustomCommunityName(e.target.value)}
                   placeholder="Community Name"
                   autoFocus
                 />
                 <button 
                   onClick={() => setIsCustomCommunity(false)}
                   className="text-gray-400 hover:text-red-500"
                 >
                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                 </button>
              </div>
            )}
          </div>
        </div>

        <input 
          type="text" 
          placeholder="An interesting title..." 
          className="text-xl font-bold placeholder-gray-300 outline-none w-full bg-transparent px-2" 
          value={title} 
          onChange={(e) => setTitle(e.target.value)} 
        />

        <textarea 
          placeholder="What's happening in Cayman?" 
          className="w-full h-40 text-base placeholder-gray-300 outline-none resize-none bg-transparent px-2 leading-relaxed" 
          value={body} 
          onChange={(e) => setBody(e.target.value)} 
        />

        <div className="border-t border-gray-100 pt-4">
          <div className="flex gap-3 mb-4">
            <button onClick={() => setMediaType('image')} className={`flex items-center gap-1 text-xs font-bold px-3 py-2 rounded-full transition ${mediaType === 'image' ? 'bg-black text-white' : 'bg-gray-100 text-gray-500'}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              Photo
            </button>
            <button onClick={() => setMediaType('link')} className={`flex items-center gap-1 text-xs font-bold px-3 py-2 rounded-full transition ${mediaType === 'link' ? 'bg-black text-white' : 'bg-gray-100 text-gray-500'}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
              Link
            </button>
            {mediaType !== 'none' && (
              <button onClick={() => {setMediaType('none'); setMediaUrl(''); setImageFile(null);}} className="text-xs font-bold px-3 py-2 text-gray-400 hover:text-red-500 ml-auto">
                Remove
              </button>
            )}
          </div>

          {mediaType === 'image' && (
            <div className="bg-white p-6 rounded-2xl border-2 border-dashed border-gray-200 text-center hover:border-cyan-400 transition">
              <input 
                type="file" 
                accept="image/*"
                onChange={(e) => setImageFile(e.target.files[0])}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-cyan-50 file:text-cyan-700 hover:file:bg-cyan-100 cursor-pointer"
              />
              {imageFile && <p className="text-xs text-cyan-600 mt-3 font-bold">Selected: {imageFile.name}</p>}
            </div>
          )}

          {mediaType === 'link' && (
            <input 
              type="text" 
              placeholder="Paste Website Link (e.g. https://google.com)"
              className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm outline-none focus:border-cyan-500 transition"
              value={mediaUrl}
              onChange={(e) => setMediaUrl(e.target.value)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
