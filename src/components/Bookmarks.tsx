import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { Link } from 'react-router';
import { db } from '../lib/firebase';
import { Bookmark, Chapter } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { Bookmark as BookmarkIcon, Clock } from 'lucide-react';
import { format } from 'date-fns';

export default function Bookmarks() {
  const { user } = useAuth();
  const [bookmarks, setBookmarks] = useState<(Bookmark & { chapter?: Chapter })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setBookmarks([]);
      setLoading(false);
      return;
    }

    const q = query(collection(db, 'users', user.uid, 'bookmarks'));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const fetchedBookmarks = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Bookmark));
      
      // Fetch chapter details for each bookmark
      const bookmarksWithChapters = await Promise.all(
        fetchedBookmarks.map(async (bm) => {
          try {
            const chapDoc = await getDoc(doc(db, 'chapters', bm.chapterId));
            if (chapDoc.exists()) {
              return { ...bm, chapter: { id: chapDoc.id, ...chapDoc.data() } as Chapter };
            }
            return bm;
          } catch (err) {
            console.error("Error fetching chapter for bookmark", err);
            return bm;
          }
        })
      );
      
      setBookmarks(bookmarksWithChapters);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  if (!user) {
    return <div className="text-center py-20 text-gray-500">Please sign in to view bookmarks.</div>;
  }

  if (loading) {
    return <div className="text-center py-20 text-gray-500">Loading bookmarks...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <h1 className="text-3xl font-bold flex items-center gap-2">
        <BookmarkIcon className="w-8 h-8 text-indigo-500" />
        Your Bookmarks
      </h1>

      {bookmarks.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800">
          <p className="text-gray-500 dark:text-gray-400">You haven't bookmarked any chapters yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {bookmarks.map((bm) => (
            bm.chapter ? (
              <Link 
                key={bm.id} 
                to={`/chapter/${bm.chapterId}`}
                className="block group p-6 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:border-indigo-500 dark:hover:border-indigo-500 transition-colors shadow-sm hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-medium text-gray-900 dark:text-gray-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      Chapter {bm.chapter.order}: {bm.chapter.title}
                    </h3>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        Bookmarked on {format(new Date(bm.createdAt), 'MMM d, yyyy')}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ) : (
              <div key={bm.id} className="p-6 rounded-2xl bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 text-gray-500">
                Chapter no longer exists.
              </div>
            )
          ))}
        </div>
      )}
    </div>
  );
}
