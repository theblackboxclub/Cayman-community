"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db, auth } from '../../firebase'; 
import { onAuthStateChanged } from 'firebase/auth';
import { 
  doc, getDoc, updateDoc, collection, query, where, getDocs, limit 
} from 'firebase/firestore';

// --- MEGA VIBES LIST (No Icons) ---
const VIBES = [
  // Tech & Biz
  { id: "tech", label: "Tech & Coding", color: "bg-blue-100 text-blue-700" },
  { id: "crypto", label: "Crypto & Stocks", color: "bg-yellow-100 text-yellow-700" },
  { id: "business", label: "Business/Entrepreneur", color: "bg-gray-100 text-gray-700" },
  { id: "realestate", label: "Real Estate", color: "bg-emerald-100 text-emerald-700" },
  
  // Island Life
  { id: "beach", label: "Beach Bum", color: "bg-cyan-100 text-cyan-700" },
  { id: "boating", label: "Boating", color: "bg-blue-50 text-blue-600" },
  { id: "diving", label: "Diving/Snorkel", color: "bg-indigo-100 text-indigo-700" },
  { id: "fishing", label: "Fishing", color: "bg-teal-100 text-teal-700" },
  
  // Lifestyle
  { id: "gym", label: "Gym & Fitness", color: "bg-orange-100 text-orange-700" },
  { id: "yoga", label: "Yoga & Wellness", color: "bg-rose-100 text-rose-700" },
  { id: "foodie", label: "Foodie", color: "bg-red-100 text-red-700" },
  { id: "party", label: "Nightlife", color: "bg-purple-100 text-purple-700" },
  { id: "420", label: "420 Friendly", color: "bg-green-100 text-green-700" },
  
  // Hobbies
  { id: "gaming", label: "Gaming", color: "bg-indigo-50 text-indigo-600" },
  { id: "cars", label: "Car Enthusiast", color: "bg-red-50 text-red-600" },
  { id: "photography", label: "Photography", color: "bg-gray-200 text-gray-800" },
  { id: "art", label: "Art & Design", color: "bg-pink-100 text-pink-700" },
  { id: "music", label: "Music Lover", color: "bg-violet-100 text-violet-700" },
  { id: "pets", label: "Pet Lover", color: "bg-amber-100 text-amber-700" },
  { id: "travel", label: "Travel", color: "bg-sky-100 text-sky-700" },
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
    // BLUE & SANDY THEME 🌊🏖️
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
                    className={`px-3 py-3 rounded-xl border text-xs font-bold transition-all text-center ${isSelected ? 'border-cyan-500 bg-cyan-50 ring-2 ring-cyan-200 ring-offset-1 shadow-sm text-cyan-900' : 'border-gray-100 bg-gray-50/50 text-gray-500 hover:bg-gray-100'}`}
                  >
                    {v.label}
                  </button>
                )
              })}
            </div>
            
            <div className="sticky bottom-4">
               <button onClick={saveVibes} className="w-full bg-black text-white py-3 rounded-xl font-bold text-sm shadow-xl hover:scale-[1.02] transition transform active:scale-95">
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
                          
                          {/* Shared Vibe Chips (No Icons) */}
                          <div className="flex flex-wrap gap-1 mt-1.5 max-w-[160px]">
                             {match.commonVibes.slice(0,3).map(vid => {
                               const vConfig = VIBES.find(v => v.id === vid);
                               return (
                                 <span key={vid} className="text-[10px] font-bold bg-gray-100 text-gray-600 px-2 py-1 rounded-md border border-gray-200">
                                   {vConfig?.label}
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
