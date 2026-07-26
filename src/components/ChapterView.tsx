import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router';
import { doc, getDoc, limit, getDocs, collection, query, where, onSnapshot, orderBy, setDoc, deleteDoc, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Chapter, Comment, Bookmark, Highlight } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';
import { Bookmark as BookmarkIcon, BookmarkCheck, MessageSquare, Highlighter, Trash2, ArrowUp, History, List, X, Eye, EyeOff, Settings2, Maximize, Minimize, CheckCircle2, ArrowRight, Check } from 'lucide-react';
import ChapterContent from './ChapterContent';

interface BookmarkHistoryItem {
  id: string;
  offset: number;
  text: string;
  timestamp: number;
}

export default function ChapterView() {
  const { chapterId } = useParams();
  const { user, profile, isAdmin } = useAuth();
  const [isRead, setIsRead] = useState(false);
  const [nextChapter, setNextChapter] = useState<Chapter | null>(null);
  
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [bookmarkId, setBookmarkId] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState('yellow');
  
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  
  const [selectionRect, setSelectionRect] = useState<{top: number, left: number, width: number} | null>(null);
  const [showHighlights, setShowHighlights] = useState(true);
  const [isFabMenuOpen, setIsFabMenuOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [readingProgress, setReadingProgress] = useState(0);
  
  // Read progress state
  const [showScrollPrompt, setShowScrollPrompt] = useState(false);
  const [savedScrollPos, setSavedScrollPos] = useState(0);
  const [showBackToTop, setShowBackToTop] = useState(false);
  
  const contentRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load Chapter
  useEffect(() => {
    if (!chapterId) return;
    const fetchChapter = async () => {
      try {
        const docRef = doc(db, 'chapters', chapterId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const chapterData = { id: docSnap.id, ...docSnap.data() } as Chapter;
          setChapter(chapterData);
          
          const chaptersRef = collection(db, 'chapters');
          const q = query(
            chaptersRef,
            where('status', '==', 'published'),
            where('order', '>', chapterData.order),
            orderBy('order', 'asc'),
            limit(1)
          );
          const nextChapterSnap = await getDocs(q);
          if (!nextChapterSnap.empty) {
            setNextChapter({ id: nextChapterSnap.docs[0].id, ...nextChapterSnap.docs[0].data() } as Chapter);
          } else {
            setNextChapter(null);
          }
        }
      } catch (err) {
        console.error("Error fetching chapter", err);
      } finally {
        setLoading(false);
      }
    };
    fetchChapter();
  }, [chapterId]);

  // Check if read
  useEffect(() => {
    if (!user || !chapterId) return;
    const checkRead = async () => {
      const docRef = doc(db, 'users', user.uid, 'readChapters', chapterId);
      const docSnap = await getDoc(docRef);
      setIsRead(docSnap.exists());
    };
    checkRead();
  }, [user, chapterId]);

  const markAsRead = async () => {
    if (!user || !chapterId) return;
    try {
      const docRef = doc(db, 'users', user.uid, 'readChapters', chapterId);
      await setDoc(docRef, {
        chapterId,
        userId: user.uid,
        readAt: Date.now()
      });
      setIsRead(true);
    } catch (error) {
      console.error("Error marking as read:", error);
    }
  };


  // Load Comments
  useEffect(() => {
    if (!chapterId) return;
    const q = query(collection(db, 'chapters', chapterId, 'comments'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setComments(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Comment)));
    });
    return () => unsubscribe();
  }, [chapterId]);

  // Load Bookmark status
  useEffect(() => {
    if (!chapterId || !user) {
      setBookmarkId(null);
      return;
    }
    const q = query(collection(db, 'users', user.uid, 'bookmarks'), where('chapterId', '==', chapterId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        setBookmarkId(snapshot.docs[0].id);
      } else {
        setBookmarkId(null);
      }
    });
    return () => unsubscribe();
  }, [chapterId, user]);

  // Load Highlights
  useEffect(() => {
    if (!chapterId || !user) return;
    const q = query(collection(db, 'chapters', chapterId, 'highlights'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setHighlights(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Highlight)));
    });
    return () => unsubscribe();
  }, [chapterId, user]);

  const [selectedText, setSelectedText] = useState('');

  // Handle Text Selection for Floating Highlight Menu
  const handlePointerUp = React.useCallback(() => {
    setTimeout(() => {
      const selection = window.getSelection();
      if (selection && selection.toString().trim() !== '' && !selection.isCollapsed) {
        if (contentRef.current && contentRef.current.contains(selection.anchorNode)) {
          const range = selection.getRangeAt(0);
          const rect = range.getBoundingClientRect();
          setSelectionRect({
            top: rect.top,
            left: rect.left,
            width: rect.width
          });
          setSelectedText(selection.toString().trim());
        }
      }
    }, 50);
  }, []);

  // Re-calculate position on scroll/resize
  useEffect(() => {
    const updatePosition = () => {
      if (selectionRect && selectedText) {
        const selection = window.getSelection();
        if (selection && !selection.isCollapsed && selection.toString().trim() === selectedText) {
          if (contentRef.current && contentRef.current.contains(selection.anchorNode)) {
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            setSelectionRect({
              top: rect.top,
              left: rect.left,
              width: rect.width
            });
          }
        }
      }
    };

    window.addEventListener('scroll', updatePosition);
    window.addEventListener('resize', updatePosition);
    
    return () => {
      window.removeEventListener('scroll', updatePosition);
      window.removeEventListener('resize', updatePosition);
    };
  }, [selectionRect, selectedText]);

  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent | TouchEvent) => {
      if (selectionRect) {
        const target = e.target as HTMLElement;
        if (target.closest('.floating-highlight-menu')) {
          return;
        }
        
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed || selection.toString().trim() === '') {
          setSelectionRect(null);
          setSelectedText('');
        }
      }
    };
    document.addEventListener('mousedown', handleGlobalClick);
    document.addEventListener('touchstart', handleGlobalClick);
    return () => {
      document.removeEventListener('mousedown', handleGlobalClick);
      document.removeEventListener('touchstart', handleGlobalClick);
    };
  }, [selectionRect]);

  // Load manual bookmark position
  const [manualMarkerPos, setManualMarkerPos] = useState<number | null>(null);
  const [bookmarkHistory, setBookmarkHistory] = useState<BookmarkHistoryItem[]>([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  
  const handleDeleteBookmark = (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // prevent triggering the click on the item
    setBookmarkHistory(prev => {
      const updated = prev.filter(item => item.id !== id);
      if (chapterId) {
        localStorage.setItem(`bookmarkHistory_${chapterId}`, JSON.stringify(updated));
      }
      return updated;
    });
    setDeleteConfirmId(null);
  };

  useEffect(() => {
    if (!chapterId) return;
    const pos = localStorage.getItem(`manualMark_${chapterId}`);
    if (pos) setManualMarkerPos(Number(pos));
    
    const historyJson = localStorage.getItem(`bookmarkHistory_${chapterId}`);
    if (historyJson) {
      try {
        setBookmarkHistory(JSON.parse(historyJson));
      } catch (e) {}
    }
  }, [chapterId]);

  const handleSetManualMark = () => {
    if (!contentRef.current || !chapterId) return;
    
    // Find the paragraph that is closest to the top of the viewport
    const paragraphs = contentRef.current.querySelectorAll('p');
    let targetP: HTMLElement | null = null;
    let minDiff = Infinity;
    
    paragraphs.forEach(p => {
      const rect = p.getBoundingClientRect();
      const diff = Math.abs(rect.top - 150); 
      if (diff < minDiff && rect.bottom > 0) {
        minDiff = diff;
        targetP = p;
      }
    });

    if (targetP) {
      const offset = targetP.offsetTop;
      let text = targetP.innerText.trim();
      if (text.length > 60) text = text.substring(0, 60) + '...';
      if (!text) text = "Paragraf tanpa teks";

      const newItem: BookmarkHistoryItem = {
        id: Date.now().toString(),
        offset,
        text,
        timestamp: Date.now()
      };
      
      setBookmarkHistory(prev => {
        const updated = [newItem, ...prev].slice(0, 10);
        localStorage.setItem(`bookmarkHistory_${chapterId}`, JSON.stringify(updated));
        return updated;
      });

      setManualMarkerPos(offset);
      localStorage.setItem(`manualMark_${chapterId}`, offset.toString());
    }
  };

  // Handle Read Progress Tracking
  useEffect(() => {
    if (!chapterId || loading) return;
    const progressKey = `readProgress_${chapterId}`;
    const saved = localStorage.getItem(progressKey);
    
    if (saved) {
      const pos = Number(saved);
      if (pos > 300) {
        setSavedScrollPos(pos);
        setShowScrollPrompt(true);
      }
    }

    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScroll = window.scrollY;
          localStorage.setItem(progressKey, currentScroll.toString());
          setShowBackToTop(currentScroll > 500);
          const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
          setReadingProgress(maxScroll > 0 ? (currentScroll / maxScroll) * 100 : 0);
          
          if (showScrollPrompt && currentScroll > 50) {
            setShowScrollPrompt(false);
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [chapterId, loading, showScrollPrompt]);


  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(err => {
          console.error(`Error attempting to enable fullscreen: ${err.message}`);
        });
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  const toggleBookmark = async () => {
    if (!user || !chapterId) return;
    try {
      if (bookmarkId) {
        await deleteDoc(doc(db, 'users', user.uid, 'bookmarks', bookmarkId));
      } else {
        const newRef = doc(collection(db, 'users', user.uid, 'bookmarks'));
        await setDoc(newRef, {
          chapterId,
          userId: user.uid,
          createdAt: Date.now()
        });
      }
    } catch (err) {
      console.error("Error toggling bookmark:", err);
    }
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile || !chapterId || !newComment.trim()) return;
    
    try {
      const newRef = doc(collection(db, 'chapters', chapterId, 'comments'));
      await setDoc(newRef, {
        chapterId,
        userId: user.uid,
        userName: profile.name,
        content: newComment.trim(),
        createdAt: Date.now()
      });
      setNewComment('');
    } catch (err) {
      console.error("Error posting comment", err);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!chapterId) return;
    if (!confirm("Delete comment?")) return;
    try {
      await deleteDoc(doc(db, 'chapters', chapterId, 'comments', commentId));
    } catch (err) {
      console.error("Error deleting comment", err);
    }
  };
  
  const handleHighlightSelection = async () => {
    if (!user || !chapterId) return;
    const text = selectedText || window.getSelection()?.toString().trim();
    if (!text) return;
    
    if (text.length > 1000) {
      alert("Selection too long to highlight (max 1000 chars)");
      return;
    }
    
    try {
      const newRef = doc(collection(db, 'chapters', chapterId, 'highlights'));
      await setDoc(newRef, {
        chapterId,
        userId: user.uid,
        text,
        color: selectedColor,
        paragraphIndex: 0,
        createdAt: Date.now()
      });
      window.getSelection()?.removeAllRanges();
      setSelectionRect(null);
      setSelectedText('');
    } catch (err) {
      console.error("Error adding highlight", err);
    }
  };

  const handleDeleteHighlight = async (highlightId: string) => {
    if (!chapterId) return;
    try {
      await deleteDoc(doc(db, 'chapters', chapterId, 'highlights', highlightId));
    } catch (err) {
      console.error("Error deleting highlight", err);
    }
  };

  const scrollToHighlight = (text: string) => {
    const executeScroll = () => {
      if (!contentRef.current) return;
      const marks = contentRef.current.querySelectorAll('mark');
      for (let i = 0; i < marks.length; i++) {
        const markText = marks[i].textContent || '';
        if (markText.trim() && text.includes(markText.trim())) {
          marks[i].scrollIntoView({ behavior: 'smooth', block: 'center' });
          marks[i].classList.add('ring-4', 'ring-indigo-500', 'ring-opacity-50', 'transition-shadow');
          setTimeout(() => {
            marks[i].classList.remove('ring-4', 'ring-indigo-500', 'ring-opacity-50');
          }, 2000);
          break;
        }
      }
    };

    if (!showHighlights) {
      setShowHighlights(true);
      setTimeout(executeScroll, 150);
    } else {
      executeScroll();
    }
  };

  if (loading) return <div className="text-center py-20 text-gray-500">Loading chapter...</div>;
  
  if (!chapter) return <div className="text-center py-20 text-gray-500">Chapter not found.</div>;

  if (chapter.status === 'draft' && !isAdmin) {
    return <div className="text-center py-20 text-gray-500">This chapter is currently in draft mode.</div>;
  }

  return (
    <>
      {chapter.order === 0 && (
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-white dark:bg-gray-950 transition-colors duration-1000">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-white/50 to-white dark:via-gray-950/50 dark:to-gray-950 opacity-100" />
          <div 
            className="absolute inset-[-50%] opacity-[0.2] dark:opacity-[0.15] mix-blend-multiply dark:mix-blend-screen animate-fog"
            style={{ 
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.005' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'repeat',
              backgroundSize: '800px 800px',
            }} 
          />
        </div>
      )}
      <div ref={containerRef} className={`max-w-3xl mx-auto space-y-12 pb-24 relative z-10 ${chapter.order === 0 ? 'mix-blend-normal' : ''}`}>
      {isFullscreen && (
        <div className="fixed top-0 left-0 w-full h-1.5 bg-gray-200 dark:bg-gray-800 z-50">
          <div 
            className="h-full bg-indigo-500 transition-all duration-150" 
            style={{ width: `${readingProgress}%` }}
          />
        </div>
      )}
      {/* Floating Highlight Menu */}
      {user && selectionRect && (
        <div 
          className="floating-highlight-menu fixed z-50 bg-white dark:bg-gray-800 shadow-xl rounded-lg border border-gray-200 dark:border-gray-700 p-2 flex items-center gap-2 transform -translate-x-1/2 -translate-y-[calc(100%+10px)]"
          style={{ 
            top: selectionRect.top, 
            left: selectionRect.left + (selectionRect.width / 2)
          }}
        >
          <select 
            value={selectedColor} 
            onChange={e => setSelectedColor(e.target.value)}
            className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md px-2 py-1.5 outline-none text-sm text-gray-900 dark:text-gray-100"
          >
            <option value="yellow">Kuning</option>
            <option value="red">Merah</option>
            <option value="green">Hijau</option>
            <option value="blue">Biru</option>
            <option value="purple">Ungu</option>
          </select>
          <button 
            onMouseDown={(e) => {
              e.preventDefault();
              handleHighlightSelection();
            }}
            className="flex items-center gap-1 bg-indigo-600 text-white px-3 py-1.5 rounded-md hover:bg-indigo-700 transition shadow-sm text-sm"
          >
            <Highlighter className="w-4 h-4" />
            Highlight
          </button>
        </div>
      )}

      {/* Restore Progress Prompt */}
      {showScrollPrompt && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-40">
          <button 
            onClick={() => {
              window.scrollTo({ top: savedScrollPos, behavior: 'smooth' });
              setShowScrollPrompt(false);
            }}
            className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-3 rounded-full shadow-lg hover:bg-indigo-700 transition"
          >
            <History className="w-5 h-5" />
            Lanjutkan Membaca
          </button>
        </div>
      )}

      {/* FABs */}
      <div className="fixed bottom-6 right-6 z-40 flex flex-col gap-3 items-end">
        {isFabMenuOpen && !showScrollPrompt && (
          <div className="flex flex-col gap-3 items-center mb-2 animate-in slide-in-from-bottom-5 opacity-100 fade-in duration-200">
            {showBackToTop && (
              <button
                onClick={() => {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                  setIsFabMenuOpen(false);
                }}
                className="p-3 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-full shadow-lg border border-gray-200 dark:border-gray-700 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
                title="Kembali ke atas"
              >
                <ArrowUp className="w-5 h-5" />
              </button>
            )}
            
            {bookmarkHistory.length > 0 && (
              <div className="relative">
                {showHistoryModal && (
                  <div className="absolute bottom-2 right-14 mb-2 w-72 max-w-[calc(100vw-3rem)] bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col z-50">
                    <div className="flex items-center justify-between p-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                      <h4 className="font-semibold text-sm flex items-center gap-2 text-gray-800 dark:text-gray-200">
                        <List className="w-4 h-4" /> Riwayat Penanda
                      </h4>
                      <button onClick={() => setShowHistoryModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="max-h-64 overflow-y-auto p-2 space-y-1">
                      {bookmarkHistory.map(item => (
                        <div key={item.id} className="relative group">
                          <button
                            onClick={() => {
                              if (contentRef.current) {
                                const y = contentRef.current.getBoundingClientRect().top + window.scrollY + item.offset - 100;
                                window.scrollTo({ top: y, behavior: 'smooth' });
                                setManualMarkerPos(item.offset);
                                setShowHistoryModal(false);
                                setIsFabMenuOpen(false);
                              }
                            }}
                            className="w-full text-left p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition flex flex-col gap-1 pr-8"
                          >
                            <span className="text-xs text-gray-400">{format(item.timestamp, 'dd MMM, HH:mm')}</span>
                            <span className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2 italic leading-relaxed">"{item.text}"</span>
                          </button>
                          
                          {deleteConfirmId === item.id ? (
                            <div className="absolute inset-y-0 right-0 flex items-center bg-gray-100 dark:bg-gray-700 rounded-r-lg px-2 shadow-l">
                              <div className="flex flex-col gap-1 items-center">
                                <span className="text-[10px] text-gray-500 font-semibold leading-none">Hapus?</span>
                                <div className="flex gap-1">
                                  <button onClick={(e) => handleDeleteBookmark(item.id, e)} className="p-1 bg-red-100 text-red-600 rounded hover:bg-red-200 transition" title="Ya">
                                    <Check className="w-3 h-3" />
                                  </button>
                                  <button onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(null); }} className="p-1 bg-gray-200 text-gray-600 rounded hover:bg-gray-300 transition" title="Batal">
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(item.id); }}
                              className="absolute top-2 right-2 p-1.5 text-gray-400 hover:text-red-500 bg-white dark:bg-gray-800 rounded-md shadow-sm opacity-0 group-hover:opacity-100 transition-opacity border border-gray-200 dark:border-gray-700"
                              title="Hapus Penanda"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <button
                  onClick={() => setShowHistoryModal(!showHistoryModal)}
                  className="p-3 bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 rounded-full shadow-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 transition"
                  title="Riwayat Penanda Manual"
                >
                  <List className="w-5 h-5" />
                </button>
              </div>
            )}
            
            <button
              onClick={() => {
                handleSetManualMark();
                setIsFabMenuOpen(false);
              }}
              className="p-3 bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 rounded-full shadow-lg border border-indigo-200 dark:border-indigo-700 hover:bg-indigo-200 dark:hover:bg-indigo-800 transition"
              title="Tandai Posisi Baca Saat Ini"
            >
              <BookmarkIcon className="w-5 h-5" />
            </button>
            
            <button
              onClick={() => {
                setShowHighlights(!showHighlights);
              }}
              className="p-3 bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 rounded-full shadow-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 transition"
              title={showHighlights ? "Sembunyikan Highlight" : "Tampilkan Highlight"}
            >
              {showHighlights ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>

            <button
              onClick={() => {
                toggleFullscreen();
                setIsFabMenuOpen(false);
              }}
              className="p-3 bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 rounded-full shadow-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 transition"
              title={isFullscreen ? "Keluar Layar Penuh" : "Layar Penuh"}
            >
              {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
            </button>
          </div>
        )}

        {!showScrollPrompt && (
          <button
            onClick={() => setIsFabMenuOpen(!isFabMenuOpen)}
            className={`p-3 rounded-full shadow-lg border transition ${
              isFabMenuOpen 
                ? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600' 
                : 'bg-indigo-600 text-white border-indigo-700 hover:bg-indigo-700'
            }`}
            title="Menu Alat"
          >
            {isFabMenuOpen ? <X className="w-5 h-5" /> : <Settings2 className="w-5 h-5" />}
          </button>
        )}
      </div>

      <div className="space-y-6">
        {!isFullscreen && (
          <Link to="/" className="text-indigo-600 dark:text-indigo-400 hover:underline text-sm">
            &larr; Menu Utama
          </Link>
        )}
        
        {!isFullscreen && (
        <header className="space-y-4">
          <div className="flex items-start justify-between">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Chapter {chapter.order}: {chapter.title}</h1>
            {user && (
              <button 
                onClick={toggleBookmark}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-indigo-600 dark:text-indigo-400"
                title={bookmarkId ? "Remove Bookmark" : "Add Bookmark"}
              >
                {bookmarkId ? <BookmarkCheck className="w-6 h-6" /> : <BookmarkIcon className="w-6 h-6" />}
              </button>
            )}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Published {format(new Date(chapter.createdAt), 'MMMM d, yyyy')}
          </div>
        </header>
        )}

        <div className="relative">
          <ChapterContent
            content={chapter.content}
            highlights={highlights}
            showHighlights={showHighlights}
            onPointerUp={handlePointerUp}
            contentRef={contentRef}
            chapterOrder={chapter.order}
          />
          
          {manualMarkerPos !== null && (
            <div 
              className="absolute left-0 w-full border-t-2 border-dashed border-indigo-500/50 pointer-events-none flex items-center z-10"
              style={{ top: manualMarkerPos }}
            >
              <div 
                className="absolute -left-4 sm:-left-8 bg-indigo-100 dark:bg-indigo-900 p-1.5 rounded-full text-indigo-600 dark:text-indigo-400 shadow-sm cursor-pointer pointer-events-auto hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900 transition"
                title="Hapus Penanda"
                onClick={() => {
                  setManualMarkerPos(null);
                  localStorage.removeItem(`manualMark_${chapterId}`);
                }}
              >
                <BookmarkIcon className="w-4 h-4 fill-current" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Highlights Section */}
      {user && highlights.length > 0 && (
        <section className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 p-6 rounded-2xl space-y-4">
          <h3 className="font-semibold text-gray-800 dark:text-gray-300 flex items-center gap-2">
            <Highlighter className="w-5 h-5" />
            Your Highlights
          </h3>
          <ul className="space-y-3">
            {highlights.map(h => {
              let borderColorClass = 'border-yellow-400';
              if (h.color === 'red') borderColorClass = 'border-red-400';
              if (h.color === 'green') borderColorClass = 'border-green-400';
              if (h.color === 'blue') borderColorClass = 'border-blue-400';
              if (h.color === 'purple') borderColorClass = 'border-purple-400';
              
              return (
                <li 
                  key={h.id} 
                  className="text-sm bg-white dark:bg-gray-900 p-3 rounded-lg border border-gray-200 dark:border-gray-800 flex items-start justify-between group cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                  onClick={() => scrollToHighlight(h.text)}
                >
                  <blockquote className={`italic border-l-2 ${borderColorClass} pl-3 text-gray-600 dark:text-gray-400`}>
                    "{h.text}"
                  </blockquote>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteHighlight(h.id);
                    }}
                    className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}


      {/* Chapter Navigation & Mark as Read */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-8 border-t border-gray-200 dark:border-gray-800">
        <Link to="/" className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium transition-colors">
          &larr; Menu Utama
        </Link>
        
        <div className="flex items-center gap-3">
          {user && (
            <button
              onClick={markAsRead}
              disabled={isRead}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-full font-medium transition-all ${isRead ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 cursor-default' : 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 hover:opacity-90 shadow-sm'}`}
            >
              {isRead ? (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  Selesai
                </>
              ) : (
                'Tandai Selesai'
              )}
            </button>
          )}
          
          {nextChapter && (
            <Link
              to={`/chapter/${nextChapter.id}`}
              onClick={() => { if (user) markAsRead(); window.scrollTo(0, 0); }}
              className="flex items-center gap-2 px-6 py-2.5 rounded-full font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-sm"
            >
              Next Chapter
              <ArrowRight className="w-5 h-5" />
            </Link>
          )}
        </div>
      </div>

      {/* Comments Section */}
      <section className="border-t border-gray-200 dark:border-gray-800 pt-12 space-y-8">
        <h2 className="text-2xl font-semibold flex items-center gap-2">
          <MessageSquare className="w-6 h-6" />
          Comments ({comments.length})
        </h2>

        {user ? (
          <form onSubmit={handlePostComment} className="space-y-4">
            <textarea
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              placeholder="Share your thoughts on this chapter..."
              className="w-full p-4 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow"
              rows={3}
            />
            <button 
              type="submit"
              disabled={!newComment.trim()}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              Post Comment
            </button>
          </form>
        ) : (
          <div className="bg-gray-50 dark:bg-gray-900/50 p-6 rounded-xl border border-gray-200 dark:border-gray-800 text-center">
            <p className="text-gray-600 dark:text-gray-400 mb-4">Sign in to join the discussion.</p>
          </div>
        )}

        <div className="space-y-6">
          {comments.map(comment => (
            <div key={comment.id} className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-700 dark:text-indigo-400 font-bold shrink-0">
                {comment.userName.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <div className="font-medium text-gray-900 dark:text-gray-100">{comment.userName}</div>
                  <div className="text-xs text-gray-500">{format(new Date(comment.createdAt), 'MMM d, yyyy h:mm a')}</div>
                </div>
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{comment.content}</p>
                {(isAdmin || (user && user.uid === comment.userId)) && (
                  <button 
                    onClick={() => handleDeleteComment(comment.id)}
                    className="text-xs text-red-500 hover:underline mt-2 inline-block"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
          
          {comments.length === 0 && (
            <p className="text-center text-gray-500 py-8">No comments yet. Be the first!</p>
          )}
        </div>
      </section>
    </div>
    </>
  );
}
