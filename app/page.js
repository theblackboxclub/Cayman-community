"use client";
import React, { useState } from 'react';

export default function Home() {
  const [posts, setPosts] = useState([
    {
      id: 1,
      community: "c/CaymanFitness",
      author: "gym_rat_ky",
      title: "Best gym for weightlifting in George Town?",
      body: "I'm moving to GT next week. Looking for a place with squat racks that isn't too crowded at 5pm.",
      votes: 12,
      comments: 4
    },
    {
      id: 2,
      community: "c/IslandJobs",
      author: "recruiter_jane",
      title: "[Hiring] Junior Developer at Tech City",
      body: "We are looking for someone who knows React and Next.js. PM me for details!",
      votes: 45,
      comments: 18
    }
  ]);

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      {/* Container */}
      <div className="max-w-5xl mx-auto flex gap-6">
        
        {/* SIDEBAR (Hidden on mobile, visible on desktop) */}
        <div className="hidden md:block w-64 flex-shrink-0">
          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
            <h3 className="font-bold text-gray-500 text-xs uppercase tracking-wider mb-3">Communities</h3>
            <div className="space-y-2">
              <a href="#" className="block p-2 rounded hover:bg-blue-50 text-gray-700 font-medium hover:text-blue-600 transition">🏋️ c/CaymanFitness</a>
              <a href="#" className="block p-2 rounded hover:bg-blue-50 text-gray-700 font-medium hover:text-blue-600 transition">💼 c/IslandJobs</a>
              <a href="#" className="block p-2 rounded hover:bg-blue-50 text-gray-700 font-medium hover:text-blue-600 transition">🌴 c/AskLocals</a>
            </div>
            <button className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-full transition shadow-md">
              Create Post
            </button>
          </div>
        </div>

        {/* FEED */}
        <div className="flex-1 space-y-4">
          {posts.map((post) => (
            <div key={post.id} className="bg-white border border-gray-200 rounded-md hover:border-gray-400 cursor-pointer flex transition shadow-sm">
              
              {/* Vote Column */}
              <div className="w-10 bg-gray-50 p-2 flex flex-col items-center border-r border-gray-100 rounded-l-md">
                <button className="text-gray-400 hover:text-orange-500 text-xl font-bold">▲</button>
                <span className="text-xs font-bold my-1">{post.votes}</span>
                <button className="text-gray-400 hover:text-blue-500 text-xl font-bold">▼</button>
              </div>

              {/* Content */}
              <div className="p-3 flex-1">
                <div className="flex items-center text-xs text-gray-500 mb-1">
                  <span className="font-bold text-black mr-2 hover:underline">{post.community}</span>
                  <span>• Posted by u/{post.author}</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">{post.title}</h3>
                <p className="text-sm text-gray-600 mb-3">{post.body}</p>
                <div className="flex gap-4 text-xs font-bold text-gray-500">
                  <span className="hover:bg-gray-100 p-1 rounded">💬 {post.comments} Comments</span>
                  <span className="hover:bg-gray-100 p-1 rounded">🎁 Award</span>
                  <span className="hover:bg-gray-100 p-1 rounded">↪ Share</span>
                </div>
              </div>

            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
