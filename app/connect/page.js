"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db, auth } from '../../firebase'; 
import { onAuthStateChanged } from 'firebase/auth';
import { 
  doc, getDoc, updateDoc, collection, query, where, getDocs, limit 
} from 'firebase/firestore';

// --- CONFIGURATION ---
const VIBES = [
  { id: "tech", label: "Tech & Coding", icon: "💻", color: "bg-blue-100 text-blue-700" },
  { id: "gym", label: "Gym & Fitness", icon: "🏋️", color: "bg-orange-100 text-orange-700" },
  { id: "crypto", label: "Crypto", icon: "₿", color: "bg-yellow-100 text-yellow-700" },
  { id: "foodie", label: "Foodie", icon: "🌮", color: "bg-red-100 text-red-700" },
  { id: "party", label: "Nightlife", icon: "🥂", color: "bg-purple-100 text-purple-700" },
  { id: "beach", label: "Beach Bum", icon: "🏖️", color: "bg-cyan-100 text-cyan-700" },
  { id: "gaming", label: "Gaming", icon: "🎮", color: "bg-indigo-100 text-indigo-700" },
  { id: "business", label: "Business", icon: "💼", color: "bg-gray-100 text-gray-700" },
];

export default function ConnectPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [myVibes, setMyVibes] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  // 1. Load User & Their Vibes
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
        setIsEditing(true); // Force them to pick vibes if they have none
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // 2. toggle a vibe selection
  const toggleVibe = (vibeId) => {
    if (myVibes.includes(vibeId)) {
      setMyVibes(myVibes.filter(id => id !== vibeId));
    } else {
      if (myVibes.length >= 5) return alert("Pick your top 5!");
      setMyVibes([...myVibes, vibeId]);
    }
  };

  // 3. Save Vibes & Find Matches
  const saveVibes = async () => {
    if (myVibes.length === 0) return alert("Pick at least 1 vibe!");
    setLoading(true);
    
    // Save to Firestore
    const userRef = doc(db, "users", user.uid);
    await updateDoc(userRef, { vibes: myVibes });
    
    setIsEditing(false);
    fetchMatches(myVibes, user.uid);
  };

  // 4. Algorithm to Find Matches
  const fetchMatches = async (vibes, currentUid) => {
    try {
      // Logic: Find users who have at least one matching vibe
      // Note: Firestore "array-contains-any" is limited to 10 items, which is fine here.
      const usersRef = collection(db, "users");
      const q = query(
        usersRef, 
        where("vibes", "array-contains-any", vibes),
        limit(20) // Limit to 20 matches for now
      );

      const snap = await getDocs(q);
      
      const foundUsers = snap.docs
        .map(doc => {
          const data = doc.data();
          // Calculate "Vibe Score" (Intersection of arrays)
          const common = data.vibes ? data.vibes.filter(v => vibes.includes(v)) : [];
          return { id: doc.id, ...data, score: common.length, commonVibes: common };
        })
        .filter(u => u.id !== currentUid) // Remove myself
        .sort((a, b) => b.score - a.score); // Highest match first

      setMatches(foundUsers);
    } catch (error) {
      console.error("Error finding matches:", error);
    } finally {
      setLoading(false);
    }
  };

  // 5. Start a Chat
  const startChat = async (targetUser) => {
     // For now, we direct them to the profile where they can (eventually) msg
     // Or ideally, this creates a chat ID and pushes to /chat/[id]
     router.push(`/user/${targetUser.username}`);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400 font-bold">Finding your tribe...</div>;

  return (
    <div className="min-h-screen bg-gradient-to-b from-cyan-50 to-white pb-24">
      
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-md px-6 py-4 sticky top-0 z-50 border-b border-gray-100 flex justify-between items-center">
        <h1 className="font-black text-xl text-gray-900">Vibe Match ⚡</h1>
        {!isEditing && (
          <button onClick={() => setIsEditing(true)} className="text-xs font-bold text-cyan-600 bg-cyan-50 px-3 py-1.5 rounded-full">
            Edit My Vibes
          </button>
        )}
      </div>

      <div className="max-w-md mx-auto p-4">

        {/* --- EDIT MODE (Selector) --- */}
        {isEditing ? (
          <div className="bg-white p-6 rounded-3xl shadow-lg border border-gray-50 animate-fade-in">
            <h2 className="text-lg font-bold text-gray-800 mb-2">What are you into?</h2>
            <p className="text-sm text-gray-400 mb-6">Select up to 5 tags to find likeminded locals.</p>
            
            <div className="grid grid-cols-2 gap-3 mb-6">
              {VIBES.map(v => {
                const isSelected = myVibes.includes(v.id);
                return (
                  <button 
                    key={v.id}
                    onClick={() => toggleVibe(v.id)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-bold transition-all ${isSelected ? 'border-cyan-500 bg-cyan-50 ring-2 ring-cyan-200 ring-offset-1' : 'border-gray-100 bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
                  >
                    <span className="text-xl">{v.icon}</span>
                    <span className={isSelected ? 'text-cyan-900' : 'text-gray-500'}>{v.label}</span>
                  </button>
                )
              })}
            </div>

            <button onClick={saveVibes} className="w-full bg-black text-white py-3 rounded-xl font-bold text-sm shadow-lg hover:scale-[1.02] transition">
              Find Matches 🚀
            </button>
          </div>
        ) : (
          
          /* --- MATCH MODE (Grid) --- */
          <div className="space-y-4">
            {matches.length === 0 ? (
               <div className="text-center py-10 text-gray-400">
                  <div className="text-4xl mb-2">🔭</div>
                  <p className="font-bold">No matches found yet.</p>
                  <p className="text-sm">Try adding more vibes!</p>
               </div>
            ) : (
               matches.map(match => (
                 <div key={match.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition">
                    <div className="flex items-center gap-3">
                       <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden border border-gray-100">
                          {match.profilePic ? (
                            <img src={match.profilePic} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-cyan-100 text-cyan-700 font-bold text-lg">
                              {match.username?.[0]?.toUpperCase()}
                            </div>
                          )}
                       </div>
                       <div>
                          <h3 className="font-bold text-gray-900">{match.username}</h3>
                          <div className="flex gap-1 mt-1">
                             {match.commonVibes.map(vid => {
                               const vConfig = VIBES.find(v => v.id === vid);
                               return <span key={vid} title={vConfig?.label} className="text-xs bg-gray-100 px-1.5 py-0.5 rounded-md">{vConfig?.icon}</span>
                             })}
                             <span className="text-[10px] font-bold text-cyan-600 bg-cyan-50 px-2 py-0.5 rounded-full ml-1">
                               {match.score} Match
                             </span>
                          </div>
                       </div>
                    </div>
                    
                    <button 
                      onClick={() => startChat(match)}
                      className="bg-black text-white p-2 rounded-full shadow hover:scale-110 transition"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                    </button>
                 </div>
               ))
            )}
          </div>
        )}

      </div>
      
      {/* Bottom Nav (Standard) */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-gray-100 px-6 py-3 flex justify-between items-center z-50">
        <button onClick={() => router.push('/')} className="flex flex-col items-center text-gray-400 hover:text-black"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg><span className="text-[10px] mt-1">Home</span></button>
        <button onClick={() => router.push('/connect')} className="flex flex-col items-center text-black"><svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z" /></svg><span className="text-[10px] font-bold mt-1">Connect</span></button>
        <button onClick={() => router.push('/create')} className="flex flex-col items-center -mt-6"><div className="bg-black text-white p-3 rounded-full shadow-lg hover:bg-gray-800 hover:scale-105 transition"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg></div><span className="text-[10px] font-bold mt-1 text-gray-400">Create</span></button>
        <button onClick={() => router.push('/chat')} className="flex flex-col items-center text-gray-400 hover:text-black"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg><span className="text-[10px] mt-1">Chat</span></button>
        <button onClick={() => router.push('/messages')} className="flex flex-col items-center text-gray-400 hover:text-black"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg><span className="text-[10px] mt-1">Inbox</span></Link>
      </div>
    </div>
  );
}
