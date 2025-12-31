"use client";
import React, { useState } from 'react';

export default function Home() {
  // Real "App-like" data with images and avatars
  const [posts, setPosts] = useState([
    {
      id: 1,
      community: "c/CaymanFitness",
      author: "gym_rat_ky",
      time: "4h",
      title: "Best gym for weightlifting in George Town?",
      body: "I'm moving to GT next week. Looking for a place with squat racks that isn't too crowded at 5pm.",
      votes: 12,
      comments: 4,
      hasImage: false
    },
    {
      id: 2,
      community: "c/IslandJobs",
      author: "recruiter_jane",
      time: "1d",
      title: "[Hiring] Junior Developer at Tech City",
      body: "We are looking for someone who knows React and Next.js. PM me for details!",
      votes: 45,
      comments: 18,
      hasImage: true, 
      imageColor: "bg-blue-100" // Fake placeholder image
    },
    {
      id: 3,
      community: "c/Stocks",
      author: "investor_bro",
      time: "10h",
      title: "Total market fund has underperformed S&P 500",
      body: "When I began investing 10 years ago, many recommended a total market fund...",
      votes: 109,
      comments: 81,
      hasImage: false
    }
  ]);

  return (
    <div className="min-h-screen bg-[#DAE0E6] pb-20"> {/* Reddit Gray Background + padding for bottom nav */}

      {/* --- TOP NAVIGATION BAR --- */}
      <div className="bg-white px-4 py-2 flex items-center justify-between sticky top-0 z-50 shadow-sm">
        {/* Menu Icon */}
        <button className="p-2">
          <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>
        
        {/* Search Bar */}
        <div className="flex-1 mx-3 bg-gray-100 rounded-full px-4 py-2 flex items-center">
          <svg className="w-5 h-5 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input type="text" placeholder="Find anything" className="bg-transparent outline-none text-sm w-full placeholder-gray-500" />
        </div>

        {/* User Avatar */}
        <div className="w-8 h-8 bg-green-500 rounded-full border-2 border-white shadow-sm"></div>
      </div>

      {/* --- FEED --- */}
      <div className="max-w-md mx-auto md:max-w-2xl md:mt-4">
        {posts.map((post) => (
          <div key={post.id} className="bg-white mb-2 md:rounded-md border-b md:border border-gray-200">
            
            {/* Post Header */}
            <div className="px-4 pt-3 flex items-center text-xs text-gray-500 mb-2">
              {/* Community Icon */}
              <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center font-bold mr-2 text-sm">
                {post.community.charAt(2)}
              </div>
              <div className="flex flex-col">
                <div className="flex items-center">
                  <span className="font-bold text-gray-900 mr-1">{post.community}</span>
                  <span className="text-gray-400">• {post.time}</span>
                </div>
                <div className="text-gray-500">u/{post.author}</div>
              </div>
              <button className="ml-auto bg-blue-600 text-white px-3 py-1 rounded-full font-bold text-xs">Join</button>
            </div>

            {/* Post Content */}
            <div className="px-4 pb-2">
              <h3 className="text-lg font-bold text-gray-900 leading-snug mb-2">{post.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed mb-3 line-clamp-3">{post.body}</p>
            </div>

            {/* Fake Image (if post has one) */}
            {post.hasImage && (
              <div className={`w-full h-48 ${post.imageColor} flex items-center justify-center text-blue-500 font-bold mb-2`}>
                [ Image Placeholder ]
              </div>
            )}

            {/* Post Footer (Action Bar) */}
            <div className="px-4 py-2 flex items-center justify-between border-t border-gray-50">
              
              {/* Vote Buttons (Pill Shape) */}
              <div className="flex items-center bg-gray-100 rounded-full px-2 py-1">
                <button className="p-1 hover:bg-gray-200 rounded-full">
                   <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                </button>
                <span className="text-sm font-bold text-gray-700 mx-2">{post.votes}</span>
                <button className="p-1 hover:bg-gray-200 rounded-full">
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </button>
              </div>

              {/* Comment Button */}
              <div className="flex items-center bg-gray-100 rounded-full px-3 py-1 space-x-2">
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg>
                <span className="text-sm font-bold text-gray-700">{post.comments}</span>
              </div>

              {/* Share Button */}
              <div className="flex items-center bg-gray-100 rounded-full px-3 py-1 space-x-2">
                 <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                 <span className="text-sm font-bold text-gray-700">Share</span>
              </div>

            </div>
          </div>
        ))}
      </div>

      {/* --- BOTTOM NAVIGATION BAR (Fixed) --- */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-3 flex justify-between items-center z-50">
        <div className="flex flex-col items-center">
          <svg className="w-6 h-6 text-black" fill="currentColor" viewBox="0 0 20 20"><path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" /></svg>
          <span className="text-[10px] font-bold mt-1">Home</span>
        </div>
        <div className="flex flex-col items-center text-gray-400">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" /></svg>
          <span className="text-[10px] mt-1">Communities</span>
        </div>
        
        {/* CREATE BUTTON (Big Plus) */}
        <div className="flex flex-col items-center -mt-6">
          <div className="bg-black text-white p-3 rounded-full shadow-lg">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          </div>
          <span className="text-[10px] font-bold mt-1 text-gray-400">Create</span>
        </div>

        <div className="flex flex-col items-center text-gray-400">
           <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
           <span className="text-[10px] mt-1">Chat</span>
        </div>
        <div className="flex flex-col items-center text-gray-400">
           <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
           <span className="text-[10px] mt-1">Inbox</span>
        </div>
      </div>

    </div>
  );
}
