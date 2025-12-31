"use client";
import React, { useState } from 'react';

export default function Home() {
  // Dummy Data to visualize the Reddit Look
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
    },
    {
      id: 3,
      community: "c/AskLocals",
      author: "tourist_bob",
      title: "Is Seven Mile Beach actually 7 miles long?",
      body: "Honest question. I walked it and it felt shorter.",
      votes: 8,
      comments: 29
    }
  ]);

  return (
    <div className="container">
      
      {/* LEFT SIDEBAR (The Communities) */}
      <div className="sidebar">
        <div className="sidebar-card">
          <h3 style={{marginTop: 0}}>Communities</h3>
          <a href="#" className="topic-item">🏋️ c/CaymanFitness</a>
          <a href="#" className="topic-item">💼 c/IslandJobs</a>
          <a href="#" className="topic-item">🌴 c/AskLocals</a>
          <a href="#" className="topic-item">🥳 c/Events</a>
          <a href="#" className="topic-item">🗣️ c/General</a>
        </div>
        <div className="sidebar-card">
          <button style={{width: "100%", padding: "10px", background: "#0079D3", color: "white", border: "none", borderRadius: "20px", cursor: "pointer", fontWeight: "bold"}}>
            Create Post
          </button>
        </div>
      </div>

      {/* CENTER FEED */}
      <div className="feed">
        {posts.map((post) => (
          <div key={post.id} className="post-card">
            
            {/* Vote Column */}
            <div className="vote-column">
              <div className="vote-arrow">⬆</div>
              <div className="vote-count">{post.votes}</div>
              <div className="vote-arrow">⬇</div>
            </div>

            {/* Content Column */}
            <div className="post-content">
              <div className="post-header">
                <span className="community-name">{post.community}</span> 
                • Posted by u/{post.author}
              </div>
              <h3 className="post-title">{post.title}</h3>
              <p className="post-body">{post.body}</p>
              
              <div className="post-footer">
                <span>💬 {post.comments} Comments</span>
                <span>🎁 Award</span>
                <span>share</span>
              </div>
            </div>

          </div>
        ))}
      </div>

    </div>
  );
}
