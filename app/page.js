"use client";
import React, { useState } from 'react';

export default function Home() {
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
      imageColor: "bg-blue-100"
    }
  ]);

  return (
    <div className="min-h-screen bg-[#DAE0E6] pb-20">
      {/* Top Nav */}
      <div className="bg-white px-4 py-2 flex items-center justify-between sticky top-0 z-50 shadow-sm">
        <div className="font-bold text-xl">CaymanCircle 🌴</div>
        <div className="w-8 h-8 bg-green-500 rounded-full border-2 border-white shadow-sm"></div>
      </div>

      {/* Feed */}
      <div className="max-w-md mx-auto md:max-w-2xl mt-4">
        {posts.map((post) => (
          <div key={post.id} className="bg-white mb-2 md:rounded-md border-b md:border border-gray-200 p-4">
            <div className="flex items-center text-xs text-gray-500 mb-2">
              <span className="font-bold text-gray-900 mr-1">{post.community}</span>
              <span>• u/{post.author} • {post.time}</span>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">{post.title}</h3>
            <p className="text-sm text-gray-500 line-clamp-3">{post.body}</p>
          </div>
        ))}
      </div>

      {/* Bottom Nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-3 flex justify-between items-center z-50">
        <span className="text-xs font-bold text-blue-500">Home</span>
        
        {/* THE LINK TO THE CREATE PAGE */}
        <a href="/create" className="flex flex-col items-center -mt-8">
          <div className="bg-black text-white p-4 rounded-full shadow-lg transform hover:scale-105 transition">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          </div>
        </a>

        <span className="text-xs text-gray-400">Chat</span>
      </div>
    </div>
  );
}
