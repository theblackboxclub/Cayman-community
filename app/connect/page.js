"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db, auth } from '../../firebase'; 
import { onAuthStateChanged } from 'firebase/auth';
import { 
  doc, getDoc, updateDoc, collection, query, where, getDocs, limit 
} from 'firebase/firestore';

// --- PROFESSIONAL ICONS (SVG PATHS) ---
const ICONS = {
  tech: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />,
  crypto: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />,
  business: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />,
  realestate: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />,
  beach: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />,
  boating: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.5 10.5V6.75a4.5 4.5 0 119 0v3.75M3.75 21.75h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H3.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />, // Simplified anchor/boat logic
  diving: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9" />,
  fishing: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />, // Hook shape approx
  gym: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />,
  yoga: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />, // Heart/Balance
  foodie: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />, // Cart/Food
  party: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />,
  "420": <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />, // Leaf/Star
  gaming: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2a2 2 0 002 2 3 3 0 013 3v2a3 3 0 01-3 3 2 2 0 00-2 2v2M9 5v2a2 2 0 01-2 2 3 3 0 00-3 3v2a3 3 0 003 3 2 2 0 012 2v2" />, // Controller-ish
  cars: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />, // Speed/Traffic
  photography: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />,
  art: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />,
  music: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />,
  pets: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />, // Face
  travel: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />,
};

// --- DATA LIST ---
const VIBES = [
  // Tech & Biz
  { id: "tech", label: "Tech & Coding", color: "bg-blue-50 text-blue-700 border-blue-200" },
  { id: "crypto", label: "Crypto & Stocks", color: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  { id: "business", label: "Business", color: "bg-gray-50 text-gray-700 border-gray-200" },
  { id: "realestate", label: "Real Estate", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  // Island
  { id: "beach", label: "Beach Bum", color: "bg-cyan-50 text-cyan-700 border-cyan-200" },
  { id: "boating", label: "Boating", color: "bg-blue-50 text-blue-600 border-blue-200" },
  { id: "diving", label: "Diving", color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  { id: "fishing", label: "Fishing", color: "bg-teal-50 text-teal-700 border-teal-200" },
  // Lifestyle
  { id: "gym", label: "Gym & Fitness", color: "bg-orange-50 text-orange-700 border-orange-200" },
  { id: "yoga", label: "Yoga & Wellness", color: "bg-rose-50 text-rose-700 border-rose-200" },
  { id: "foodie", label: "Foodie", color: "bg-red-50 text-red-700 border-red-200" },
  { id: "party", label: "Nightlife", color: "bg-purple-50 text-purple-700 border-purple-200" },
  { id: "420", label: "420 Friendly", color: "bg-green-50 text-green-700 border-green-200" },
  // Hobbies
  { id: "gaming", label: "Gaming", color: "bg-indigo-50 text-indigo-600 border-indigo-200" },
  { id: "cars", label: "Cars", color: "bg-red-50 text-red-600 border-red-200" },
  { id: "photography", label: "Photography", color: "bg-gray-100 text-gray-800 border-gray-300" },
  { id: "art", label: "Art & Design", color: "bg-pink-50 text-pink-700 border-pink-200" },
  { id: "music", label: "Music", color: "bg-violet-50 text-violet-700 border-violet-200" },
  { id: "pets", label: "Pets", color: "bg-amber-50 text-amber-700 border-amber-200" },
  { id: "travel", label: "Travel", color: "bg-sky-50 text-sky-700 border-sky-200" },
];

export default function ConnectPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [myVibes, setMyVibes] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  // 1. Load Data
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (!u) return router.push('/signup');
      setUser(u);

      const userRef = doc(db, "users", u.uid);
      const snap = await getDoc(userRef);
      
      if (snap.exists() && snap.data().vibes) {
        setMyVibes(snap.data().vibes);
        fetchMatches(snap.data().vibes, u.uid);
      } else {
        setIsEditing(true); 
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // 2. Logic: Limit to 5
  const toggleVibe = (vibeId) => {
    if (myVibes.includes(vibeId)) {
      setMyVibes(myVibes.filter(id => id !== vibeId));
    } else {
      if (myVibes.length >= 5) return alert("You can only pick your top 5 interests!");
      setMyVibes([...myVibes, vibeId]);
    }
  };

  const saveVibes = async () => {
    if (myVibes.length === 0) return alert("Pick at least 1 vibe!");
    setLoading(true);
    
    const userRef = doc(db, "users", user.uid);
    await updateDoc(userRef, { vibes: myVibes });
    
    setIsEditing(false);
    fetchMatches(myVibes, user.uid);
  };

  const fetchMatches = async (vibes, currentUid) => {
    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("vibes", "array-contains-any", vibes), limit(20));
      const snap = await getDocs(q);
      
      const foundUsers = snap.docs
        .map(doc => {
          const data = doc.data();
          const common = data.vibes ? data.vibes.filter(v => vibes.includes(v)) : [];
          return { id: doc.id, ...data, score: common.length, commonVibes: common };
        })
        .filter(u => u.id !== currentUid) 
        .sort((a, b) => b.score - a.score); 

      setMatches(foundUsers);
    } catch (error) {
      console.error("Error finding matches:", error);
    } finally {
      setLoading(false);
    }
  };

  const startChat = async (targetUser) => {
     router.push(`/user/${targetUser.username}`);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400 font-bold">Finding your tribe...</div>;

  return (
    <div className="min-h-screen bg-gradient-to-b from-cyan-50 to-orange-50/40 pb-24">
      
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-md px-6 py-4 sticky top-0 z-50 border-b border-white/50 flex justify-between items-center shadow-sm">
        <h1 className="font-black text-xl text-cyan-900 tracking-tight">Connect</h1>
        {!isEditing && (
          <button onClick={() => setIsEditing(true)} className="text-xs font-bold text-cyan-700 bg-cyan-100 px-3 py-1.5 rounded-full hover:bg-cyan-200 transition">
            Edit Interests
          </button>
        )}
      </div>

      <div className="max-w-md mx-auto p-4">
        
        {isEditing ? (
          /* --- SELECTION SCREEN --- */
          <div className="bg-white/90 p-6 rounded-3xl shadow-lg border border-white animate-fade-in">
            <h2 className="text-lg font-black text-gray-800 mb-1">What are you into?</h2>
            <p className="text-sm text-gray-500 mb-6 font-medium">Select up to 5 tags to find likeminded locals.</p>
            
            <div className="grid grid-cols-2 gap-3 mb-6">
              {VIBES.map(v => {
                const isSelected = myVibes.includes(v.id);
                return (
                  <button 
                    key={v.id} 
                    onClick={() => toggleVibe(v.id)} 
                    className={`flex items-center gap-3 px-3 py-3 rounded-xl border text-xs font-bold transition-all ${isSelected ? 'border-cyan-500 bg-cyan-50 ring-2 ring-cyan-200 ring-offset-1 shadow-sm text-cyan-900' : 'border-gray-100 bg-white text-gray-500 hover:bg-gray-50'}`}
                  >
                    <svg className={`w-5 h-5 ${isSelected ? 'text-cyan-600' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      {ICONS[v.id]}
                    </svg>
                    <span>{v.label}</span>
                  </button>
                )
              })}
            </div>
            
            <div className="sticky bottom-4">
               <button onClick={saveVibes} className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 text-white py-3 rounded-xl font-bold text-sm shadow-xl hover:scale-[1.02] transition transform active:scale-95">
                 Find Matches
               </button>
            </div>
          </div>
        ) : (
          /* --- RESULTS SCREEN --- */
          <div className="space-y-4">
            
            {/* Explainer Banner */}
            {matches.length > 0 && (
              <div className="bg-cyan-100/50 border border-cyan-100 rounded-2xl p-4 text-center mb-6">
                 <h2 className="text-sm font-black text-cyan-900 uppercase tracking-wide mb-1">Your Vibe Tribe</h2>
                 <p className="text-xs text-cyan-700 font-bold">These people share the same interests as you.</p>
              </div>
            )}

            {matches.length === 0 ? (
               <div className="text-center py-20 text-gray-400">
                  <div className="flex justify-center mb-4 text-gray-300">
                    <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <p className="font-black text-gray-600 text-lg mb-2">No matches found yet.</p>
                  <p className="text-sm font-medium">Try changing your vibes to find more people!</p>
               </div>
            ) : (
               matches.map(match => (
                 <div key={match.id} className="bg-white p-4 rounded-3xl shadow-sm border border-orange-50/50 flex items-center justify-between hover:shadow-md transition hover:scale-[1.01] cursor-default">
                    <div className="flex items-center gap-4">
                       <div className="w-14 h-14 rounded-full bg-gray-100 overflow-hidden border-2 border-white shadow-sm">
                          {match.profilePic ? (
                            <img src={match.profilePic} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-cyan-50 text-cyan-600 font-black text-xl">
                              {match.username?.[0]?.toUpperCase()}
                            </div>
                          )}
                       </div>
                       
                       <div>
                          <h3 className="font-black text-gray-900 text-base">{match.username}</h3>
                          
                          {/* Shared Vibe Chips (Professional) */}
                          <div className="flex flex-wrap gap-1 mt-1.5 max-w-[160px]">
                             {match.commonVibes.slice(0,3).map(vid => {
                               const vConfig = VIBES.find(v => v.id === vid);
                               return (
                                 <span key={vid} className={`text-[10px] font-bold px-2 py-1 rounded-md border flex items-center gap-1 ${vConfig?.color || 'bg-gray-100'}`}>
                                   <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">{ICONS[vid]}</svg>
                                   {vConfig?.label.split(' ')[0]}
                                 </span>
                               )
                             })}
                             {match.commonVibes.length > 3 && (
                               <span className="text-[10px] font-bold text-gray-400 py-1">+{match.commonVibes.length - 3}</span>
                             )}
                          </div>
                       </div>
                    </div>
                    
                    {/* Action */}
                    <button 
                      onClick={() => startChat(match)}
                      className="bg-black text-white p-3 rounded-2xl shadow-lg hover:bg-gray-800 hover:scale-110 transition active:scale-90"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                    </button>
                 </div>
               ))
            )}
          </div>
        )}
      </div>
      
      {/* Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-gray-100 px-6 py-3 flex justify-between items-center z-50">
        <button onClick={() => router.push('/')} className="flex flex-col items-center text-gray-400 hover:text-black"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg><span className="text-[10px] mt-1">Home</span></button>
        <button onClick={() => router.push('/connect')} className="flex flex-col items-center text-black"><svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z" /></svg><span className="text-[10px] font-bold mt-1">Connect</span></button>
        <button onClick={() => router.push('/create')} className="flex flex-col items-center -mt-6"><div className="bg-black text-white p-3 rounded-full shadow-lg hover:bg-gray-800 hover:scale-105 transition"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg></div><span className="text-[10px] font-bold mt-1 text-gray-400">Create</span></button>
        <button onClick={() => router.push('/chat')} className="flex flex-col items-center text-gray-400 hover:text-black"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg><span className="text-[10px] mt-1">Chat</span></button>
        <button onClick={() => router.push('/messages')} className="flex flex-col items-center text-gray-400 hover:text-black"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg><span className="text-[10px] mt-1">Inbox</span></button>
      </div>
    </div>
  );
}
