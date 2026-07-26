import React, { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, onSnapshot, doc, setDoc, deleteDoc, updateDoc, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Chapter, UserProfile } from '../types';
import {   Plus, Edit2, Trash2, CheckCircle2, XCircle, Shield, UploadCloud, Search, ChevronUp, ChevronDown , Info , Image as ImageIcon, AlertTriangle, Bug, Volume2, Music } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { validateChapterContent } from '../utils/validateRenderer';
import ImageGallery from './ImageGallery';
import * as mammoth from 'mammoth';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'chapters' | 'gallery'>('chapters');
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [formData, setFormData] = useState({ title: '', content: '', order: 1, status: 'draft' as 'draft' | 'published' });
  const [adminEmailInput, setAdminEmailInput] = useState('');
  const [chapterToDelete, setChapterToDelete] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const [showFind, setShowFind] = useState(false);
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [matches, setMatches] = useState<number[]>([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(-1);
  
  const { isAdmin, user } = useAuth();

  useEffect(() => {
    if (!findText) {
      setMatches([]);
      setCurrentMatchIndex(-1);
      return;
    }
    const text = formData.content;
    const lowerText = text.toLowerCase();
    const lowerFind = findText.toLowerCase();
    const newMatches = [];
    let idx = lowerText.indexOf(lowerFind);
    while (idx !== -1) {
      newMatches.push(idx);
      idx = lowerText.indexOf(lowerFind, idx + 1);
    }
    setMatches(newMatches);
    if (newMatches.length > 0) {
      setCurrentMatchIndex(0);
    } else {
      setCurrentMatchIndex(-1);
    }
  }, [findText, formData.content]);

  const focusMatch = (index: number) => {
    const start = matches[index];
    const textarea = textareaRef.current;
    if (textarea && start !== undefined) {
       textarea.focus();
       textarea.setSelectionRange(start, start + findText.length);
    }
  };

  
  const handleInsertImage = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    const chapterOrder = formData.order || 0;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentScrollTop = textarea.scrollTop;
    const currentContent = formData.content;
    // Insert a temporary marker 'X'
    const textToInsert = `\n[gambar: /public/image/C${chapterOrder}/C${chapterOrder}.X.png]\n`;
    
    let newContent = currentContent.substring(0, start) + textToInsert + currentContent.substring(end);
    
    // Auto-renumber all images that match the pattern /image/ or /public/image/ for this chapter
    let imageIndex = 1;
    const regex = new RegExp(`\\[(gambar|image):\\s*(?:/public)?/image/C${chapterOrder}/C${chapterOrder}\\.(?:\\d+|X)\\.(png|jpe?g|gif|webp)\\]`, 'gi');
    newContent = newContent.replace(regex, (match, tag, ext) => {
      return `[${tag}: /public/image/C${chapterOrder}/C${chapterOrder}.${imageIndex++}.${ext}]`;
    });
    
    setFormData({ ...formData, content: newContent });
    
    // Set cursor position after inserted text
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + textToInsert.length, start + textToInsert.length);
      textarea.scrollTop = currentScrollTop;
    }, 0);
  };

  const handleInsertVoice = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    const chapterOrder = formData.order || 0;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentScrollTop = textarea.scrollTop;
    const currentContent = formData.content;

    // Insert inline without newlines so it attaches to the paragraph
    const textToInsert = `[voice: C${chapterOrder}.X.mp3]`;
    
    let newContent = currentContent.substring(0, start) + textToInsert + currentContent.substring(end);
    
    // Auto-renumber all voice tags that match the pattern for this chapter
    let voiceIndex = 1;
    const regex = new RegExp(`\\[(voice|suara):\\s*C${chapterOrder}\\.(?:\\d+|X)\\.mp3\\]`, 'gi');
    newContent = newContent.replace(regex, (match, tag) => {
      return `[${tag}: C${chapterOrder}.${voiceIndex++}.mp3]`;
    });
    
    setFormData({ ...formData, content: newContent });
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + textToInsert.length, start + textToInsert.length);
      textarea.scrollTop = currentScrollTop;
    }, 0);
  };

  const handleInsertSFX = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentScrollTop = textarea.scrollTop;
    const currentContent = formData.content;

    const textToInsert = `\n[sfx: sound.mp3]\n`;
    
    const newContent = currentContent.substring(0, start) + textToInsert + currentContent.substring(end);
    
    setFormData({ ...formData, content: newContent });
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + 7, start + 16);
      textarea.scrollTop = currentScrollTop;
    }, 0);
  };

  const handleInsertMusic = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentScrollTop = textarea.scrollTop;
    const currentContent = formData.content;

    const textToInsert = `\n[music: song.mp3]\n`;
    
    const newContent = currentContent.substring(0, start) + textToInsert + currentContent.substring(end);
    
    setFormData({ ...formData, content: newContent });
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + 9, start + 17);
      textarea.scrollTop = currentScrollTop;
    }, 0);
  };

  const handleFindNext = () => {
    if (matches.length === 0) return;
    const nextIndex = (currentMatchIndex + 1) % matches.length;
    setCurrentMatchIndex(nextIndex);
    focusMatch(nextIndex);
  };

  const handleFindPrev = () => {
    if (matches.length === 0) return;
    const prevIndex = currentMatchIndex <= 0 ? matches.length - 1 : currentMatchIndex - 1;
    setCurrentMatchIndex(prevIndex);
    focusMatch(prevIndex);
  };

  const handleReplace = () => {
    if (currentMatchIndex === -1 || matches.length === 0) return;
    const start = matches[currentMatchIndex];
    const before = formData.content.substring(0, start);
    const after = formData.content.substring(start + findText.length);
    const newContent = before + replaceText + after;
    setFormData({ ...formData, content: newContent });
  };

  const handleReplaceAll = () => {
    if (!findText) return;
    const regex = new RegExp(findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    const newContent = formData.content.replace(regex, replaceText);
    setFormData({ ...formData, content: newContent });
  };

  useEffect(() => {
    if (!isAdmin) return;
    
    const q = query(collection(db, 'chapters'), orderBy('order', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setChapters(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Chapter)));
    });

    return () => unsubscribe();
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <div className="text-center py-20 space-y-4">
        <h2 className="text-2xl font-bold text-red-500">Access Denied</h2>
        <p className="text-gray-600 dark:text-gray-400">You do not have administrative privileges.</p>
        <p className="text-sm text-gray-500">If you are the owner, please log in with your primary account to grant access to this account.</p>
      </div>
    );
  }

  const handleSave = async () => {
    try {
      if (isEditing === 'new') {
        const newRef = doc(collection(db, 'chapters'));
        await setDoc(newRef, {
          ...formData,
          order: Number(formData.order),
          createdAt: Date.now(),
          updatedAt: Date.now()
        });
      } else if (isEditing) {
        await updateDoc(doc(db, 'chapters', isEditing), {
          ...formData,
          order: Number(formData.order),
          updatedAt: Date.now()
        });
      }
      setIsEditing(null);
      setFormData({ title: '', content: '', order: chapters.length + 2, status: 'draft' });
    } catch (error) {
      console.error("Error saving chapter:", error);
      showToast("Failed to save chapter.");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'chapters', id));
      setChapterToDelete(null);
    } catch (error) {
      console.error("Error deleting chapter:", error);
      // fallback if toast/alert needed, but alert might be blocked. Just log for now.
    }
  };

  const handleGrantAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminEmailInput.trim()) return;
    
    try {
      const q = query(collection(db, 'users'), where('email', '==', adminEmailInput.trim()));
      const snap = await getDocs(q);
      
      if (snap.empty) {
        showToast("User not found! They must sign in to the website at least once before you can make them an admin.");
        return;
      }
      
      const userDoc = snap.docs[0];
      await updateDoc(doc(db, 'users', userDoc.id), {
        role: 'admin'
      });
      showToast(`Successfully granted Admin role to ${adminEmailInput}`);
      setAdminEmailInput('');
    } catch (err) {
      console.error("Error granting admin", err);
      showToast("Failed to grant admin role. Check permissions.");
    }
  };



  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      if (file.name.endsWith('.docx')) {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.convertToHtml({ arrayBuffer });
        setFormData(prev => ({ ...prev, content: result.value }));
      } else if (file.name.endsWith('.txt')) {
        const text = await file.text();
        const html = text.split('\n\n').map(p => `<p>${p.replace(/\n/g, '<br/>')}</p>`).join('');
        setFormData(prev => ({ ...prev, content: html }));
      } else {
        showToast("Format file tidak didukung. Harap unggah file .docx (Google Docs/Word) atau .txt");
      }
    } catch (err) {
      console.error("Error parsing file", err);
      showToast("Terjadi kesalahan saat membaca file.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="space-y-8">
      {/* Admin Tabs */}
      <div className="flex items-center gap-4 border-b border-gray-200 dark:border-gray-800 pb-4">
        <button
          onClick={() => setActiveTab('chapters')}
          className={`px-4 py-2 font-medium transition ${activeTab === 'chapters' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
        >
          Kelola Chapter
        </button>
        <button
          onClick={() => setActiveTab('gallery')}
          className={`px-4 py-2 font-medium transition ${activeTab === 'gallery' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
        >
          Galeri Gambar
        </button>
      </div>

      {activeTab === 'gallery' ? (
        <ImageGallery showToast={showToast} chapters={chapters} />
      ) : (
      <>
      {/* Chapter Management Section */}
      <div className="space-y-12">
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Manage Chapters</h1>
          <button
            onClick={() => {
              setFormData({ title: '', content: '', order: chapters.length + 1, status: 'draft' });
              setIsEditing('new');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
          >
            <Plus className="w-4 h-4" />
            New Chapter
          </button>
        </div>

        {isEditing && (
          <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 space-y-4">
            <h2 className="text-xl font-semibold">{isEditing === 'new' ? 'Create Chapter' : 'Edit Chapter'}</h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 md:col-span-1">
                <label className="block text-sm font-medium mb-1">Title</label>
                <input 
                  type="text" 
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-transparent" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Order</label>
                <input 
                  type="number" 
                  value={formData.order}
                  onChange={e => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                  className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-transparent" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Status</label>
                <select 
                  value={formData.status}
                  onChange={e => setFormData({ ...formData, status: e.target.value as 'draft' | 'published' })}
                  className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-transparent"
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </select>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium">Content (HTML generated from upload, or type directly)</label>
                <div className="flex flex-wrap items-center gap-2">
                  <button 
                    type="button"
                    onClick={handleInsertVoice}
                    className="flex items-center gap-2 text-sm bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                    title="Sisipkan Suara (Voice)"
                  >
                    <Volume2 className="w-4 h-4" />
                    Sisipkan Voice
                  </button>
                  <button 
                    type="button"
                    onClick={handleInsertSFX}
                    className="flex items-center gap-2 text-sm bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                    title="Sisipkan Efek Suara (SFX)"
                  >
                    <Volume2 className="w-4 h-4" />
                    Sisipkan SFX
                  </button>
                  <button 
                    type="button"
                    onClick={handleInsertMusic}
                    className="flex items-center gap-2 text-sm bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                    title="Sisipkan Musik (Lagu)"
                  >
                    <Music className="w-4 h-4" />
                    Sisipkan Music
                  </button>
                  <button 
                    type="button"
                    onClick={handleInsertImage}
                    className="flex items-center gap-2 text-sm bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                    title="Sisipkan Gambar"
                  >
                    <ImageIcon className="w-4 h-4" />
                    Sisipkan Gambar
                  </button>
                  <button 
                    type="button"
                    onClick={() => setShowFind(!showFind)}
                    className="flex items-center gap-2 text-sm bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                    title="Cari dan Ganti"
                  >
                    <Search className="w-4 h-4" />
                    Cari & Ganti
                  </button>
                  <input 
                    type="file" 
                    accept=".docx,.txt"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                  />
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="flex items-center gap-2 text-sm bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 px-3 py-1.5 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition disabled:opacity-50"
                  >
                    <UploadCloud className="w-4 h-4" />
                    {isUploading ? 'Uploading...' : 'Upload .docx / .txt'}
                  </button>
                </div>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Tip: Anda dapat menulis di Google Docs, klik File &gt; Download &gt; Microsoft Word (.docx), lalu unggah file tersebut ke sini. Semua format paragraf, spasi, huruf tebal dan miring akan otomatis terbaca.
              </p>
              {showFind && (
                <div className="flex flex-wrap items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-2">
                    <input 
                      type="text"
                      placeholder="Cari kata..."
                      value={findText}
                      onChange={e => setFindText(e.target.value)}
                      className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 outline-none focus:border-indigo-500 w-40"
                    />
                    <span className="text-xs text-gray-500 whitespace-nowrap w-12 text-center">
                      {matches.length > 0 ? `${currentMatchIndex + 1} / ${matches.length}` : '0/0'}
                    </span>
                    <div className="flex items-center border border-gray-300 dark:border-gray-600 rounded-md overflow-hidden">
                      <button type="button" onClick={handleFindPrev} className="p-1.5 bg-white dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 border-r border-gray-300 dark:border-gray-600">
                        <ChevronUp className="w-4 h-4" />
                      </button>
                      <button type="button" onClick={handleFindNext} className="p-1.5 bg-white dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800">
                        <ChevronDown className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="w-px h-6 bg-gray-300 dark:bg-gray-700 hidden sm:block"></div>
                  <div className="flex items-center gap-2">
                    <input 
                      type="text"
                      placeholder="Ganti dengan..."
                      value={replaceText}
                      onChange={e => setReplaceText(e.target.value)}
                      className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 outline-none focus:border-indigo-500 w-40"
                    />
                    <button 
                      type="button"
                      onClick={handleReplace}
                      disabled={matches.length === 0}
                      className="text-sm px-3 py-1.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
                    >
                      Ganti
                    </button>
                    <button 
                      type="button"
                      onClick={handleReplaceAll}
                      disabled={matches.length === 0}
                      className="text-sm px-3 py-1.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
                    >
                      Ganti Semua
                    </button>
                  </div>
                </div>
              )}
              <textarea 
                ref={textareaRef}
                value={formData.content}
                onChange={e => setFormData({ ...formData, content: e.target.value })}
                className="w-full p-4 border border-gray-300 dark:border-gray-700 rounded-lg bg-transparent h-64 font-mono text-sm"
                placeholder="Tulis draf chapter Anda di sini.\nGunakan tombol di atas untuk sisipkan gambar atau efek suara."
               />
              <p className="text-xs text-gray-500 mt-2 flex flex-col gap-1">
                <span className="flex items-center gap-1"><Info className="w-3 h-3" /> Tips:</span>
                <span>- Gunakan <code>[gambar: link-url]</code> untuk gambar.</span>
                <span>- Gunakan <code>[sfx: efek.mp3]</code> atau <code>[music: lagu.mp3]</code> di baris baru. Teks biasa otomatis mendapat urutan suara terpisah.</span>
              </p>

              {/* Renderer & TTS Diagnostic Validator UI */}
              {(() => {
                const validation = validateChapterContent(formData.content);
                return formData.content ? (
                  <div className="mt-3 p-4 bg-gray-50 dark:bg-gray-800/20 border border-gray-200 dark:border-gray-800 rounded-xl space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                        <Bug className="w-3.5 h-3.5 text-indigo-500" />
                        Analisis Integritas & Fitur TTS (Live)
                      </span>
                      <span className={`px-2 py-0.5 rounded-full font-semibold ${
                        validation.passed 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                          : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                        {validation.passed ? '✓ Valid' : '✗ Butuh Perbaikan'}
                      </span>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-gray-500 dark:text-gray-400">
                      <div>Paragraf: <strong className="text-gray-700 dark:text-gray-200">{validation.stats.totalParagraphs}</strong></div>
                      <div>Gambar Terdeteksi: <strong className="text-gray-700 dark:text-gray-200">{validation.stats.imageTagsFound}</strong></div>
                      <div>Gambar Base64: <strong className="text-gray-700 dark:text-gray-200">{validation.stats.base64ImagesFound}</strong></div>
                      <div>Rata-rata Panjang TTS: <strong className="text-gray-700 dark:text-gray-200">{validation.stats.avgTtsPayloadLength} karakter</strong></div>
                    </div>

                    {/* Errors & Warnings */}
                    {(validation.errors.length > 0 || validation.warnings.length > 0) && (
                      <div className="mt-2 space-y-1 divide-y divide-gray-100 dark:divide-gray-800/40">
                        {validation.errors.map((err, i) => (
                          <div key={`err-${i}`} className="pt-1 flex items-start gap-1.5 text-red-600 dark:text-red-400 font-medium">
                            <XCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                            <span>{err}</span>
                          </div>
                        ))}
                        {validation.warnings.map((warn, i) => (
                          <div key={`warn-${i}`} className="pt-1 flex items-start gap-1.5 text-amber-600 dark:text-amber-400">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                            <span>{warn}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {validation.passed && validation.stats.imageTagsFound > 0 && (
                      <p className="text-green-600 dark:text-green-400 flex items-center gap-1.5 pt-1">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        Semua tag gambar dan media terintegrasi dengan aman untuk speech synthesis (TTS).
                      </p>
                    )}
                  </div>
                ) : null;
              })()}
            </div>

            <div className="flex items-center gap-3 justify-end pt-4">
              <button 
                onClick={() => setIsEditing(null)}
                className="px-4 py-2 text-gray-500 hover:text-gray-900 dark:hover:text-gray-100"
              >
                Cancel
              </button>
              <button 
                onClick={handleSave}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Save Chapter
              </button>
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400">
              <tr>
                <th className="px-6 py-4 font-medium">Order</th>
                <th className="px-6 py-4 font-medium">Title</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {chapters.map(chapter => (
                <tr key={chapter.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/20 transition-colors cursor-pointer sm:cursor-default" onClick={() => { setFormData({ title: chapter.title, content: chapter.content, order: chapter.order, status: chapter.status }); setIsEditing(chapter.id); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
                  <td className="px-6 py-4">{chapter.order}</td>
                  <td className="px-6 py-4 font-medium">{chapter.title}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      chapter.status === 'published' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                    }`}>
                      {chapter.status === 'published' ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                      {chapter.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setFormData({ title: chapter.title, content: chapter.content, order: chapter.order, status: chapter.status });
                          setIsEditing(chapter.id);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="p-2 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition hidden sm:inline-flex"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setChapterToDelete(chapter.id); }}
                        className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {chapters.length === 0 && (
            <div className="p-8 text-center text-gray-500">No chapters found.</div>
          )}
        </div>
      </section>

      {/* Role Management Section */}
      <section className="bg-gray-50 dark:bg-gray-900/50 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 space-y-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Shield className="w-5 h-5 text-indigo-500" />
          Admin Management
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 max-w-xl">
          Grant admin access to another account (like your writing account). 
          The user MUST sign in to this website at least once before you can grant them access.
        </p>
        
        <form onSubmit={handleGrantAdmin} className="flex items-center gap-3 max-w-md">
          <input
            type="email"
            value={adminEmailInput}
            onChange={e => setAdminEmailInput(e.target.value)}
            placeholder="writing-account@gmail.com"
            className="flex-1 p-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 outline-none focus:border-indigo-500"
            required
          />
          <button 
            type="submit"
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
          >
            Grant Admin
          </button>
        </form>
      </section>
      </div>
      </>
      )}
      
      {/* Delete Confirmation Modal */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-[200] bg-gray-900 text-white px-6 py-3 rounded-xl shadow-2xl animate-in fade-in slide-in-from-top-5">
          {toastMessage}
        </div>
      )}
      
      {chapterToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-lg font-bold mb-2">Hapus Chapter?</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">Tindakan ini tidak dapat dibatalkan.</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setChapterToDelete(null)}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
              >
                Batal
              </button>
              <button
                onClick={() => handleDelete(chapterToDelete)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
