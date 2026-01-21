"use client";
import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
// Note: verify your path to firebase is correct (../../firebase or ../../../firebase)
// based on folder structure app/post/[id]/page.js -> needs ../../../
import { db, auth } from '../../../firebase'; 
import { onAuthStateChanged } from 'firebase/auth';
import { 
  doc, getDoc, updateDoc, increment, arrayUnion, arrayRemove, 
  collection, addDoc, onSnapshot, query, orderBy, serverTimestamp 
} from 'firebase/firestore';

export default function PostDetail() {
  const router = useRouter();
  const { id } = useParams();
  const [user, setUser] = useState(null);
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState(null); // { id, author }
  const [loading, setLoading] = useState(true);

  // 1. Auth & Data Listeners
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });

    if (id) {
      // A. Listen to the Post Document (Real-time)
      const postRef = doc(db, "posts", id);
      const unsubPost = onSnapshot(postRef, (docSnap) => {
        if (docSnap.exists()) {
          setPost({ id: docSnap.id, ...docSnap.data() });
        } else {
          setLoading(false);
        }
      });

      // B. Listen to Comments Subcollection (Real-time)
      const commentsRef = collection(db, "posts", id, "comments");
      const q = query(commentsRef, orderBy("createdAt", "asc"));
      
      const unsubComments = onSnapshot(q, (snapshot) => {
        const cData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setComments(cData);
        setLoading(false);
      });

      return () => { unsubPost(); unsubComments(); };
    }
    return () => unsubscribeAuth();
  }, [id]);

  // --- ACTIONS ---

  // 2. Like Main Post
  const handleLikePost = async () => {
    if (!user) return alert("Please sign in to like.");
    const postRef = doc(db, "posts", id);
    const isLiked = post.likedBy?.includes(user.uid);

    if (isLiked) {
      await updateDoc(postRef, { votes: increment(-1), likedBy: arrayRemove(user.uid) });
    } else {
      await updateDoc(postRef, { votes: increment(1), likedBy: arrayUnion(user.uid) });
    }
  };

  // 3. Like a Comment
  const handleLikeComment = async (commentId, currentLikedBy) => {
    if (!user) return alert("Please sign in to like.");
    const commentRef = doc(db, "posts", id, "comments", commentId);
    const isLiked = currentLikedBy?.includes(user.uid);

    if (isLiked) {
      await updateDoc(commentRef, { likes: increment(-1), likedBy: arrayRemove(user.uid) });
    } else {
      await updateDoc(commentRef, { likes: increment(1), likedBy: arrayUnion(user.uid) });
    }
  };

  // 4. Submit Comment/Reply
  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    if (!user) return alert("Please sign in to comment.");

    try {
      const commentsRef = collection(db, "posts", id, "comments");
      
      // Save comment
      await addDoc(commentsRef, {
        text: newComment,
        author: user.displayName || "Anonymous",
        authorId: user.uid,
        // If replying, save the parent ID, otherwise null
        replyTo: replyingTo ? replyingTo.id : null, 
        replyToName: replyingTo ? replyingTo.author : null,
        likes: 0,
        likedBy: [],
        createdAt: serverTimestamp()
      });

      // Update total comment count on the post
      const postRef = doc(db, "posts", id);
      await updateDoc(postRef, { comments: increment(1) });

      setNewComment("");
      setReplyingTo(null);
    } catch (err) {
      console.error("Error commenting:", err);
      alert("Failed to send comment.");
    }
  };

  // --- RENDER HELPERS ---

  // Filter lists for Parents and Children
  const topLevelComments = comments.filter(c => !c.replyTo);
  const getReplies = (commentId) => comments.filter(c => c.replyTo === commentId);

  // Reusable Comment Card Component (for both Parent and Reply)
  const CommentCard = ({ data, isReply = false }) => {
    const isLiked = data.likedBy?.includes(user?.uid);

    return (
      <div className={`bg-white p-3 rounded-xl shadow-sm border border-gray-100 mb-2 ${isReply ? 'ml-8 bg-gray-50/50' : ''}`}>
        
        {/* Header */}
        <div className="flex justify-between items-start mb-1">
          <div className="flex items-center gap-2">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] ${isReply ? 'bg-gray-200 text-gray-600' : 'bg-cyan-100 text-cyan-700'}`}>
              {data.author?.[0]}
            </div>
            <span className="font-bold text-xs text-gray-900">{data.author}</span>
            {data.replyToName && isReply && <span className="text-[10px] text-gray-400">replying to {data.replyToName}</span>}
          </div>
        </div>

        {/* Body */}
        <p className="text-sm text-gray-800 mb-2 pl-8">{data.text}</p>

        {/* Action Bar */}
        <div className="flex items-center gap-4 pl-8">
           {/* Reply Button */}
           <button onClick={() => setReplyingTo(data)} className="text-gray-400 hover:text-cyan-600 text-xs font-bold flex items-center gap-1">
             Reply
           </button>

           {/* Like Button */}
           <button onClick={() => handleLikeComment(data.id, data.likedBy)} className={`flex items-center gap-1 text-xs font-bold ${isLiked ? 'text-red-500' : 'text-gray-400 hover:text-red-500'}`}>
             <svg className={`w-3.5 h-3.5 ${isLiked ? 'fill-current' : ''}`} stroke="currentColor" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
             {data.likes || 0}
           </button>
        </div>
      </div>
    );
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center font-bold text-gray-400">Loading Post...</div>;
  if (!post) return <div className="min-h-screen flex items-center justify-center font-bold">Post not found.</div>;

  return (
    <div className="min-h-screen bg-white pb-24">
      {/* Top Bar */}
      <div className="sticky top-0 bg-white/95 backdrop-blur z-10 px-4 py-3 border-b border-gray-100 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-gray-500 hover:bg-gray-100 p-2 rounded-full"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg></button>
        <span className="font-bold text-lg">Post</span>
      </div>

      <div className="max-w-xl mx-auto">
        {/* Main Post Card */}
        <div className="p-4 border-b border-gray-100">
           <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-cyan-100 flex items-center justify-center text-cyan-700 font-bold text-xs">{post.author?.[0]}</div>
              <span className="font-bold text-sm">{post.author}</span>
              <span className="text-xs text-gray-400">• c/{post.community}</span>
              {post.flair && <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-[10px] font-bold uppercase">{post.flair}</span>}
           </div>
           
           <h1 className="text-xl font-black text-gray-900 mb-2 leading-tight">{post.title}</h1>
           <p className="text-gray-800 leading-relaxed mb-4 whitespace-pre-wrap">{post.body}</p>
           
           {post.mediaUrl && <img src={post.mediaUrl} className="w-full rounded-xl mb-4 border border-gray-100" />}
           
           {/* Link Card (If exists) */}
           {post.linkUrl && (
             <a href={post.linkUrl} target="_blank" className="block mb-4 bg-blue-50 p-3 rounded-xl border border-blue-100 flex items-center gap-3">
               <div className="bg-blue-200 p-2 rounded-full text-blue-600"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg></div>
               <span className="text-xs font-bold text-blue-900 truncate flex-1">{post.linkUrl}</span>
             </a>
           )}

           <div className="flex gap-4">
              <button onClick={handleLikePost} className={`flex items-center gap-1.5 font-bold text-sm transition ${post.likedBy?.includes(user?.uid) ? 'text-red-500' : 'text-gray-500 hover:text-red-500'}`}>
                 <svg className={`w-6 h-6 ${post.likedBy?.includes(user?.uid) ? 'fill-current' : ''}`} stroke="currentColor" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                 {post.votes || 0}
              </button>
              <div className="text-gray-500 font-bold text-sm flex items-center gap-1.5">
                 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                 {post.comments || 0}
              </div>
           </div>
        </div>

        {/* Comments Feed */}
        <div className="p-4 bg-gray-50 min-h-[300px]">
          {comments.length === 0 && <div className="text-center text-gray-400 text-sm mt-10">No comments yet. Start the conversation! 👇</div>}
          
          <div className="space-y-4 pb-20"> {/* pb-20 for bottom input space */}
            {topLevelComments.map(comment => (
              <div key={comment.id} className="animate-fade-in">
                {/* Render Parent */}
                <CommentCard data={comment} />
                
                {/* Render Replies */}
                <div className="mt-1">
                  {getReplies(comment.id).map(reply => (
                    <CommentCard key={reply.id} data={reply} isReply={true} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Floating Comment Input */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4 z-50 pb-8">
        {replyingTo && (
          <div className="flex justify-between items-center bg-gray-100 px-4 py-2 rounded-xl mb-2 text-xs">
            <span className="text-gray-600">Replying to <b className="text-black">{replyingTo.author}</b></span>
            <button onClick={() => setReplyingTo(null)} className="font-bold text-gray-500 hover:text-black">Cancel</button>
          </div>
        )}
        <form onSubmit={handleCommentSubmit} className="flex gap-2 max-w-xl mx-auto">
          <input 
            type="text" 
            placeholder={replyingTo ? "Write a reply..." : "Add a comment..."}
            className="flex-1 bg-gray-50 border border-gray-200 rounded-full px-5 py-3 outline-none focus:border-cyan-400 transition text-sm font-medium"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
          />
          <button type="submit" disabled={!newComment.trim()} className="bg-cyan-600 text-white font-bold px-6 py-2 rounded-full text-sm disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:scale-105 transition">
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
