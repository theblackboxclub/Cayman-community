"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db, auth } from '../../../firebase';
import { 
  doc, getDoc, collection, addDoc, 
  query, where, onSnapshot, 
  serverTimestamp, setDoc, updateDoc, increment,
  arrayUnion, arrayRemove
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

export default function PostDetails({ params }) {
  const router = useRouter();
  const { id } = params; 
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
    const q = query(collection(db, "comments"), where("postId", "==", id));
    const unsubComments = onSnapshot(q, (snapshot) => {
      const commentsData = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      // Sort locally
      const sortedComments = commentsData.sort((a, b) => {
        return (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0);
      });
      setComments(sortedComments);
    });

    return () => { unsubscribe(); unsubPost(); unsubComments(); };
  }, [id]);


  // 2. NAME GENERATOR
  const getUniqueUsername = async (uid) => {
    const userRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists() && userSnap.data().username) {
      return userSnap.data().username;
    }

    const adjectives = ["Salty", "Breezy", "Grand", "Little", "Coral", "Sunny", "Happy", "Lazy"];
    const nouns = ["Iguana", "Stingray", "Turtle", "Rooster", "Shark", "Marlin", "Crab"];
    const randomNum = Math.floor(Math.random() * 9999);
    const finalName = `${adjectives[Math.floor(Math.random() * adjectives.length)]}${nouns[Math.floor(Math.random() * nouns.length)]}${randomNum}`;

    await setDoc(userRef, { username: finalName }, { merge: true });
    return finalName;
  };

  // --- LIKE LOGIC FOR MAIN POST ---
  const handlePostLike = async () => {
    if (!user) return alert("Please sign in!");
    const postRef = doc(db, "posts", id);
    const isLiked = post.likedBy?.includes(user.uid);

    if (isLiked) {
      await updateDoc(postRef, {
        votes: increment(-1),
        likedBy: arrayRemove(user.uid)
      });
    } else {
      await updateDoc(postRef, {
        votes: increment(1),
        likedBy: arrayUnion(user.uid)
      });
    }
  };

  // --- LIKE LOGIC FOR COMMENTS ---
  const handleCommentLike = async (comment) => {
    if (!user) return alert("Please sign in!");
    const commentRef = doc(db, "comments", comment.id);
    const isLiked = comment.likedBy?.includes(user.uid);

    if (isLiked) {
      await updateDoc(commentRef, {
        votes: increment(-1),
        likedBy: arrayRemove(user.uid)
      });
    } else {
      await updateDoc(commentRef, {
        votes: increment(1),
        likedBy: arrayUnion(user.uid)
      });
    }
  };


  // 3. HANDLE COMMENT SUBMIT
  const handleComment = async () => {
    if (!newComment.trim()) return;
    if (!user) return alert("Please sign in to comment.");

    try {
      const username = await getUniqueUsername(user.uid);

      await addDoc(collection(db, "comments"), {
        postId: id,
        text: newComment,
        author: username, 
        userId: user.uid,
        votes: 0, // Init votes
        likedBy: [], // Init like array
        createdAt: serverTimestamp()
      });

      const postRef = doc(db, "posts", id);
      await updateDoc(postRef, {
        comments: increment(1)
      });

      setNewComment('');
    } catch (error) {
      console.error("Error commenting:", error);
      alert("Failed to post comment.");
    }
  };

  if (loading) return <div className="p-10 text-center font-bold text-gray-500">Loading Discussion... 🌴</div>;
  if (!post) return <div className="p-10 text-center">Post not found.</div>;

  // Check if main post is liked by current user
  const isPostLiked = post.likedBy?.includes(user?.uid);

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
           
           <div className="flex items-center text-gray-500 text-sm gap-6 border-t pt-3">
              {/* MAIN POST LIKE BUTTON */}
              <button 
                onClick={handlePostLike}
                className={`flex items-center gap-2 font-bold ${isPostLiked ? "text-red-500" : "text-gray-500 hover:text-red-500"}`}
              >
                {isPostLiked ? (
                  <svg className="w-6 h-6 fill-current" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" /></svg>
                ) : (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                )}
                {post.votes || 0}
              </button>

              <span className="flex items-center gap-2">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                {comments.length} Comments
              </span>
           </div>
        </div>

        {/* COMMENTS SECTION */}
        <div className="bg-white min-h-[50vh] pb-20">
          {comments.map((comment) => {
            const isCommentLiked = comment.likedBy?.includes(user?.uid);
            
            return (
              <div key={comment.id} className="p-4 border-b border-gray-100 flex gap-3">
                {/* Avatar Bubble */}
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 text-blue-600 text-xs font-bold flex items-center justify-center">
                  {comment.author ? comment.author.charAt(0) : "?"}
                </div>
                
                {/* Comment Body */}
                <div className="flex-1">
                  <div className="flex items-baseline mb-1">
                    <span className="font-bold text-sm text-gray-900 mr-2">u/{comment.author}</span>
                  </div>
                  <p className="text-gray-800 text-sm leading-snug mb-2">{comment.text}</p>
                  
                  {/* COMMENT LIKE BUTTON */}
                  <button 
                    onClick={() => handleCommentLike(comment)}
                    className={`flex items-center gap-1 text-xs font-bold ${isCommentLiked ? "text-red-500" : "text-gray-400 hover:text-red-500"}`}
                  >
                     {isCommentLiked ? (
                        <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" /></svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                      )}
                    {comment.votes || 0}
                  </button>
                </div>
              </div>
            );
          })}
          
          {comments.length === 0 && (
            <div className="p-10 text-center text-gray-400">
              <div className="text-2xl mb-2">💬</div>
              No comments yet.<br/>Be the first to reply!
            </div>
          )}
        </div>

      </div>

      {/* COMMENT INPUT BAR */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-3 flex items-center gap-2 z-50">
        <input 
          type="text" 
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment..." 
          className="flex-1 bg-gray-100 rounded-full px-4 py-3 outline-none text-sm"
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
