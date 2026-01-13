"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '../../../firebase'; 
import { onAuthStateChanged } from 'firebase/auth';
import { 
  collection, query, where, getDocs, orderBy, addDoc, serverTimestamp 
} from 'firebase/firestore';

export default function PublicProfile({ params }) {
  const router = useRouter();
  // Decode the username from the URL (e.g. "SaltyIguana99")
  const profileUsername = decodeURIComponent(params.username);
  
  const [profileUser, setProfileUser] = useState(null);
  const [profilePosts, setProfilePosts] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [chatLoading, setChatLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      
      try {
        // 1. Find User ID based on Username
        const usersRef = collection(db, "users");
        const qUser = query(usersRef, where("username", "==", profileUsername));
        const userSnap = await getDocs(qUser);

        if (userSnap.empty) {
          setLoading(false);
          return;
        }

        const userData = userSnap.docs[0].data();
        const userId = userSnap.docs[0].id;
        setProfileUser({ id: userId, ...userData });

        // 2. Fetch User's Posts
        const postsRef = collection(db, "posts");
        const qPosts = query(postsRef, where("userId", "==", userId), orderBy("createdAt", "desc"));
        const postsSnap = await getDocs(qPosts);
        
        const posts = postsSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setProfilePosts(posts);

      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [profileUsername]);

  const handleStartChat = async () => {
    if (!currentUser) {
      router.push('/signup');
      return;
    }
    setChatLoading(true);

    try {
      // 1. Check if chat already exists
      const chatsRef = collection(db, "chats");
      // Note: This is a simple check. For production, you'd want a more robust compound query
      // or check the user's chat list locally.
      const qChat = query(chatsRef, where("participants", "array-contains", currentUser.uid));
      const chatSnap = await getDocs(qChat);
      
      let existingChatId = null;
      
      chatSnap.forEach(doc => {
        const data = doc.data();
        if (data.participants.includes(profileUser.id)) {
          existingChatId = doc.id;
        }
      });

      if (existingChatId) {
        router.push(`/chat/${existingChatId}`);
        return;
      }

      // 2. Create New Chat
      const currentUsername = currentUser.email.split('@')[0]; // Or fetch real username if available
      const docRef = await addDoc(collection(db, "chats"), {
        participants: [currentUser.uid, profileUser.id],
        participantNames: [currentUsername, profileUser.username],
        lastMessage: "Chat started",
        lastUpdated: serverTimestamp()
      });

      router.push(`/chat/${docRef.id}`);
      
    } catch (error) {
      console.error("Error starting chat:", error);
      alert("Could not start chat.");
      setChatLoading(false);
    }
  };

  if (loading) return <div className="p-10 text-center text-gray-500 text-sm">Loading Profile...</div>;
  if (!profileUser) return <div className="p-10 text-center text-gray-500 text-sm">User not found.</div>;

  const totalLikes = profilePosts.reduce((acc, post) => acc + (post.votes || 0), 0);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      
      {/* Header */}
      <div className="bg-white px-4 py-3 border-b border-gray-200 sticky top-0 z-10 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-gray-500 hover:text-black">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
        </button>
        <h1 className="font-bold text-lg text-gray-900">Profile</h1>
      </div>

      <div className="max-w-md mx-auto pt-6 px-4">
        
        {/* Profile Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col items-center text-center mb-6">
          <div className="w-20 h-20 bg-black text-white rounded-full flex items-center justify-center text-3xl font-bold mb-3">
            {profileUser.username.charAt(0).toUpperCase()}
          </div>
          
          <h2 className="text-xl font-black text-gray-900">u/{profileUser.username}</h2>
          
          <div className="flex gap-10 my-6">
            <div className="flex flex-col items-center">
              <span className="text-lg font-black text-gray-900">{profilePosts.length}</span>
              <span className="text-[10px] font-bold text-gray-400 tracking-wider uppercase">Posts</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-lg font-black text-gray-900">{totalLikes}</span>
              <span className="text-[10px] font-bold text-gray-400 tracking-wider uppercase">Likes</span>
            </div>
          </div>

          {/* Message Button (Only if not viewing own profile) */}
          {currentUser?.uid !== profileUser.id && (
            <button 
              onClick={handleStartChat}
              disabled={chatLoading}
              className="flex items-center gap-2 bg-black text-white px-6 py-2 rounded-full text-sm font-bold shadow-lg hover:opacity-80 transition"
            >
              {chatLoading ? "Loading..." : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                  Message
                </>
              )}
            </button>
          )}
        </div>

        {/* Recent Posts Header */}
        <div className="flex items-center gap-2 mb-3 px-1">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Recent Posts</span>
        </div>

        {/* Posts List */}
        <div className="space-y-3">
          {profilePosts.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-sm bg-white rounded-lg border border-gray-200 border-dashed">
              User hasn't posted anything yet.
            </div>
          ) : (
            profilePosts.map(post => (
              <div key={post.id} onClick={() => router.push(`/post/${post.id}`)} className="bg-white p-4 rounded-lg border border-gray-200 cursor-pointer hover:border-black transition shadow-sm">
                <div className="text-[10px] font-bold text-gray-400 mb-1">{post.community || "c/General"}</div>
                <h3 className="font-bold text-sm text-gray-900 mb-2 truncate">{post.title}</h3>
                
                <div className="flex items-center gap-4 text-gray-400">
                  <div className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                    <span className="text-xs font-bold">{post.votes || 0}</span>
                  </div>
                  <div className="flex items-center gap-1">
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
  );
}
