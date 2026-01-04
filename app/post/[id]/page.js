"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db, auth } from '../../../firebase';
import { 
  doc, getDoc, collection, addDoc, 
  query, where, getDocs, orderBy, onSnapshot, 
  serverTimestamp, setDoc, updateDoc, increment
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

export default function PostDetails({ params }) {
  const router = useRouter();
  const { id } = params; // The Post ID
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // 1. Load User & Post Data
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    // Fetch Post Details
    const postRef = doc(db, "posts", id);
    const unsubPost = onSnapshot(postRef, (doc) => {
      if (doc.exists()) {
        setPost({ id: doc.id, ...doc.data() });
      } else {
        setPost(null);
      }
      setLoading(false);
    });

    // Fetch Comments
    const q = query(collection(db, "comments"), where("postId", "==", id), orderBy("createdAt", "asc"));
    const unsubComments = onSnapshot(q, (snapshot) => {
      const commentsData = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setComments(commentsData);
    });

    return () => { unsubscribe(); unsubPost(); unsubComments(); };
  }, [id]);


  // 2. NAME GENERATOR (UNIQUE ENFORCER)
  const getUniqueUsername = async (uid) => {
    // A. Check if user already has a saved name
    const userRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists() && userSnap.data().username) {
      return userSnap.data().username; // Return existing name
    }

    // B. If not, generate a new unique one
    let isUnique = false;
    let finalName = "";

    while (!isUnique) {
      // Generate Candidate
      const adjectives = ["Salty", "Breezy", "Grand", "Little", "Coral", "Sunny", "Happy", "Lazy"];
      const nouns = ["Iguana", "Stingray", "Turtle", "Rooster", "Shark", "Marlin", "Crab"];
      const randomNum = Math.floor(Math.random() * 9999); // 4 digits for extra uniqueness
      const candidate = `${adjectives[Math.floor(Math.random() * adjectives.length)]}${nouns[Math.floor(Math.random() * nouns.length)]}${randomNum}`;

      // Check Database for collision
      const q = query(collection(db, "users"), where("username", "==", candidate));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        isUnique = true;
        finalName = candidate;
      }
    }

    // C. Save this name permanently to the user's profile
    await setDoc(userRef, { username: finalName }, { merge: true });
    return finalName;
  };


  // 3. HANDLE COMMENT SUBMIT
  const handleComment = async () => {
    if (!newComment.trim()) return;
    if (!user) return alert("Please sign in to comment.");

    try {
      // Get (or create) the unique username
      const username = await getUniqueUsername(user.uid);

      // Save Comment
      await addDoc(collection(db, "comments"), {
        postId: id,
        text: newComment,
        author: username, // Use the persistent unique name
        userId: user.uid,
        createdAt: serverTimestamp()
      });

      // Update Post Comment Count
      const postRef = doc(db, "posts", id);
      await updateDoc(postRef, {
        comments: increment(1)
      });

      setNewComment(''); // Clear input
    } catch (error) {
      console.error("Error commenting:", error);
      alert("Failed to post comment");
    }
  };

  if (loading) return <div className="p-10 text-center">Loading...</div>;
  if (!post) return <div className="p-10 text-center">Post not found.</div>;

  return (
    <div className="min-h-screen bg-[#DAE0E6] pb-20">
      
      {/* Top Bar */}
      <div className="bg-white px-4 py-3 flex items-center shadow-sm sticky top-0 z-50">
        <button onClick={() => router.back()} className="mr-4 text-gray-600">
           <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <span className="font-bold text-lg">Discussion</span>
      </div>

      <div className="max-w-md mx-auto md:max-w-2xl mt-2">
        
        {/* ORIGINAL POST */}
        <div className="bg-white p-4 border-b border-gray-200">
           <div className="text-xs text-gray-500 mb-2 flex items-center">
              <span className="font-bold text-black mr-2">{post.community}</span> 
              <span>u/{post.author}</span>
           </div>
           <h1 className="text-xl font-bold mb-2">{post.title}</h1>
           <p className="text-gray-800 leading-relaxed mb-4">{post.body}</p>
           <div className="flex items-center text-gray-500 text-sm gap-4">
              <span>❤️ {post.votes} Likes</span>
              <span>💬 {comments.length} Comments</span>
           </div>
        </div>

        {/* COMMENTS SECTION */}
        <div className="bg-white min-h-[50vh]">
          {comments.map((comment) => (
            <div key={comment.id} className="p-4 border-b border-gray-100">
              <div className="flex items-center mb-1">
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs font-bold flex items-center justify-center mr-2">
                  {comment.author.charAt(0)}
                </div>
                <span className="font-bold text-sm text-gray-800">u/{comment.author}</span>
              </div>
              <p className="text-gray-700 text-sm ml-8">{comment.text}</p>
            </div>
          ))}
          
          {comments.length === 0 && (
            <div className="p-8 text-center text-gray-400">
              No comments yet. Start the conversation!
            </div>
          )}
        </div>

      </div>

      {/* COMMENT INPUT BAR (Fixed at bottom) */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-3 flex items-center gap-2">
        <input 
          type="text" 
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment..." 
          className="flex-1 bg-gray-100 rounded-full px-4 py-2 outline-none text-sm"
        />
        <button 
          onClick={handleComment}
          disabled={!newComment}
          className="bg-blue-600 text-white font-bold px-4 py-2 rounded-full text-sm disabled:opacity-50"
        >
          Send
        </button>
      </div>

    </div>
  );
}
