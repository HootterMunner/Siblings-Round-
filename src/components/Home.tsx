import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot, where } from 'firebase/firestore';
import { Link } from 'react-router';
import { db } from '../lib/firebase';
import { Chapter } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';
import { Clock, Lock, FileText, CheckCircle2 } from 'lucide-react';
import { ReadChapter } from '../types';

export default function Home() {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, isAdmin } = useAuth();
  const [readChapters, setReadChapters] = useState<Set<string>>(new Set());

  useEffect(() => {
    // If admin, they can see all chapters, otherwise only published ones
    const chaptersRef = collection(db, 'chapters');
    const q = isAdmin 
      ? query(chaptersRef, orderBy('order', 'asc'))
      : query(chaptersRef, where('status', '==', 'published'), orderBy('order', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Chapter));
      setChapters(fetched);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching chapters:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isAdmin]);

  useEffect(() => {
    if (!user) {
      setReadChapters(new Set());
      return;
    }
    const readRef = collection(db, 'users', user.uid, 'readChapters');
    const unsubscribe = onSnapshot(readRef, (snapshot) => {
      const readIds = new Set(snapshot.docs.map(doc => doc.id));
      setReadChapters(readIds);
    });
    return () => unsubscribe();
  }, [user]);

  if (loading) {
    return <div className="text-center py-20 text-gray-500">Loading chapters...</div>;
  }

  return (
    <div className="space-y-12">
            <section className="text-center space-y-4 py-12">
        <div className="w-full max-w-2xl mx-auto mb-10 overflow-hidden rounded-3xl shadow-2xl ring-1 ring-gray-900/5 dark:ring-white/10">
          <img 
            src="/image/siblings_round_menu.png?t=1784384892660" 
            alt="Siblings Round Illustration" 
            className="w-full h-auto object-cover transition-transform duration-700 hover:scale-105"
            referrerPolicy="no-referrer"
          />
        </div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gray-900 dark:text-white">
          Siblings Round
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          A dark fantasy story exploring the bonds of blood, the cost of survival, and the weight of secrets.
        </p>
      </section>

      <section className="max-w-3xl mx-auto">
        <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
          <FileText className="w-6 h-6 text-indigo-500" />
          Chapters
        </h2>
        
        {chapters.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-800">
            <p className="text-gray-500 dark:text-gray-400">No chapters published yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {chapters.map((chapter) => (
              <Link 
                key={chapter.id} 
                to={`/chapter/${chapter.id}`}
                className="block group"
              >
                <div className="p-6 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:border-indigo-500 dark:hover:border-indigo-500 transition-colors shadow-sm hover:shadow-md">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-xl font-medium text-gray-900 dark:text-gray-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors flex items-center gap-2">
                        Chapter {chapter.order}: {chapter.title}
                        {readChapters.has(chapter.id) && (
                          <CheckCircle2 className="w-5 h-5 text-emerald-500" title="Sudah dibaca" />
                        )}
                      </h3>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {format(new Date(chapter.createdAt), 'MMM d, yyyy')}
                        </span>
                        {isAdmin && chapter.status === 'draft' && (
                          <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-2 py-0.5 rounded-full text-xs font-medium">
                            <Lock className="w-3 h-3" />
                            Draft
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
