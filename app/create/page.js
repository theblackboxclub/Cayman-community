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
  const [community, setCommunity] = useState('c/General');
  
  const [mediaType, setMediaType] = useState('none'); 
  const [mediaUrl, setMediaUrl] = useState('');     
  const [imageFile, setImageFile] = useState(null); 
  
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  
  // This is the FIXED username state
  const [username, setUsername] = useState('Loading...'); 

  const communities = [
    "c/General", "c/CaymanFitness", "c/IslandJobs", 
    "c/AskLocals", "c/Events", "c/RealEstate"
  ];

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.push('/signup');
      } else {
        setUser(currentUser);
        // FETCH THE PERMANENT USERNAME
        const userRef = doc(db, "users", currentUser.uid);
        try {
          const snap = await getDoc(userRef);
          if (snap.exists() && snap.data().username) {
            setUsername(snap.data().username);
          } else {
             // Fallback if they signed up before this update
             setUsername(currentUser.email.split('@')[0]);
          }
        } catch (error) {
          console.error("Error fetching name:", error);
        }
      }
    });
    return () => unsubscribe();
  }, [router]);

  const handlePost = async () => {
    if (!title) return alert("Please enter a title!");
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
        community: community,
        author: username, // Uses the stored unique username
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
      <div className="flex justify-between items-center px-4 py-3 border-b border-gray-100 sticky top-0 bg-white z-10">
        <button onClick={() => router.back()} className="text-gray-500 font-bold text-sm">Cancel</button>
        <h1 className="font-bold text-lg">Create Post</h1>
        <button onClick={handlePost} disabled={loading} className={`bg-black text-white px-4 py-1.5 rounded-full font-bold text-sm ${loading ? "opacity-50" : ""}`}>
          {loading ? "Posting..." : "Post"}
        </button>
      </div>

      <div className="p-4 flex flex-col gap-4 max-w-2xl mx-auto">
        
        {/* Identity Card */}
        <div className="flex flex-col gap-3 p-4 rounded-xl border border-gray-200 bg-gray-50">
          <div className="flex justify-between items-center">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1 block">Posting As</span>
              <span className="text-xl font-black text-gray-900">u/{username}</span>
            </div>
            <div className="px-3 py-1 bg-white border border-gray-200 rounded-full text-xs font-bold text-gray-500">
               Public Identity
            </div>
          </div>
        </div>

        <div className="relative">
          <select value={community} onChange={(e) => setCommunity(e.target.value)} className="appearance-none w-full bg-white border border-gray-300 text-gray-900 py-3 px-4 rounded font-bold">
            {communities.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <input type="text" placeholder="An interesting title" className="text-2xl font-bold placeholder-gray-300 outline-none w-full" value={title} onChange={(e) => setTitle(e.target.value)} />
        <textarea placeholder="What's happening?" className="w-full h-32 text-lg placeholder-gray-300 outline-none resize-none" value={body} onChange={(e) => setBody(e.target.value)} />

        <div className="border-t border-gray-100 pt-4">
          <div className="flex gap-4 mb-2">
            <button onClick={() => setMediaType('image')} className={`text-sm font-bold px-3 py-1 rounded-full ${mediaType === 'image' ? 'bg-black text-white' : 'bg-gray-100 text-gray-500'}`}>Upload Image</button>
            <button onClick={() => setMediaType('link')} className={`text-sm font-bold px-3 py-1 rounded-full ${mediaType === 'link' ? 'bg-black text-white' : 'bg-gray-100 text-gray-500'}`}>Add Link</button>
            <button onClick={() => {setMediaType('none'); setMediaUrl(''); setImageFile(null);}} className={`text-sm font-bold px-3 py-1 rounded-full ${mediaType === 'none' ? 'bg-black text-white' : 'bg-gray-100 text-gray-500'}`}>No Media</button>
          </div>

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
