import React, { useState, useEffect } from 'react';
import { Copy, FolderOpen, Image as ImageIcon, Music, ChevronRight } from 'lucide-react';
import { Chapter } from '../types';

interface GalleryProps {
  showToast: (msg: string) => void;
  chapters?: Chapter[];
}

export default function ImageGallery({ showToast, chapters = [] }: GalleryProps) {
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [media, setMedia] = useState<{ images: string[], audios: string[] }>({ images: [], audios: [] });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (selectedChapter) {
      setIsLoading(true);
      fetch(`/api/gallery/${selectedChapter.order}`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setMedia(data.data);
          }
        })
        .catch(err => console.error("Error fetching gallery:", err))
        .finally(() => setIsLoading(false));
    }
  }, [selectedChapter]);

  const copyToClipboard = (url: string) => {
    navigator.clipboard.writeText(`[gambar: ${url}]`);
    showToast("Format gambar disalin ke clipboard!");
  };

  const copyAudioToClipboard = (url: string) => {
    navigator.clipboard.writeText(url);
    showToast("URL Audio disalin ke clipboard!");
  };

  if (selectedChapter) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setSelectedChapter(null)}
            className="text-gray-500 hover:text-indigo-600 transition flex items-center"
          >
            <FolderOpen className="w-5 h-5 mr-2" />
            Galeri
          </button>
          <ChevronRight className="w-4 h-4 text-gray-400" />
          <h2 className="text-xl font-bold">Chapter {selectedChapter.order}: {selectedChapter.title}</h2>
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6">
          {isLoading ? (
            <div className="flex justify-center p-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Images */}
              <div>
                <h3 className="font-bold text-lg flex items-center gap-2 mb-4 border-b border-gray-100 dark:border-gray-800 pb-2">
                  <ImageIcon className="w-5 h-5 text-indigo-500" />
                  Gambar ({media.images.length})
                </h3>
                {media.images.length === 0 ? (
                  <p className="text-gray-500 text-sm">Tidak ada gambar untuk chapter ini. Anda bisa drag & drop gambar di editor chapter.</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {media.images.map((url, i) => (
                      <div key={i} className="bg-gray-50 dark:bg-gray-800/50 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 hover:shadow-md transition group">
                        <div className="aspect-square bg-gray-200 dark:bg-gray-800 flex items-center justify-center overflow-hidden">
                          <img src={url} alt={`Chapter ${selectedChapter.order} - ${i+1}`} className="w-full h-full object-cover" />
                        </div>
                        <div className="p-3 space-y-2">
                          <p className="text-xs text-gray-500 truncate" title={url.split('/').pop()}>{url.split('/').pop()}</p>
                          <button 
                            onClick={() => copyToClipboard(url)}
                            className="w-full text-xs py-1.5 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400 rounded-lg hover:bg-indigo-200 dark:hover:bg-indigo-900/60 transition flex items-center justify-center gap-1"
                          >
                            <Copy className="w-3 h-3" />
                            Salin Kode
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Audio */}
              <div>
                <h3 className="font-bold text-lg flex items-center gap-2 mb-4 border-b border-gray-100 dark:border-gray-800 pb-2">
                  <Music className="w-5 h-5 text-indigo-500" />
                  Audio Voice ({media.audios.length})
                </h3>
                {media.audios.length === 0 ? (
                  <p className="text-gray-500 text-sm">Tidak ada audio voice untuk chapter ini. Letakkan file di public/audio/voice/ dengan awalan C{selectedChapter.order}.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {media.audios.map((url, i) => (
                      <div key={i} className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-3 border border-gray-200 dark:border-gray-700 flex flex-col justify-between hover:shadow-md transition">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="p-2 bg-indigo-100 dark:bg-indigo-900/40 rounded-lg text-indigo-600 dark:text-indigo-400">
                            <Music className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate" title={url.split('/').pop()}>{url.split('/').pop()}</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => copyAudioToClipboard(url)}
                          className="w-full text-xs py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition flex items-center justify-center gap-1"
                        >
                          <Copy className="w-3 h-3" />
                          Salin Path URL
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <FolderOpen className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          Galeri Chapter
        </h2>
        <p className="text-gray-500 text-sm mt-1">Pilih chapter untuk melihat daftar gambar dan audio yang digunakan.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {chapters.length === 0 ? (
          <div className="col-span-full py-12 text-center text-gray-500">
            Belum ada chapter yang dibuat.
          </div>
        ) : (
          chapters.map(chapter => (
            <button
              key={chapter.id}
              onClick={() => setSelectedChapter(chapter)}
              className="text-left bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 hover:border-indigo-500 hover:shadow-md transition-all group"
            >
              <div className="flex justify-between items-start mb-3">
                <span className="bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 text-xs font-bold px-2 py-1 rounded-md">
                  Ch {chapter.order}
                </span>
                <FolderOpen className="w-5 h-5 text-gray-400 group-hover:text-indigo-500 transition" />
              </div>
              <h3 className="font-bold text-gray-900 dark:text-gray-100 line-clamp-2">{chapter.title}</h3>
              <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                Lihat Media <ChevronRight className="w-3 h-3" />
              </p>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
