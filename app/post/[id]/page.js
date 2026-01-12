"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db, auth } from '../../../firebase'; 
import { onAuthStateChanged } from 'firebase/auth';
import { 
  doc, getDoc, onSnapshot, collection, addDoc, query, orderBy, serverTimestamp, updateDoc, increment, arrayUnion, arrayRemove 
} from 'firebase/firestore';

export default function PostDetail({ params }) {
  const router = useRouter();
  const { id } = params; 

  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  
  // Reply State
  const [replyingTo, setReplyingTo] = useState(null); // ID of comment being replied to
  const [replyText, setReplyText] = useState('');

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dbUsername, setDbUsername] = useState(null);

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
        setLoading(false);
      }
    });

    // Fetch ALL comments (root + replies)
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

  // --- ACTIONS ---

  const handlePostComment = async () => {
    if (!newComment.trim()) return;
    if (!user) return router.push('/signup');
    const authorName = dbUsername || "Anonymous";

    try {
      await addDoc(collection(db, "posts", id, "comments"), {
        text: newComment,
        author: authorName,
        userId: user.uid,
        parentId: null, // Root comment
        votes: 0,
        likedBy: [],
        createdAt: serverTimestamp()
      });
      await updateDoc(doc(db, "posts", id), { comments: increment(1) });
      setNewComment('');
    } catch (error) {
      console.error("Error commenting:", error);
    }
  };

  const handleReply = async (parentId) => {
    if (!replyText.trim()) return;
    if (!user) return router.push('/signup');
    const authorName = dbUsername || "Anonymous";

    try {
      await addDoc(collection(db, "posts", id, "comments"), {
        text: replyText,
        author: authorName,
        userId: user.uid,
        parentId: parentId, // Links this reply to the parent
        votes: 0,
        likedBy: [],
        createdAt: serverTimestamp()
      });
      await updateDoc(doc(db, "posts", id), { comments: increment(1) });
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
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    return timestamp.toDate().toLocaleDateString();
  };

  // --- HELPERS FOR THREADING ---
  const rootComments = comments.filter(c => !c.parentId);
  const getReplies = (parentId) => comments.filter(c => c.parentId === parentId);

  if (loading) return <div className="p-8 text-center text-gray-500 text-sm">Loading...</div>;
  if (!post) return <div className="p-8 text-center">Post not found</div>;

  return (
    <div className="min-h-screen bg-white pb-24">
      
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10 px-4 py-3 flex items-center gap-4">
        <button onClick={() => router.back()} className="text-gray-600 hover:text-black">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
        </button>
        <span className="font-bold text-lg text-gray-900">Thread</span>
      </div>

      <div className="max-w-2xl mx-auto">
        {/* Post Content */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center font-bold text-xs">
              {post.community ? post.community.charAt(2) : "G"}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-gray-900">{post.community}</span>
                <span className="text-xs text-gray-400">• {post.createdAt ? formatTime(post.createdAt) : ''}</span>
              </div>
              <div className="text-xs text-gray-500">u/{post.author}</div>
            </div>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">{post.title}</h1>
          <p className="text-base text-gray-800 leading-relaxed mb-4 whitespace-pre-wrap">{post.body}</p>
          
          {post.mediaType === 'image' && post.mediaUrl && (
            <div className="mb-4 rounded bg-gray-50 border border-gray-100 overflow-hidden"><img src={post.mediaUrl} alt="Content" className="w-full h-auto object-cover" /></div>
          )}
          {post.mediaType === 'link' && post.mediaUrl && (
             <a href={post.mediaUrl} target="_blank" rel="noreferrer" className="block mb-4 p-3 bg-gray-50 border border-gray-200 rounded flex items-center gap-2 hover:bg-gray-100">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
               <span className="text-blue-600 text-sm truncate">{post.mediaUrl}</span>
             </a>
          )}

          {/* Post Actions */}
          <div className="flex items-center gap-6 pt-2">
            <button onClick={handleLikePost} className={`flex items-center gap-2 px-3 py-1 rounded-full border transition ${post.likedBy?.includes(user?.uid) ? 'border-red-500 text-red-600 bg-red-50' : 'border-gray-200 text-gray-600'}`}>
              <svg className="w-5 h-5" fill={post.likedBy?.includes(user?.uid) ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
              <span className="font-bold text-sm">{post.votes || 0}</span>
            </button>
            <div className="flex items-center gap-2 text-gray-500">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
              <span className="text-sm font-medium">{post.comments || 0} Comments</span>
            </div>
          </div>
        </div>

        {/* Comments Section */}
        <div className="bg-gray-50 min-h-[300px] p-4">
          {rootComments.length === 0 ? (
            <div className="text-center text-gray-400 py-10 text-sm">No comments yet.</div>
          ) : (
            rootComments.map((comment) => {
              const replies = getReplies(comment.id);
              const isLiked = comment.likedBy?.includes(user?.uid);
              
              return (
                <div key={comment.id} className="mb-4">
                  {/* Parent Comment */}
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-300 flex-shrink-0 mt-1" />
                    <div className="flex-1">
                      <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-100">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs font-bold text-gray-900">u/{comment.author}</span>
                          <span className="text-[10px] text-gray-400">{comment.createdAt ? formatTime(comment.createdAt) : ''}</span>
                        </div>
                        <p className="text-sm text-gray-800">{comment.text}</p>
                      </div>
                      
                      {/* Comment Actions (Like / Reply) */}
                      <div className="flex items-center gap-4 mt-1 ml-1">
                        <button onClick={() => handleLikeComment(comment)} className={`flex items-center gap-1 text-xs font-bold ${isLiked ? 'text-red-500' : 'text-gray-500 hover:text-black'}`}>
                           <svg className="w-4 h-4" fill={isLiked ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                           {comment.votes > 0 && <span>{comment.votes}</span>}
                        </button>
                        <button onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)} className="text-xs font-bold text-gray-500 hover:text-black flex items-center gap-1">
                           Reply
                        </button>
                      </div>

                      {/* Reply Input Box */}
                      {replyingTo === comment.id && (
                        <div className="mt-2 flex gap-2">
                           <input 
                             type="text" 
                             autoFocus
                             className="flex-1 bg-white border border-gray-300 rounded-full px-3 py-1 text-sm outline-none"
                             placeholder={`Reply to u/${comment.author}...`}
                             value={replyText}
                             onChange={(e) => setReplyText(e.target.value)}
                           />
                           <button onClick={() => handleReply(comment.id)} className="text-blue-600 text-xs font-bold px-2">Send</button>
                        </div>
                      )}

                      {/* Nested Replies */}
                      {replies.length > 0 && (
                        <div className="mt-2 pl-4 border-l-2 border-gray-200">
                          {replies.map(reply => (
                            <div key={reply.id} className="mb-3">
                              <div className="bg-gray-100 p-2 rounded-lg">
                                <div className="flex justify-between items-center mb-1">
                                  <span className="text-xs font-bold text-gray-800">u/{reply.author}</span>
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

      {/* Main Comment Input */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-3 z-20">
        <div className="max-w-2xl mx-auto flex gap-2 items-center">
          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-[10px] font-bold text-gray-500 flex-shrink-0">
             {dbUsername ? dbUsername.charAt(0).toUpperCase() : '?'}
          </div>
          <input 
            type="text" 
            className="flex-1 bg-gray-100 border-none rounded-full px-4 py-2.5 text-sm focus:ring-1 focus:ring-black outline-none placeholder-gray-500"
            placeholder={dbUsername ? `Comment as ${dbUsername}...` : "Add a comment..."}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handlePostComment()}
          />
          <button onClick={handlePostComment} disabled={!newComment.trim()} className={`p-2.5 rounded-full transition ${newComment.trim() ? 'bg-black text-white' : 'bg-gray-200 text-gray-400'}`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
}
