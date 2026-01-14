"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db, auth } from '../../../firebase'; 
import { onAuthStateChanged } from 'firebase/auth';
import { 
  doc, getDoc, onSnapshot, collection, addDoc, query, orderBy, serverTimestamp, updateDoc, increment, arrayUnion, arrayRemove, deleteDoc 
} from 'firebase/firestore';

export default function PostDetail({ params }) {
  const router = useRouter();
  const { id } = params; 

  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  
  const [replyingTo, setReplyingTo] = useState(null); 
  const [replyText, setReplyText] = useState('');

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dbUsername, setDbUsername] = useState(null);
  
  const [confirmDeletePost, setConfirmDeletePost] = useState(false);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const userDocRef = doc(db, "users", currentUser.uid);
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists() && userDocSnap.data().username) {
            setDbUsername(userDocSnap.data().username);
          } else {
            setDbUsername(currentUser.email.split('@')[0]);
          }
        } catch (error) {
          console.error("Error fetching username:", error);
        }
      }
    });

    const unsubPost = onSnapshot(doc(db, "posts", id), (docSnap) => {
      if (docSnap.exists()) {
        setPost({ id: docSnap.id, ...docSnap.data() });
      } else {
        setPost(null); 
        setLoading(false);
      }
    });

    const q = query(collection(db, "posts", id, "comments"), orderBy("createdAt", "asc"));
    const unsubComments = onSnapshot(q, (snapshot) => {
      setComments(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });

    return () => {
      unsubscribeAuth();
      unsubPost();
      unsubComments();
    };
  }, [id]);

  const sendNotification = async (toUserId, type, text, contentType) => {
    if (!user || !toUserId) return;
    if (user.uid === toUserId) return; 

    try {
      await addDoc(collection(db, "notifications"), {
        toUserId: toUserId,       
        fromUserId: user.uid,     
        fromUser: dbUsername || "Anonymous",
        type: type,               
        text: text || "",         
        contentType: contentType, 
        postId: id,               
        read: false,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      console.error("Error sending notification:", error);
    }
  };

  const handlePostComment = async () => {
    if (!newComment.trim()) return;
    if (!user) return router.push('/signup');
    const authorName = dbUsername || "Anonymous";

    try {
      await addDoc(collection(db, "posts", id, "comments"), {
        text: newComment,
        author: authorName,
        userId: user.uid,
        parentId: null,
        votes: 0,
        likedBy: [],
        createdAt: serverTimestamp()
      });
      await updateDoc(doc(db, "posts", id), { comments: increment(1) });
      
      if (post && post.userId) {
        await sendNotification(post.userId, 'reply', newComment.substring(0, 50), 'post');
      }

      setNewComment('');
    } catch (error) {
      console.error("Error commenting:", error);
    }
  };

  const handleReply = async (parentComment) => {
    if (!replyText.trim()) return;
    if (!user) return router.push('/signup');
    const authorName = dbUsername || "Anonymous";

    try {
      await addDoc(collection(db, "posts", id, "comments"), {
        text: replyText,
        author: authorName,
        userId: user.uid,
        parentId: parentComment.id, 
        votes: 0,
        likedBy: [],
        createdAt: serverTimestamp()
      });
      await updateDoc(doc(db, "posts", id), { comments: increment(1) });
      
      await sendNotification(parentComment.userId, 'reply', replyText.substring(0, 50), 'comment');

      setReplyingTo(null);
      setReplyText('');
    } catch (error) {
      console.error("Error replying:", error);
    }
  };

  const handleLikePost = async () => {
    if (!user) return router.push('/signup');
    const postRef = doc(db, "posts", id);
    const isLiked = post.likedBy?.includes(user.uid);
    if (isLiked) {
      await updateDoc(postRef, { votes: increment(-1), likedBy: arrayRemove(user.uid) });
    } else {
      await updateDoc(postRef, { votes: increment(1), likedBy: arrayUnion(user.uid) });
      await sendNotification(post.userId, 'like', '', 'post');
    }
  };

  const handleLikeComment = async (comment) => {
    if (!user) return router.push('/signup');
    const commentRef = doc(db, "posts", id, "comments", comment.id);
    const isLiked = comment.likedBy?.includes(user.uid);

    if (isLiked) {
      await updateDoc(commentRef, { votes: increment(-1), likedBy: arrayRemove(user.uid) });
    } else {
      await updateDoc(commentRef, { votes: increment(1), likedBy: arrayUnion(user.uid) });
      await sendNotification(comment.userId, 'like', '', 'comment');
    }
  };

  const handleDeletePost = async () => {
    if (!confirmDeletePost) {
      setConfirmDeletePost(true);
      setTimeout(() => setConfirmDeletePost(false), 3000);
      return;
    }
    
    try {
      await deleteDoc(doc(db, "posts", id));
      router.push('/'); 
    } catch (error) {
      console.error("Error deleting post:", error);
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await deleteDoc(doc(db, "posts", id, "comments", commentId));
      await updateDoc(doc(db, "posts", id), { comments: increment(-1) });
    } catch (error) {
      console.error("Error deleting comment:", error);
    }
  };

  // --- NEW: Handle User Click ---
  const handleUserClick = (username) => {
    router.push(`/user/${username}`);
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    return timestamp.toDate().toLocaleDateString();
  };

  const rootComments = comments.filter(c => !c.parentId);
  const getReplies = (parentId) => comments.filter(c => c.parentId === parentId);

  if (loading) return <div className="p-10 text-center text-gray-400 font-medium">Loading discussion...</div>;
  if (!post) return <div className="p-10 text-center text-gray-500">Post not found</div>;

  const isMyPost = user && post.userId === user.uid;

  return (
    <div className="min-h-screen bg-gradient-to-b from-cyan-50 to-white pb-24">
      
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-md border-b border-gray-100 sticky top-0 z-10 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="text-gray-600 hover:text-black">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>
          <span className="font-bold text-lg text-gray-900">Thread</span>
        </div>
        
        {isMyPost && (
          <button 
            onClick={handleDeletePost} 
            className={`p-2 rounded-full transition ${confirmDeletePost ? 'bg-red-500 text-white shadow-md' : 'text-gray-400 hover:bg-red-50 hover:text-red-500'}`}
          >
            {confirmDeletePost ? (
              <span className="text-xs font-bold px-2">Confirm?</span>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            )}
          </button>
        )}
      </div>

      <div className="max-w-2xl mx-auto px-2 mt-4">
        {/* Post Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-cyan-50 text-cyan-600 flex items-center justify-center font-bold text-xs">
              {post.community ? post.community.charAt(2) : "G"}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-gray-900">{post.community}</span>
                <span className="text-xs text-gray-400">• {post.createdAt ? formatTime(post.createdAt) : ''}</span>
              </div>
              <div 
                onClick={() => handleUserClick(post.author)} 
                className="text-xs text-cyan-600 font-medium cursor-pointer hover:underline"
              >
                u/{post.author}
              </div>
            </div>
          </div>
          <h1 className="text-xl font-black text-gray-900 mb-2 leading-snug">{post.title}</h1>
          <p className="text-base text-gray-800 leading-relaxed mb-4 whitespace-pre-wrap">{post.body}</p>
          
          {post.mediaType === 'image' && post.mediaUrl && (
            <div className="mb-4 rounded-xl bg-gray-50 border border-gray-100 overflow-hidden shadow-inner">
               <img src={post.mediaUrl} alt="Content" className="w-full h-auto object-cover" />
            </div>
          )}
          {post.mediaType === 'link' && post.mediaUrl && (
             <a href={post.mediaUrl} target="_blank" rel="noreferrer" className="block mb-4 p-3 bg-cyan-50/50 border border-cyan-100 rounded-xl flex items-center gap-3 hover:bg-cyan-50 transition">
                <div className="bg-white p-2 rounded-full text-cyan-500 shadow-sm">
                   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                </div>
               <span className="text-cyan-700 text-sm truncate font-medium">{post.mediaUrl}</span>
             </a>
          )}

          <div className="flex items-center gap-6 pt-2">
            <button onClick={handleLikePost} className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition ${post.likedBy?.includes(user?.uid) ? 'bg-red-50 text-red-500' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}>
              <svg className="w-5 h-5" fill={post.likedBy?.includes(user?.uid) ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
              <span className="font-bold text-sm">{post.votes || 0}</span>
            </button>
            <div className="flex items-center gap-2 text-gray-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
              <span className="text-sm font-medium">{post.comments || 0} Comments</span>
            </div>
          </div>
        </div>

        {/* Comments Section */}
        <div className="">
          {rootComments.length === 0 ? (
            <div className="text-center text-gray-400 py-10 text-sm">No comments yet. Be the first!</div>
          ) : (
            rootComments.map((comment) => {
              const replies = getReplies(comment.id);
              const isLiked = comment.likedBy?.includes(user?.uid);
              const isMyComment = user && comment.userId === user.uid;

              return (
                <div key={comment.id} className="mb-4">
                  <div className="flex gap-3">
                    <div 
                      onClick={() => handleUserClick(comment.author)}
                      className="w-8 h-8 rounded-full bg-white border border-gray-200 flex-shrink-0 mt-1 flex items-center justify-center text-xs font-bold text-gray-400 cursor-pointer hover:border-cyan-400"
                    >
                      {comment.author.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 relative group">
                        
                        {isMyComment && (
                          <button onClick={() => handleDeleteComment(comment.id)} className="absolute top-3 right-3 text-gray-300 hover:text-red-500">
                             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        )}

                        <div className="flex justify-between items-center mb-1 pr-6">
                          <span 
                            onClick={() => handleUserClick(comment.author)}
                            className="text-xs font-bold text-gray-900 cursor-pointer hover:text-cyan-600 hover:underline"
                          >
                            u/{comment.author}
                          </span>
                          <span className="text-[10px] text-gray-400">{comment.createdAt ? formatTime(comment.createdAt) : ''}</span>
                        </div>
                        <p className="text-sm text-gray-800">{comment.text}</p>
                      </div>
                      
                      <div className="flex items-center gap-4 mt-1 ml-2">
                        <button onClick={() => handleLikeComment(comment)} className={`flex items-center gap-1 text-xs font-bold transition ${isLiked ? 'text-red-500' : 'text-gray-400 hover:text-gray-600'}`}>
                           <svg className="w-4 h-4" fill={isLiked ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                           {comment.votes > 0 && <span>{comment.votes}</span>}
                        </button>
                        <button onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)} className="text-xs font-bold text-gray-400 hover:text-cyan-600 flex items-center gap-1">Reply</button>
                      </div>

                      {replyingTo === comment.id && (
                        <div className="mt-2 flex gap-2">
                           <input type="text" autoFocus className="flex-1 bg-white border border-gray-200 rounded-full px-4 py-1.5 text-sm outline-none focus:ring-2 focus:ring-cyan-100" placeholder={`Reply to u/${comment.author}...`} value={replyText} onChange={(e) => setReplyText(e.target.value)} />
                           <button onClick={() => handleReply(comment)} className="text-white bg-black rounded-full px-3 py-1 text-xs font-bold">Send</button>
                        </div>
                      )}

                      {replies.length > 0 && (
                        <div className="mt-3 pl-3 border-l-2 border-gray-100 space-y-3">
                          {replies.map(reply => (
                            <div key={reply.id} className="relative group">
                              <div className="bg-white/80 p-3 rounded-xl border border-gray-50">
                                {user && reply.userId === user.uid && (
                                   <button onClick={() => handleDeleteComment(reply.id)} className="absolute top-2 right-2 text-gray-300 hover:text-red-500">
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                   </button>
                                )}
                                <div className="flex justify-between items-center mb-1">
                                  <span 
                                    onClick={() => handleUserClick(reply.author)}
                                    className="text-xs font-bold text-gray-800 cursor-pointer hover:text-cyan-600 hover:underline"
                                  >
                                    u/{reply.author}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-700">{reply.text}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Comment Input */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-gray-100 p-3 z-20 shadow-lg">
        <div className="max-w-2xl mx-auto flex gap-2 items-center">
          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-[10px] font-bold text-gray-500 flex-shrink-0">{dbUsername ? dbUsername.charAt(0).toUpperCase() : '?'}</div>
          <input 
             type="text" 
             className="flex-1 bg-gray-100 border-none rounded-full px-4 py-2.5 text-sm focus:ring-2 focus:ring-cyan-100 outline-none placeholder-gray-400 transition-all" 
             placeholder={dbUsername ? `Comment as ${dbUsername}...` : "Add a comment..."} 
             value={newComment} 
             onChange={(e) => setNewComment(e.target.value)} 
             onKeyDown={(e) => e.key === 'Enter' && handlePostComment()} 
          />
          <button 
             onClick={handlePostComment} 
             disabled={!newComment.trim()} 
             className={`p-2.5 rounded-full transition shadow-sm ${newComment.trim() ? 'bg-cyan-600 text-white hover:scale-105' : 'bg-gray-200 text-gray-400'}`}
          >
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
}
