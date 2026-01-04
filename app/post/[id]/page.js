"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db, auth } from '../../../firebase';
import { 
  doc, getDoc, collection, addDoc, deleteDoc,
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
  const [replyTo, setReplyTo] = useState(null); 
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [commentMediaUrl, setCommentMediaUrl] = useState('');
  const [commentMediaType, setCommentMediaType] = useState('none'); 

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => { setUser(currentUser); });
    
    // Fetch Post
    const unsubPost = onSnapshot(doc(db, "posts", id), (doc) => {
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
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setComments(data.sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0)));
    });

    return () => { unsubscribe(); unsubPost(); unsubComments(); };
  }, [id]);

  // --- IDENTITY & NOTIFICATION HELPERS ---
  
  const getUniqueUsername = async (uid) => {
    const userRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists() && userSnap.data().username) return userSnap.data().username;

    // Fallback generator if something goes wrong
    const adjectives = ["Salty", "Breezy", "Grand", "Little", "Coral", "Sunny"];
    const nouns = ["Iguana", "Stingray", "Turtle", "Rooster", "Shark"];
    const randomNum = Math.floor(Math.random() * 9999);
    const finalName = `${adjectives[Math.floor(Math.random() * adjectives.length)]}${nouns[Math.floor(Math.random() * nouns.length)]}${randomNum}`;
    
    await setDoc(userRef, { username: finalName }, { merge: true });
    return finalName;
  };

  const sendNotification = async (targetUserId, type, message, fromName) => {
    if (!targetUserId || targetUserId === user.uid) return; // Don't notify self
    
    await addDoc(collection(db, "notifications"), {
      toUserId: targetUserId,
      fromUserId: user.uid,
      fromUsername: fromName, // SAVE THE NAME HERE
      type: type, 
      message: message,
      postId: id,
      read: false,
      createdAt: serverTimestamp()
    });
  };

  // --- ACTIONS ---

  const handleDeletePost = async () => {
    if(window.confirm("Delete this post?")) {
      await deleteDoc(doc(db, "posts", id));
      router.push('/'); 
    }
  };

  const handleDeleteComment = async (commentId) => {
    if(window.confirm("Delete this comment?")) {
      await deleteDoc(doc(db, "comments", commentId));
      await updateDoc(doc(db, "posts", id), { comments: increment(-1) });
    }
  };

  const handleLike = async (item, collectionName) => {
    if (!user) return alert("Please sign in!");
    const ref = doc(db, collectionName, item.id);
    const isLiked = item.likedBy?.includes(user.uid);

    if (isLiked) {
      // Unlike
      await updateDoc(ref, {
        votes: increment(-1),
        likedBy: arrayRemove(user.uid)
      });
    } else {
      // Like
      await updateDoc(ref, {
        votes: increment(1),
        likedBy: arrayUnion(user.uid)
      });

      // SEND LIKE NOTIFICATION
      // 1. Get my name
      const myName = await getUniqueUsername(user.uid);
      // 2. Determine message
      const msg = collectionName === 'posts' ? "liked your post" : "liked your comment";
      // 3. Send
      await sendNotification(item.userId, 'like', msg, myName);
    }
  };

  const handleSendComment = async (parentId = null) => {
    const text = parentId ? newComment : newComment; 
    if (!text.trim() && commentMediaType === 'none') return;
    if (!user) return alert("Please sign in.");

    try {
      const username = await getUniqueUsername(user.uid);
      
      await addDoc(collection(db, "comments"), {
        postId: id,
        parentId: parentId, 
        text: text,
        author: username, 
        userId: user.uid,
        votes: 0,
        likedBy: [],
        mediaUrl: commentMediaUrl,
        mediaType: commentMediaType,
        createdAt: serverTimestamp()
      });

      await updateDoc(doc(db, "posts", id), { comments: increment(1) });

      // SEND COMMENT NOTIFICATION
      if (parentId) {
        const parentComment = comments.find(c => c.id === parentId);
        if (parentComment) {
          await sendNotification(parentComment.userId, 'reply', `replied to your comment: "${text.substring(0, 20)}..."`, username);
        }
      } else {
        await sendNotification(post.userId, 'comment', `commented on your post: "${text.substring(0, 20)}..."`, username);
      }
      
      setNewComment('');
      setReplyTo(null);
      setCommentMediaUrl('');
      setCommentMediaType('none');
    } catch (error) {
      console.error(error);
      alert("Error posting comment.");
    }
  };

  if (loading) return <div className="p-10 text-center text-gray-500">Loading...</div>;
  if (!post) return <div className="p-10 text-center">Post not found.</div>;

  const CommentItem = ({ comment, depth = 0 }) => {
    const isLiked = comment.likedBy?.includes(user?.uid);
    const isMyComment = user && comment.userId === user.uid;
    const replies = comments.filter(c => c.parentId === comment.id);

    return (
      <div className={`border-l-2 ${depth > 0 ? 'ml-4 border-gray-200' : 'border-transparent'} pl-2 mb-4`}>
        <div className="flex gap-2">
           <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-[10px] font-bold flex items-center justify-center">
             {comment.author.charAt(0)}
           </div>
           <div className="flex-1">
             <div className="flex items-center gap-2 mb-1">
               <span className="font-bold text-xs text-gray-900">u/{comment.author}</span>
               <span className="text-[10px] text-gray-400"> • {depth === 0 ? 'Comment' : 'Reply'}</span>
               {isMyComment && <button onClick={() => handleDeleteComment(comment.id)} className="text-gray-400 hover:text-red-500" title="Delete">🗑️</button>}
             </div>
             <p className="text-sm text-gray-800 mb-2">{comment.text}</p>
             {comment.mediaType === 'image' && comment.mediaUrl && <img src={comment.mediaUrl} className="w-full max-w-xs rounded-lg mb-2 border border-gray-100" />}
             {comment.mediaType === 'link' && comment.mediaUrl && <a href={comment.mediaUrl} target="_blank" className="text-blue-500 text-xs underline block mb-2 break-all">📎 {comment.mediaUrl}</a>}

             <div className="flex items-center gap-4 text-xs text-gray-500 font-bold">
               <button onClick={() => handleLike(comment, "comments")} className={`flex items-center gap-1 ${isLiked ? "text-red-500" : "hover:text-red-500"}`}>
                 {isLiked ? "❤️" : "♡"} {comment.votes || 0}
               </button>
               <button onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)} className="hover:text-blue-500">Reply</button>
             </div>

             {replyTo === comment.id && (
               <div className="mt-3 bg-gray-50 p-3 rounded-lg border border-gray-200">
                  <input autoFocus type="text" placeholder={`Reply to u/${comment.author}...`} className="w-full bg-white border border-gray-200 rounded p-2 text-sm mb-2 outline-none"
                    value={newComment} onChange={(e) => setNewComment(e.target.value)}
                  />
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setReplyTo(null)} className="text-xs font-bold text-gray-400">Cancel</button>
                    <button onClick={() => handleSendComment(comment.id)} className="bg-blue-600 text-white text-xs px-3 py-1.5 rounded-full font-bold">Reply</button>
                  </div>
               </div>
             )}
           </div>
        </div>
        <div className="mt-2">{replies.map(reply => <CommentItem key={reply.id} comment={reply} depth={depth + 1} />)}</div>
      </div>
    );
  };

  const isMyPost = user && post.userId === user.uid;

  return (
    <div className="min-h-screen bg-[#DAE0E6] pb-24">
      <div className="bg-white px-4 py-3 flex items-center shadow-sm sticky top-0 z-50 justify-between">
        <div className="flex items-center">
          <button onClick={() => router.back()} className="mr-4 text-gray-600">⬅</button>
          <span className="font-bold text-lg">Discussion</span>
        </div>
        {isMyPost && <button onClick={handleDeletePost} className="text-gray-400 hover:text-red-600 transition p-2">🗑️</button>}
      </div>

      <div className="max-w-md mx-auto md:max-w-2xl mt-2">
        <div className="bg-white p-4 border-b border-gray-200">
           <div className="text-xs text-gray-500 mb-2 flex items-center">
              <span className="font-bold text-black mr-2">{post.community}</span> <span>u/{post.author}</span>
           </div>
           <h1 className="text-xl font-bold mb-2">{post.title}</h1>
           <p className="text-gray-800 leading-relaxed mb-4">{post.body}</p>
           {post.mediaType === 'image' && post.mediaUrl && <img src={post.mediaUrl} className="w-full rounded-xl mb-4 border border-gray-100" />}
           {post.mediaType === 'link' && post.mediaUrl && <div className="bg-gray-50 p-3 rounded-lg mb-4 border border-gray-200 flex items-center gap-2"><span className="text-xl">🔗</span><a href={post.mediaUrl} target="_blank" className="text-blue-600 font-bold underline truncate">{post.mediaUrl}</a></div>}
           <div className="flex items-center text-gray-500 text-sm gap-6 border-t pt-3">
              <button onClick={() => handleLike(post, "posts")} className={`flex items-center gap-2 font-bold ${post.likedBy?.includes(user?.uid) ? "text-red-500" : ""}`}>❤️ {post.votes || 0}</button>
              <span>💬 {comments.length} Comments</span>
           </div>
        </div>
        <div className="bg-white min-h-[50vh] p-4">
          {comments.filter(c => !c.parentId).map((comment) => <CommentItem key={comment.id} comment={comment} />)}
          {comments.length === 0 && <div className="text-center text-gray-400 py-10">No comments yet.</div>}
        </div>
      </div>

      {!replyTo && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-3 z-50">
          {commentMediaType !== 'none' && <input type="text" placeholder="Link..." className="w-full text-xs bg-gray-50 p-2 mb-2 rounded border border-gray-200" value={commentMediaUrl} onChange={(e) => setCommentMediaUrl(e.target.value)} />}
          <div className="flex items-center gap-2">
            <button onClick={() => setCommentMediaType(commentMediaType === 'image' ? 'none' : 'image')} className={`p-2 rounded-full ${commentMediaType === 'image' ? 'bg-black text-white' : 'bg-gray-100 text-gray-500'}`}>📷</button>
            <input type="text" value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Add a comment..." className="flex-1 bg-gray-100 rounded-full px-4 py-3 outline-none text-sm" />
            <button onClick={() => handleSendComment(null)} disabled={!newComment && !commentMediaUrl} className="bg-blue-600 text-white font-bold px-4 py-2 rounded-full text-sm disabled:opacity-50">Send</button>
          </div>
        </div>
      )}
    </div>
  );
}
