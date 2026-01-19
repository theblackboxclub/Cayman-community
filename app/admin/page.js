"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '../../firebase'; 
import { onAuthStateChanged } from 'firebase/auth';
import { 
  collection, query, orderBy, onSnapshot, doc, deleteDoc, getDoc 
} from 'firebase/firestore';

// YOUR ADMIN ID
const ADMIN_UID = "Xc21LVCRloY6DO2nLV0GT8kS9lo2"; 

export default function AdminDashboard() {
  const router = useRouter();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [errorMsg, setErrorMsg] = useState(''); // New error state

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push('/signup');
        return;
      }
      
      // Security Check
      if (user.uid !== ADMIN_UID) {
        alert("Access Denied: You are not the admin.");
        router.push('/');
        return;
      }
      
      setIsAdmin(true);
      fetchReports();
    });
    return () => unsubscribeAuth();
  }, []);

  const fetchReports = () => {
    try {
      // Listen to "reports" collection
      const q = query(collection(db, "reports"), orderBy("createdAt", "desc"));
      
      const unsubscribe = onSnapshot(q, async (snapshot) => {
        const reportData = await Promise.all(snapshot.docs.map(async (reportDoc) => {
          const data = reportDoc.data();
          let targetContent = "Content deleted or not found";
          
          if (data.type === 'post' && data.targetId) {
            try {
              const postSnap = await getDoc(doc(db, "posts", data.targetId));
              if (postSnap.exists()) {
                 targetContent = postSnap.data().body || postSnap.data().title;
              }
            } catch (err) {
              console.error("Error fetching post details", err);
            }
          }

          return {
            id: reportDoc.id,
            ...data,
            targetContent
          };
        }));
        
        setReports(reportData);
        setLoading(false);
      }, (error) => {
        // --- THIS IS THE SAFETY CATCH ---
        console.error("Admin Query Error:", error);
        // If it's a permission error, show rules alert. If index, show index alert.
        setErrorMsg(error.message);
        setLoading(false);
      });
      
      return () => unsubscribe();
    } catch (err) {
      setErrorMsg(err.message);
      setLoading(false);
    }
  };

  const handleDeletePost = async (report) => {
    if(!confirm("Permanently delete this post?")) return;
    try {
      await deleteDoc(doc(db, "posts", report.targetId));
      await deleteDoc(doc(db, "reports", report.id));
      alert("Post deleted.");
    } catch (error) {
      alert("Error deleting: " + error.message);
    }
  };

  const handleDismiss = async (reportId) => {
    if(!confirm("Dismiss this report?")) return;
    await deleteDoc(doc(db, "reports", reportId));
  };

  if (loading) return (
    <div className="p-10 text-center">
      <p className="font-bold text-gray-500">Loading Admin Panel...</p>
      <p className="text-xs text-gray-400 mt-2">If this takes long, check your Database Indexes.</p>
    </div>
  );

  if (errorMsg) return (
    <div className="p-10 text-center">
      <h2 className="text-red-500 font-bold mb-2">Error Loading Dashboard</h2>
      <p className="text-sm bg-gray-100 p-4 rounded">{errorMsg}</p>
      <button onClick={() => window.location.reload()} className="mt-4 bg-black text-white px-4 py-2 rounded">Retry</button>
    </div>
  );

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-black text-gray-900">Moderator Dashboard 🛡️</h1>
          <button onClick={() => router.push('/')} className="text-sm font-bold text-gray-500 hover:text-black">Exit</button>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between">
            <h2 className="font-bold text-gray-700">Active Reports ({reports.length})</h2>
          </div>

          {reports.length === 0 ? (
            <div className="p-10 text-center text-gray-400">
              <p>No reports! Your community is safe. 😇</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {reports.map((report) => (
                <div key={report.id} className="p-4 hover:bg-gray-50 transition">
                  <div className="flex justify-between items-start mb-2">
                    <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-1 rounded-full uppercase">{report.reason}</span>
                    <span className="text-xs text-gray-400">{report.createdAt?.toDate ? report.createdAt.toDate().toLocaleString() : 'Just now'}</span>
                  </div>
                  
                  <p className="text-sm font-bold text-gray-900 mb-1">Reported Content:</p>
                  <div className="bg-gray-100 p-3 rounded-lg text-sm text-gray-700 mb-4 italic border-l-4 border-red-500">
                    "{report.targetContent}"
                  </div>

                  <div className="flex gap-3">
                    <button 
                      onClick={() => handleDeletePost(report)}
                      className="bg-red-500 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-red-600 shadow-sm"
                    >
                      Delete Post 🚫
                    </button>
                    <button 
                      onClick={() => handleDismiss(report.id)}
                      className="bg-gray-200 text-gray-600 px-4 py-2 rounded-lg text-xs font-bold hover:bg-gray-300"
                    >
                      Dismiss (Keep Post) ✅
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
