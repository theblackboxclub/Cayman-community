"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db, auth } from '../../firebase'; 
import { onAuthStateChanged } from 'firebase/auth';
import { 
  collection, query, orderBy, limit, getDocs, where 
} from 'firebase/firestore';
import Link from 'next/link';

export default function Explore() {
  const router = useRouter();
  const [trendingPosts, setTrendingPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  // Hardcoded Categories
  const communities = [
    { name: "c/General", desc: "Anything and everything Cayman." },
    { name: "c/CaymanFitness", desc: "Gyms, runs, and healthy living." },
    { name: "c/IslandJobs", desc: "Who is hiring? Work permits & advice." },
    { name: "c/AskLocals", desc: "Questions for the people who live here." },
    { name: "c/Events", desc: "What is happening this weekend?" },
    { name: "c/RealEstate", desc: "Rentals, sales, and housing chat." }
  ];

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    // Fetch Trending Posts (Ordered by Votes)
    const fetchTrending = async () => {
      try {
        const q = query(
          collection(db, "posts"), 
          orderBy("votes", "desc"), 
          limit(5)
        );
        const snapshot = await getDocs(q);
        const posts = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setTrendingPosts(posts);
      } catch (error) {
        console.error("Error fetching trending:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTrending();
    return () => unsubscribe();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      
      {/* Header */}
      <div className="bg-white px-4 py-3 border-b border-gray-200 sticky top-0 z-10">
         <h1 className="font-bold text-lg text-gray-900">Explore</h1>
      </div>

      <div className="max-w-md mx-auto px-4 pt-6">
        
        {/* Search Bar (Visual Only for now) */}
        <div className="relative mb-8">
          <input 
            type="text" 
            placeholder="Search communities or posts..." 
            className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-black focus:border-black block p-3 pl-10 outline-none"
          />
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </div>
        </div>

        {/* Communities Grid */}
        <div className="mb-8">
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Communities</h2>
          <div className="grid grid-cols-1 gap-3">
            {communities.map((c) => (
              <div 
                key={c.name} 
                onClick={() => router.push('/')} // Ideally this would filter the Home page later
                className="bg-white p-4 rounded-lg border border-gray-200 flex items-center justify-between cursor-pointer hover:border-black transition"
              >
                <div>
                  <h3 className="font-bold text-gray-900">{c.name}</h3>
                  <p className="text-xs text-gray-500">{c.desc}</p>
                </div>
                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Trending Posts */}
        <div>
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Trending Now</h2>
          <div className="space-y-3">
            {loading ? (
              <div className="text-center text-gray-400 text-sm">Loading trends...</div>
            ) : trendingPosts.length === 0 ? (
              <div className="text-center text-gray-400 text-sm">No trending posts yet.</div>
            ) : (
              trendingPosts.map(post => (
                <div key={post.id} onClick={() => router.push(`/post/${post.id}`)} className="bg-white p-4 rounded-lg border border-gray-200 cursor-pointer shadow-sm">
                  <div className="flex items-center gap-2 mb-1">
                     <span className="text-[10px] font-bold text-gray-500">{post.community}</span>
                     <span className="text-[10px] text-gray-300">•</span>
                     <span className="text-[10px] font-bold text-gray-400">u/{post.author}</span>
                  </div>
                  <h3 className="font-bold text-sm text-gray-900 line-clamp-2">{post.title}</h3>
                  <div className="flex items-center gap-3 mt-2">
                    <div className="flex items-center gap-1 text-red-500">
                       <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" /></svg>
                       <span className="text-xs font-bold">{post.votes || 0}</span>
                    </div>
                    <div className="flex items-center gap-1 text-gray-400">
                       <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                       <span className="text-xs font-bold">{post.comments || 0}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Bottom Nav (Explore Active) */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-3 flex justify-between items-center z-50">
        <Link href="/" className="flex flex-col items-center text-gray-400 hover:text-black">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
          <span className="text-[10px] mt-1">Home</span>
        </Link>
        <div className="flex flex-col items-center text-black cursor-pointer">
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
          <span className="text-[10px] mt-1 font-bold">Explore</span>
        </div>
        <Link href="/create" className="flex flex-col items-center -mt-6">
          <div className="bg-black text-white p-3 rounded-full shadow-lg hover:bg-gray-800 transition">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          </div>
          <span className="text-[10px] font-bold mt-1 text-gray-400">Create</span>
        </Link>
        <div className="flex flex-col items-center text-gray-400 cursor-not-allowed opacity-50">
           <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
           <span className="text-[10px] mt-1">Chat</span>
        </div>
        <Link href="/messages" className="flex flex-col items-center text-gray-400 hover:text-black">
           <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
           <span className="text-[10px] mt-1">Inbox</span>
        </Link>
      </div>
    </div>
  );
}
