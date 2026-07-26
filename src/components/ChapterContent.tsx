import React, { useEffect, useState, useMemo } from 'react';
import Mark from 'mark.js';
import { Highlight } from '../types';
import { PlayCircle, PauseCircle, Square, Volume2, Music, SkipBack, SkipForward, Rewind, FastForward } from 'lucide-react';
import { motion, useAnimation } from 'motion/react';

interface ChapterContentProps {
  content: string;
  highlights: Highlight[];
  showHighlights: boolean;
  onPointerUp: () => void;
  contentRef: React.RefObject<HTMLDivElement>;
  chapterOrder?: number;
}

const ChapterContent = React.memo(({ content, highlights, showHighlights, onPointerUp, contentRef, chapterOrder }: ChapterContentProps) => {
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const synth = typeof window !== 'undefined' ? window.speechSynthesis : undefined;

  const nextControls = useAnimation();
  const prevControls = useAnimation();
  const playControls = useAnimation();
  const skipBackControls = useAnimation();
  const skipFwdControls = useAnimation();

  const [isPrevHovered, setIsPrevHovered] = useState(false);
  const [isNextHovered, setIsNextHovered] = useState(false);

  const paragraphs = useMemo(() => {
    let normalized = content;
    normalized = normalized.replace(/<\/(p|div|h[1-6]|ul|ol|blockquote)>/gi, '</$1>\n\n');
    // Extract sfx, music, and images to their own standalone paragraphs so they play independently
    // DO NOT extract voice/suara tags, so they stay as the identity of the text paragraph
    normalized = normalized.replace(/(\[(?:gambar|image|sfx|efek|music|lagu):\s*.*?\])/gi, '\n\n$1\n\n');
    return normalized.split(/\n\n+/).filter(p => p.trim() !== '');
  }, [content]);

  // Map each paragraph index to its corresponding text order (for MP3 voice fetching)
  const textParagraphIndexes = useMemo(() => {
    let count = 0;
    return paragraphs.map(p => {
      const plainText = p
        .replace(/\[(?:gambar|image):\s*(.*?)\]/gi, '')
        .replace(/\[(?:voice|suara|sfx|efek|music|lagu):\s*(.*?)\]/gi, '')
        .replace(/<[^>]*>?/gm, '')
        .trim();
      if (plainText.length > 0) {
        count++;
        return count;
      }
      return null;
    });
  }, [paragraphs]);

  const mediaParagraphIndexes = useMemo(() => {
    let sfxCount = 0;
    let musicCount = 0;
    
    return paragraphs.map(p => {
      if (/\[(?:sfx|efek):\s*(.*?)\]/i.test(p)) {
        sfxCount++;
        return { type: 'sfx', count: sfxCount };
      }
      if (/\[(?:music|lagu):\s*(.*?)\]/i.test(p)) {
        musicCount++;
        return { type: 'music', count: musicCount };
      }
      return null;
    });
  }, [paragraphs]);

  const totalSfx = mediaParagraphIndexes.filter(m => m?.type === 'sfx').length;
  const totalMusic = mediaParagraphIndexes.filter(m => m?.type === 'music').length;

  const getButtonTypes = React.useCallback((startIndex: number | null, direction: 1 | -1): string[] => {
    if (startIndex === null) return ['text'];
    let idx = startIndex + direction;
    let types: string[] = [];
    while (idx >= 0 && idx < paragraphs.length) {
      if (textParagraphIndexes[idx] !== null) {
        types.push('text');
        break;
      } else if (mediaParagraphIndexes[idx]?.type === 'sfx') {
        types.push('sfx');
        break;
      } else if (mediaParagraphIndexes[idx]?.type === 'music') {
        types.push('music');
        break;
      }
      idx += direction;
    }
    
    if (types.length > 0) {
      let nextIdx = idx + direction;
      while (nextIdx >= 0 && nextIdx < paragraphs.length) {
        if (textParagraphIndexes[nextIdx] !== null) {
          if (!types.includes('text')) types.push('text');
          break;
        } else if (mediaParagraphIndexes[nextIdx]?.type === 'sfx') {
          if (!types.includes('sfx')) types.push('sfx');
          break;
        } else if (mediaParagraphIndexes[nextIdx]?.type === 'music') {
          if (!types.includes('music')) types.push('music');
          break;
        }
        nextIdx += direction;
      }
    }

    return types.length > 0 ? types : ['text'];
  }, [paragraphs, textParagraphIndexes, mediaParagraphIndexes]);

  const prevTypes = useMemo(() => getButtonTypes(playingIndex, -1), [playingIndex, getButtonTypes]);
  const nextTypes = useMemo(() => getButtonTypes(playingIndex, 1), [playingIndex, getButtonTypes]);

  const getColorForType = (type: string) => {
    switch(type) {
      case 'sfx': return '#eab308'; // yellow-500
      case 'music': return '#ef4444'; // red-500
      default: return '#6366f1'; // indigo-500
    }
  };

  const getIconColor = (types: string[], isHovered: boolean) => {
    if (!isHovered) return 'currentColor';
    if (types.length === 1) return getColorForType(types[0]);
    return `url(#grad-${types[0]}-${types[1]})`;
  };

  // Apply visual highlights using mark.js
  useEffect(() => {
    if (!contentRef.current) return;
    
    const instance = new Mark(contentRef.current);
    
    if (!showHighlights || highlights.length === 0) {
      instance.unmark();
      return;
    }
    
    instance.unmark({
      done: () => {
        highlights.forEach(h => {
          let colorClass = 'bg-yellow-200 dark:bg-yellow-900/50 text-yellow-900 dark:text-yellow-100';
          if (h.color === 'red') colorClass = 'bg-red-200 dark:bg-red-900/50 text-red-900 dark:text-red-100';
          if (h.color === 'green') colorClass = 'bg-green-200 dark:bg-green-900/50 text-green-900 dark:text-green-100';
          if (h.color === 'blue') colorClass = 'bg-blue-200 dark:bg-blue-900/50 text-blue-900 dark:text-blue-100';
          if (h.color === 'purple') colorClass = 'bg-purple-200 dark:bg-purple-900/50 text-purple-900 dark:text-purple-100';
          
          instance.mark(h.text, {
            className: `rounded px-0.5 ${colorClass}`,
            separateWordSearch: false,
            diacritics: false,
            accuracy: 'partially'
          });
        });
      }
    });
    
    return () => instance.unmark();
  }, [highlights, showHighlights, content]);

  // Hybrid Audio System (MP3 + TTS Fallback)
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const currentPlaybackIndex = React.useRef<number | null>(null);

  
  const renderedParagraphs = useMemo(() => {
    const imgRegex = /\[(?:gambar|image):\s*(.*?)\]/gi;
    const audioRegex = /\[(?:voice|suara|sfx|efek|music|lagu):\s*(.*?)\]/gi;
    return paragraphs.map(p => {
      let html = p.replace(imgRegex, (match, desc) => {
        const trimmedDesc = desc ? desc.trim() : '';
        const isUrl = trimmedDesc.startsWith('http') || trimmedDesc.startsWith('/') || trimmedDesc.startsWith('data:image/');
        if (isUrl) {
          const imgUrl = trimmedDesc.startsWith('/public/') ? trimmedDesc.replace('/public/', '/') : trimmedDesc;
          return `
            <figure class="my-6 flex justify-center">
              <img src="${imgUrl}" alt="Chapter visual" class="max-w-full rounded-xl shadow-lg border border-gray-200 dark:border-gray-800 object-cover max-h-[500px]" loading="lazy" />
            </figure>
          `;
        }
        return `
          <div class="my-6 p-8 sm:p-12 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex flex-col items-center justify-center text-center gap-3 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800">
            <svg class="w-10 h-10 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <div>
              <div class="font-medium text-gray-600 dark:text-gray-300 text-base font-sans">Visual Placeholder</div>
              <div class="text-sm text-gray-400 dark:text-gray-500 mt-1 font-sans">${trimmedDesc}</div>
            </div>
          </div>
        `;
      });
      return html.replace(audioRegex, '');
    });
  }, [paragraphs]);

  const playFromIndex = (startIndex: number) => {
    stopAudio();
    setIsPaused(false);
    playNext(startIndex);
  };

  const playNext = async (index: number) => {
    if (index >= paragraphs.length) {
      stopAudio();
      return;
    }
    
    const textIndex = textParagraphIndexes[index];
    
    const currentParagraph = paragraphs[index];
    const voiceMatch = currentParagraph.match(/\[(?:voice|suara|sfx|efek|music|lagu):\s*(.*?)\]/i);
    
    // Automatically skip purely non-text paragraphs (e.g. standalone images) without UI flashing
    // BUT do not skip if it has a voice/sfx tag
    if (textIndex === null && !voiceMatch) {
      playNext(index + 1);
      return;
    }
    
    setPlayingIndex(index);
    currentPlaybackIndex.current = index;
    
    let targetAudioUrl: string | null = null;
    
    if (voiceMatch) {
      let explicitUrl = voiceMatch[1].trim();
      if (!explicitUrl.startsWith('/') && !explicitUrl.startsWith('http')) {
        if (!explicitUrl.toLowerCase().endsWith('.mp3') && !explicitUrl.toLowerCase().endsWith('.wav')) {
           explicitUrl += '.mp3';
        }
        const isSfx = /\[(?:sfx|efek):/i.test(voiceMatch[0]);
        const isMusic = /\[(?:music|lagu):/i.test(voiceMatch[0]);
        if (isSfx) {
           explicitUrl = `/audio/sfx/${explicitUrl}`;
        } else if (isMusic) {
           explicitUrl = `/audio/music/${explicitUrl}`;
        } else {
           explicitUrl = `/audio/voice/${explicitUrl}`;
        }
      } else {
        explicitUrl = explicitUrl.replace(/^\/public\//, '/');
      }
      targetAudioUrl = explicitUrl;
    } else if (chapterOrder !== undefined) {
      targetAudioUrl = `/audio/voice/C${chapterOrder}.${textIndex}.mp3`;
    }

    if (targetAudioUrl) {
      try {
        const response = await fetch(targetAudioUrl, { method: 'HEAD' });
        const contentType = response.headers.get('content-type');
        if (response.ok && contentType && (contentType.includes('audio') || contentType.includes('mpeg') || contentType.includes('octet-stream'))) {
          const audio = new Audio(targetAudioUrl);
          audio.playbackRate = playbackRate;
          audioRef.current = audio;
          
          audio.onended = () => {
            if (currentPlaybackIndex.current === index) {
              playNext(index + 1);
            }
          };
          
          audio.onerror = () => {
            if (currentPlaybackIndex.current === index) {
              if (voiceMatch && /\[(?:sfx|efek|music|lagu):/i.test(voiceMatch[0])) {
                playNext(index + 1);
              } else {
                playTTS(index);
              }
            }
          };
          
          audio.play().catch(e => {
            if (currentPlaybackIndex.current === index) {
              console.warn("Audio play failed, falling back to TTS", e);
              if (voiceMatch && /\[(?:sfx|efek|music|lagu):/i.test(voiceMatch[0])) {
                playNext(index + 1);
              } else {
                playTTS(index);
              }
            }
          });
          return;
        }
      } catch (err) {
        console.warn("Fetch audio failed", err);
      }
    }
    
    if (currentPlaybackIndex.current === index) {
      if (voiceMatch && /\[(?:sfx|efek|music|lagu):/i.test(voiceMatch[0])) {
        playNext(index + 1);
      } else {
        playTTS(index);
      }
    }
  };

  const playTTS = (index: number) => {
    if (!synth) {
      console.warn("Speech synthesis is not supported in this browser.");
      return;
    }
    
    // Hapus seluruh tag gambar dan suara agar TTS tidak mencoba membaca tag
    let plainText = paragraphs[index]
      .replace(/\[(?:gambar|image):\s*(.*?)\]/gi, '')
      .replace(/\[(?:voice|suara|sfx|efek|music|lagu):\s*(.*?)\]/gi, '');
    plainText = plainText.replace(/<[^>]*>?/gm, '').trim();

    if (!plainText) {
      // Jika paragraf hanya berisi gambar tanpa teks, langsung lanjut ke paragraf berikutnya
      setTimeout(() => {
        if (currentPlaybackIndex.current === index) {
          playNext(index + 1);
        }
      }, 300);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(plainText);
    utterance.lang = 'id-ID'; // Indonesian
    utterance.rate = playbackRate;
    
    utterance.onend = () => {
      if (currentPlaybackIndex.current === index) {
        playNext(index + 1);
      }
    };
    
    utterance.onerror = (e) => {
      if (e.error === 'interrupted' || e.error === 'canceled') {
        return; // Ignore normal interruption/cancellation events
      }
      if (currentPlaybackIndex.current !== index) return; // Ignore intentionally cancelled
      console.warn("Speech error", e);
      // If we get an error (like autoplay policy), we should stop to prevent an infinite loop
      stopAudio();
    };
    
    try {
      synth.cancel(); // Clear any ongoing speech before starting a new one
      synth.speak(utterance);
    } catch (err) {
      console.warn("Error invoking speak:", err);
      stopAudio();
    }
  };

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeAttribute('src');
      audioRef.current.load();
      audioRef.current = null;
    }
    currentPlaybackIndex.current = null;
    if (synth) {
      try {
        synth.cancel();
      } catch (err) {
        console.warn("Error cancelling speech:", err);
      }
    }
    setPlayingIndex(null);
    setIsPaused(false);
  };

  const togglePause = () => {
    playControls.start({
      scale: [1, 1.3, 1],
      rotate: [0, 15, -15, 0],
      transition: { duration: 0.3 }
    });
    if (isPaused) {
      if (audioRef.current) {
        audioRef.current.play();
      } else if (synth) {
        try {
          synth.resume();
        } catch (err) {
          console.warn("Error resuming speech:", err);
        }
      }
      setIsPaused(false);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      } else if (synth) {
        try {
          synth.pause();
        } catch (err) {
          console.warn("Error pausing speech:", err);
        }
      }
      setIsPaused(true);
    }
  };

  const skipTime = (amount: number) => {
    if (amount > 0) {
      skipFwdControls.start({
        rotate: [0, 90, 0],
        scale: [1, 1.3, 1],
        transition: { duration: 0.3 }
      });
    } else {
      skipBackControls.start({
        rotate: [0, -90, 0],
        scale: [1, 1.3, 1],
        transition: { duration: 0.3 }
      });
    }
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime + amount);
    }
  };

  const skipToPreviousParagraph = () => {
    prevControls.start({
      x: [0, -50, 50, 0],
      opacity: [1, 0, 0, 1],
      scale: [1, 0.5, 0.5, 1],
      skewX: [0, 30, -30, 0],
      transition: { duration: 0.5, times: [0, 0.3, 0.4, 1], ease: "easeInOut" }
    });
    if (playingIndex !== null && playingIndex > 0) {
      let prevIndex = playingIndex - 1;
      while (prevIndex >= 0 && textParagraphIndexes[prevIndex] === null && mediaParagraphIndexes[prevIndex] === null) {
        prevIndex--;
      }
      if (prevIndex >= 0) {
        playFromIndex(prevIndex);
      }
    }
  };

  const skipToNextParagraph = () => {
    nextControls.start({
      x: [0, 50, -50, 0],
      opacity: [1, 0, 0, 1],
      scale: [1, 0.5, 0.5, 1],
      skewX: [0, -30, 30, 0],
      transition: { duration: 0.5, times: [0, 0.3, 0.4, 1], ease: "easeInOut" }
    });
    if (playingIndex !== null && playingIndex < paragraphs.length - 1) {
      let nextIndex = playingIndex + 1;
      while (nextIndex < paragraphs.length && textParagraphIndexes[nextIndex] === null && mediaParagraphIndexes[nextIndex] === null) {
        nextIndex++;
      }
      if (nextIndex < paragraphs.length) {
        playFromIndex(nextIndex);
      }
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      if (playingIndex !== null) {
        switch (e.key) {
          case ' ':
            e.preventDefault();
            togglePause();
            break;
          case 'ArrowLeft':
            e.preventDefault();
            skipTime(-3);
            break;
          case 'ArrowRight':
            e.preventDefault();
            skipTime(3);
            break;
          case 'ArrowUp':
            e.preventDefault();
            skipToPreviousParagraph();
            break;
          case 'ArrowDown':
            e.preventDefault();
            skipToNextParagraph();
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [playingIndex, isPaused, paragraphs.length, textParagraphIndexes]);

  // Stop audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.removeAttribute('src');
      }
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        try {
          window.speechSynthesis.cancel();
        } catch (err) {
          console.warn("Error cancelling speech on unmount:", err);
        }
      }
    };
  }, []);

  // Scroll to playing paragraph
  useEffect(() => {
    if (playingIndex !== null) {
      const element = document.getElementById(`paragraph-${playingIndex}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [playingIndex]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  const cyclePlaybackRate = () => {
    const rates = [0.75, 1, 1.25, 1.5, 2];
    const currentIndex = rates.indexOf(playbackRate);
    const nextIndex = (currentIndex + 1) % rates.length;
    setPlaybackRate(rates[nextIndex]);
  };

  return (
    <div className="relative">
      <svg width="0" height="0" className="absolute pointer-events-none">
        <defs>
          {['text', 'sfx', 'music'].flatMap(t1 => 
            ['text', 'sfx', 'music'].map(t2 => (
              <linearGradient key={`${t1}-${t2}`} id={`grad-${t1}-${t2}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="50%" stopColor={getColorForType(t1)} />
                <stop offset="50%" stopColor={getColorForType(t2)} />
              </linearGradient>
            ))
          )}
        </defs>
      </svg>
      {/* Narrator Character (Yuki) */}
      {playingIndex !== null && (
        <div className="fixed bottom-0 left-0 sm:left-8 md:left-16 lg:left-24 z-40 pointer-events-none fade-in slide-in-from-bottom-10 animate-in duration-700">
          <img 
            src={`/sprite/Yuiki.png`} 
            alt="Yuki Narrator" 
            className={`w-32 sm:w-48 md:w-64 lg:w-72 object-contain transition-transform duration-500 ${!isPaused ? 'scale-105' : 'scale-100 opacity-80'}`}
            style={{ 
              filter: 'drop-shadow(0 15px 25px rgba(0,0,0,0.3))',
              transformOrigin: 'bottom center'
            }}
          />
        </div>
      )}

      {/* Floating Audio Controller */}
      {playingIndex !== null && (
        <div className="fixed bottom-6 sm:bottom-12 left-1/2 transform -translate-x-1/2 z-50 bg-white dark:bg-gray-800 shadow-2xl rounded-full border border-gray-200 dark:border-gray-700 px-4 sm:px-6 py-2 sm:py-3 flex items-center gap-2 sm:gap-3 fade-in slide-in-from-bottom-4 animate-in duration-300">
          <div className="hidden sm:flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
             <Volume2 className={`w-4 h-4 sm:w-5 sm:h-5 ${!isPaused ? 'animate-pulse' : ''}`} />
             <span className="text-xs sm:text-sm font-medium whitespace-nowrap">
               {textParagraphIndexes[playingIndex] !== null 
                 ? `Paragraf ${textParagraphIndexes[playingIndex]} / ${textParagraphIndexes.filter(x => x !== null).length}`
                 : mediaParagraphIndexes[playingIndex]?.type === 'sfx' 
                   ? `SFX ${mediaParagraphIndexes[playingIndex].count} / ${totalSfx}`
                   : mediaParagraphIndexes[playingIndex]?.type === 'music'
                     ? `Music ${mediaParagraphIndexes[playingIndex].count} / ${totalMusic}`
                     : 'Audio'}
             </span>
          </div>
          <div className="hidden sm:block w-px h-5 sm:h-6 bg-gray-200 dark:bg-gray-700 mx-1 sm:mx-2"></div>
          
          <motion.button 
            animate={prevControls}
            whileTap={{ scale: 0.85, opacity: 0.7 }}
            onClick={skipToPreviousParagraph} 
            onMouseEnter={() => setIsPrevHovered(true)}
            onMouseLeave={() => setIsPrevHovered(false)}
            className="text-gray-600 dark:text-gray-300 transition-colors p-1" 
            title="Paragraf Sebelumnya (Panah Atas)"
          >
            <SkipBack className="w-4 h-4 sm:w-5 sm:h-5" color={getIconColor(prevTypes, isPrevHovered)} />
          </motion.button>
          <motion.button 
            animate={skipBackControls}
            whileTap={{ scale: 0.85 }}
            onClick={() => skipTime(-3)} 
            className="text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors p-1" 
            title="Mundur 3 detik (Panah Kiri)"
          >
            <Rewind className="w-4 h-4 sm:w-5 sm:h-5" />
          </motion.button>
          
          <motion.button 
            animate={playControls}
            whileTap={{ scale: 0.7 }}
            onClick={togglePause} 
            className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors p-1 mx-1 sm:mx-2" 
            title="Putar/Jeda (Spasi)"
          >
             {isPaused ? <PlayCircle className="w-6 h-6 sm:w-7 sm:h-7" /> : <PauseCircle className="w-6 h-6 sm:w-7 sm:h-7" />}
          </motion.button>

          <motion.button 
            animate={skipFwdControls}
            whileTap={{ scale: 0.85 }}
            onClick={() => skipTime(3)} 
            className="text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors p-1" 
            title="Maju 3 detik (Panah Kanan)"
          >
            <FastForward className="w-4 h-4 sm:w-5 sm:h-5" />
          </motion.button>
          <motion.button 
            animate={nextControls}
            whileTap={{ scale: 0.85, opacity: 0.7 }}
            onClick={skipToNextParagraph} 
            onMouseEnter={() => setIsNextHovered(true)}
            onMouseLeave={() => setIsNextHovered(false)}
            className="text-gray-600 dark:text-gray-300 transition-colors p-1" 
            title="Paragraf Berikutnya (Panah Bawah)"
          >
            <SkipForward className="w-4 h-4 sm:w-5 sm:h-5" color={getIconColor(nextTypes, isNextHovered)} />
          </motion.button>

          <div className="w-px h-5 sm:h-6 bg-gray-200 dark:bg-gray-700 mx-1 sm:mx-2"></div>
          
          <motion.button 
            whileTap={{ scale: 0.9 }}
            onClick={cyclePlaybackRate} 
            className="text-xs sm:text-sm font-bold text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors px-2 py-1 w-10 sm:w-12 text-center" 
            title="Kecepatan Putar"
          >
             {playbackRate}x
          </motion.button>

          <div className="w-px h-5 sm:h-6 bg-gray-200 dark:bg-gray-700 mx-1 sm:mx-2"></div>
          <motion.button 
            whileTap={{ scale: 0.7, rotate: -15, y: 5 }}
            transition={{ type: "spring", stiffness: 300, damping: 15 }}
            onClick={stopAudio} 
            className="text-gray-600 dark:text-gray-300 hover:text-red-500 dark:hover:text-red-400 transition-colors p-1" 
            title="Berhenti"
          >
             <Square className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
          </motion.button>
        </div>
      )}

      <div 
        ref={contentRef}
        onMouseUp={onPointerUp}
        onTouchEnd={onPointerUp}
        className="prose prose-lg dark:prose-invert max-w-none font-serif leading-relaxed text-gray-800 dark:text-gray-200 chapter-content selection:bg-indigo-200 dark:selection:bg-indigo-900/50"
      >
        {paragraphs.map((p, idx) => {
          const isPlayable = textParagraphIndexes[idx] !== null || /\[(?:voice|suara|sfx|efek|music|lagu):\s*(.*?)\]/i.test(p);
          
          if (!isPlayable) {
            const isEmpty = !renderedParagraphs[idx].trim();
            if (isEmpty) return null;
            return (
              <div key={idx} className="mb-6">
                <div className="whitespace-pre-wrap m-0" dangerouslySetInnerHTML={{ __html: renderedParagraphs[idx] }} />
              </div>
            );
          }

          const hasOnlyAudioTag = textParagraphIndexes[idx] === null;
          const isSfxTag = /\[(?:sfx|efek):/i.test(p);
          const isMusicTag = /\[(?:music|lagu):/i.test(p);

          return (
          <div 
            key={idx} 
            id={`paragraph-${idx}`}
            className={`relative group transition-colors duration-300 pl-10 sm:pl-0 ${playingIndex === idx && !hasOnlyAudioTag ? 'bg-indigo-50 dark:bg-indigo-900/30 rounded-xl p-4 sm:p-4 -mx-4 shadow-sm border border-indigo-100 dark:border-indigo-800/50' : 'mb-6'}`}
          >
            {/* Play Button - appears on hover */}
            <div className={`absolute left-0 top-1 sm:-left-16 flex items-center justify-center transition-opacity duration-200 z-10 ${hasOnlyAudioTag ? (playingIndex === idx ? 'opacity-100' : 'opacity-30 sm:opacity-0 sm:group-hover:opacity-100') : 'opacity-60 sm:opacity-0 sm:group-hover:opacity-100'}`}>
              <button 
                onClick={() => playingIndex === idx ? stopAudio() : playFromIndex(idx)}
                className={`p-2.5 rounded-full shadow-sm border transition-all duration-200 hover:scale-105 ${playingIndex === idx ? 'bg-indigo-100 dark:bg-indigo-800 border-indigo-200 dark:border-indigo-700 text-indigo-600 dark:text-indigo-300' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-400 hover:text-indigo-500 hover:border-indigo-300'}`}
                title={playingIndex === idx ? "Hentikan suara" : "Mainkan suara"}
              >
                 {playingIndex === idx ? <Square className="w-4 h-4 fill-current" /> : (hasOnlyAudioTag ? (isMusicTag ? <Music className="w-4 h-4" /> : isSfxTag ? <Volume2 className="w-4 h-4" /> : <PlayCircle className="w-4 h-4" />) : <PlayCircle className="w-4 h-4" />)}
              </button>
            </div>
            {hasOnlyAudioTag ? (
              <div className="h-6 flex items-center text-xs text-gray-400 italic">
                {isSfxTag ? '🎵 Sound Effect' : isMusicTag ? '🎼 Music Track' : '🎤 Voice Audio'}
              </div>
            ) : (
              <div className={`whitespace-pre-wrap m-0 transition-colors duration-300 ${playingIndex === idx ? 'text-indigo-900 dark:text-indigo-100 font-medium' : ''}`} dangerouslySetInnerHTML={{ __html: renderedParagraphs[idx] }} />
            )}
          </div>
        )})}
      </div>
    </div>
  );
}, (prev, next) => {
  return prev.content === next.content && 
         prev.showHighlights === next.showHighlights && 
         prev.chapterOrder === next.chapterOrder &&
         JSON.stringify(prev.highlights) === JSON.stringify(next.highlights);
});

export default ChapterContent;