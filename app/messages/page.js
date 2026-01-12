"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '../../firebase'; 
import { onAuthStateChanged } from 'firebase/auth';
import { 
  collection, query, where, onSnapshot, doc, updateDoc, writeBatch 
} from 'firebase/firestore';

export default function Inbox() {
  const router = useRouter();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        router.push('/signup');
        return;
      }
      setUser(currentUser);

      // FIX: Removed 'orderBy' to prevent Index Errors
      const q = query(
        collection(db, "notifications"),
        where("toUserId", "==", currentUser.uid)
      );

      const unsubNotes = onSnapshot(q, (snapshot) => {
        const notes = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Sort explicitly in Javascript (Newest First)
        notes.sort((a, b) => {
           const timeA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
           const timeB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
           return timeB - timeA;
        });

        setNotifications(notes);
        setLoading(false);
      });

      return () => unsubNotes();
    });

    return () => unsubscribe();
  }, [router]);

  const handleClick = async (note) => {
    if (!note.read) {
      const noteRef = doc(db, "notifications", note.id);
      await updateDoc(noteRef, { read: true });
    }
    if (note.postId) {
      router.push(`/post/${note.postId}`);
    }
  };

  const markAllRead = async () => {
    const batch = writeBatch(db);
    notifications.forEach(note => {
      if (!note.read) {
        const ref = doc(db, "notifications", note.id);
        batch.update(ref, { read: true });
      }
    });
    await batch.commit();
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    return isToday ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : date.toLocaleDateString();
  };

  if (loading) return <div className="p-10 text-center text-gray-500 text-sm">Loading Inbox...</div>;

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10 px-4 py-3 flex items-center justify-between">
         <div className="flex items-center gap-3">
            <button onClick={() => router.push('/')} className="text-gray-500 hover:text-black">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            </button>
            <h1 className="font-bold text-lg text-gray-900">Inbox</h1>
         </div>
         {notifications.some(n => !n.read) && (
           <button onClick={markAllRead} className="text-xs font-bold text-blue-600 hover:underline">
             Mark all read
           </button>
         )}
      </div>

      <div className="max-w-md mx-auto">
        {notifications.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-gray-300 mb-2">
               <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
            </div>
            <p className="text-gray-500 text-sm font-medium">No notifications yet.</p>
          </div>
        ) : (
          notifications.map(note => (
            <div 
              key={note.id} 
              onClick={() => handleClick(note)}
              className={`p-4 border-b border-gray-100 cursor-pointer transition flex gap-3 ${note.read ? 'bg-white' : 'bg-blue-50'}`}
            >
              <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${note.read ? 'bg-transparent' : 'bg-blue-500'}`} />
              
              <div className="flex-1">
                <div className="flex justify-between items-start mb-1">
                  <div className="flex items-center gap-2">
                    {/* Icon based on type */}
                    {note.type === 'like' && (
                       <svg className="w-4 h-4 text-red-500 fill-current" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" /></svg>
                    )}
                    {note.type === 'reply' && (
                       <svg className="w-4 h-4 text-blue-500 fill-current" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" /></svg>
                    )}
                    <span className="text-sm font-bold text-gray-900">u/{note.fromUser}</span>
                  </div>
                  <span className="text-xs text-gray-400">{formatTime(note.createdAt)}</span>
                </div>
                
                <p className="text-sm text-gray-800">
                  {note.type === 'like' ? (
                     <span>liked your {note.contentType}.</span>
                  ) : (
                     <span>replied: <span className="text-gray-600">"{note.text}"</span></span>
                  )}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
