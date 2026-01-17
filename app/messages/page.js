"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db, auth } from '../../firebase'; 
import { onAuthStateChanged } from 'firebase/auth';
import { 
  collection, query, where, onSnapshot, doc, updateDoc, writeBatch 
} from 'firebase/firestore';
import Link from 'next/link';

export default function Inbox() {
  const router = useRouter();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        router.push('/signup');
        return;
      }
      setUser(currentUser);

      const q = query(
        collection(db, "notifications"),
        where("toUserId", "==", currentUser.uid)
      );

      const unsubscribeNotifs = onSnapshot(q, (snapshot) => {
        const notifs = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Sort in Javascript (Newest first)
        notifs.sort((a, b) => {
           const timeA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
           const timeB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
           return timeB - timeA;
        });

        setNotifications(notifs);
        setLoading(false);
      }, (error) => {
        console.error("Error fetching notifications:", error);
        setLoading(false);
      });

      return () => unsubscribeNotifs();
    });

    return () => unsubscribeAuth();
  }, [router]);

  const handleNotificationClick = async (notif) => {
    try {
      const notifRef = doc(db, "notifications", notif.id);
      await updateDoc(notifRef, { read: true });
    } catch (error) {
      console.error("Error marking read:", error);
    }

    if (notif.postId) {
      router.push(`/post/${notif.postId}`);
    }
  };

  const markAllAsRead = async () => {
    try {
      const batch = writeBatch(db);
      let updateCount = 0;
      notifications.forEach(n => {
        if (!n.read) {
          const ref = doc(db, "notifications", n.id);
          batch.update(ref, { read: true });
          updateCount++;
        }
      });
      if (updateCount > 0) await batch.commit();
    } catch (error) {
       console.error("Error marking all read:", error);
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp || !timestamp.toDate) return 'Just now';
    
    const date = timestamp.toDate();
    const now = new Date();
    const diff = Math.floor((now - date) / 1000); 

    if (diff < 60) return `${diff}s`;
    if (diff < 3600) return `${Math.floor(diff/60)}m`;
    if (diff < 86400) return `${Math.floor(diff/3600)}h`;
    return `${Math.floor(diff/86400)}d`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-cyan-50 to-white pb-24">
      
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-md px-4 py-3 border-b border-gray-100 sticky top-0 z-10 flex items-center justify-between shadow-sm">
         <h1 className="font-black text-xl text-gray-900 tracking-tight">Inbox</h1>
         {notifications.some(n => !n.read) && (
           <button onClick={markAllAsRead} className="text-xs font-bold text-cyan-600 hover:text-cyan-800 transition">
             Mark all read
           </button>
         )}
      </div>

      <div className="max-w-md mx-auto pt-2">
        
        {loading && <div className="p-10 text-center text-gray-400 font-medium">Loading updates...</div>}

        {!loading && notifications.length === 0 && (
          <div className="flex flex-col items-center justify-center pt-20 px-6 text-center">
            <div className="w-16 h-16 bg-cyan-100 rounded-full flex items-center justify-center mb-4 text-cyan-600">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900">All caught up!</h3>
            <p className="text-sm text-gray-500 mt-1">When someone likes your post or replies to you, you'll see it here.</p>
          </div>
        )}

        <div className="divide-y divide-gray-50">
          {notifications.map((notif) => (
            <div 
              key={notif.id} 
              onClick={() => handleNotificationClick(notif)}
              className={`p-4 flex gap-3 cursor-pointer transition active:bg-gray-50 ${notif.read ? 'bg-white opacity-60' : 'bg-cyan-50/40'}`}
            >
              {/* Icon */}
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                notif.type === 'like' ? 'bg-red-100 text-red-500' : 'bg-cyan-100 text-cyan-600'
              }`}>
                {notif.type === 'like' ? (
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" /></svg>
                ) : (
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" /></svg>
                )}
              </div>

              <div className="flex-1">
                <p className="text-sm text-gray-900 leading-snug">
                  <span className="font-bold">{notif.fromUser?.replace('u/', '') || "User"}</span> 
                  {notif.type === 'like' ? ' liked your ' : ' replied to your '}
                  {notif.contentType}.
                </p>
                {notif.text && (
                  <p className="text-xs text-gray-500 mt-1 line-clamp-1">"{notif.text}"</p>
                )}
                <p className="text-[10px] text-gray-400 mt-1 font-bold">{formatTime(notif.createdAt)}</p>
              </div>

              {!notif.read && (
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-cyan-500 rounded-full shadow-sm"></div>
                </div>
              )}
            </div>
          ))}
        </div>

      </div>

      {/* Bottom Nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-gray-100 px-6 py-3 flex justify-between items-center z-50">
        <Link href="/" className="flex flex-col items-center text-gray-400 hover:text-black">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
          <span className="text-[10px] mt-1">Home</span>
        </Link>
        <Link href="/explore" className="flex flex-col items-center text-gray-400 hover:text-black">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
          <span className="text-[10px] mt-1">Explore</span>
        </Link>
        <Link href="/create" className="flex flex-col items-center -mt-6">
          <div className="bg-black text-white p-3 rounded-full shadow-lg hover:bg-gray-800 hover:scale-105 transition">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          </div>
          <span className="text-[10px] font-bold mt-1 text-gray-400">Create</span>
        </Link>
        <Link href="/chat" className="flex flex-col items-center text-gray-400 hover:text-black">
           <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
           <span className="text-[10px] mt-1">Chat</span>
        </Link>
        <div className="flex flex-col items-center text-black cursor-pointer">
           <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" /><path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" /></svg>
           <span className="text-[10px] mt-1 font-bold">Inbox</span>
        </div>
      </div>
    </div>
  );
}
