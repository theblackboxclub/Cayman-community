"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '../../../firebase'; 
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export default function CreateGroup() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return alert("Group name required.");
    setLoading(true);
    const user = auth.currentUser;

    try {
      const docRef = await addDoc(collection(db, "groups"), {
        name: name,
        description: desc,
        isPublic: isPublic,
        creatorId: user.uid,
        admins: [user.uid],
        members: [user.uid], 
        pendingRequests: [], // For private groups
        memberCount: 1,
        createdAt: serverTimestamp()
      });
      
      router.push(`/group/${docRef.id}`);
    } catch (error) {
      console.error("Error creating group:", error);
      alert("Failed to create group.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md p-6 rounded-3xl shadow-lg">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl font-black text-gray-900">New Community</h1>
          <button onClick={() => router.back()} className="text-gray-400 hover:text-black">Cancel</button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase ml-1">Group Name</label>
            <input 
              type="text" 
              placeholder="e.g. Sunday Runners" 
              className="w-full bg-gray-100 border-none rounded-xl px-4 py-3 font-bold text-gray-900 focus:ring-2 focus:ring-cyan-200 outline-none"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs font-bold text-gray-500 uppercase ml-1">Description</label>
            <input 
              type="text" 
              placeholder="What is this group about?" 
              className="w-full bg-gray-100 border-none rounded-xl px-4 py-3 text-sm text-gray-900 focus:ring-2 focus:ring-cyan-200 outline-none"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
            />
          </div>

          <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex items-center justify-between">
            <div>
              <p className="font-bold text-sm text-gray-900">{isPublic ? "Public Group" : "Private Group"}</p>
              <p className="text-xs text-gray-500">{isPublic ? "Anyone can join and chat." : "Admin approval required."}</p>
            </div>
            <div 
              onClick={() => setIsPublic(!isPublic)}
              className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors ${isPublic ? 'bg-cyan-500' : 'bg-gray-300'}`}
            >
              <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${isPublic ? 'translate-x-6' : 'translate-x-0'}`}></div>
            </div>
          </div>

          <button 
            onClick={handleCreate}
            disabled={loading}
            className="w-full bg-black text-white py-3 rounded-xl font-bold text-sm shadow-md hover:scale-[1.02] transition"
          >
            {loading ? "Creating..." : "Create Group"}
          </button>
        </div>
      </div>
    </div>
  );
}
