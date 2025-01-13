import React, { useState, useEffect, useRef } from 'react';
import { Heart, MessageCircle, Share2, Folder } from 'lucide-react';

  /**
   * App component for the TikTok style video player.
   * 
   * This component manages the state of the video player, including the list of videos,
   * the current index, and the directory handle for the folder containing the videos.
   * It also handles the logic for loading videos from the directory and switching between videos.
   * The component renders a video container with a scrollable list of videos, and navigation buttons for
   * scrolling up and down. It also renders a folder selection button that allows the user to select a new folder
   * containing videos.
   */
function App(): JSX.Element {
  const [videos, setVideos] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const videoRefs = useRef<{ [key: number]: HTMLVideoElement | null }>({});
  const directoryHandleRef = useRef<FileSystemDirectoryHandle | null>(null);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  /**
   * Handle touch start event.
   * @param e React touch event.
   */
  const handleTouchStart = (e: React.TouchEvent): void => {
    setTouchStart(e.touches[0].clientY);
  };
  
  /**
   * Handle touch end event.
   * @param e React touch event.
   */
  const handleTouchEnd = (e: React.TouchEvent): void => {
    setTouchEnd(e.changedTouches[0].clientY);
    handleTouchMove();
  };
  
  /**
   * Handle touch move event.
   */
  const handleTouchMove = (): void => {
    if (touchStart === null || touchEnd === null) return;
  
    const distance = touchStart - touchEnd;
  
    if (distance > 50) {
      // Swipe Up
      handleScroll('down'); // Assuming 'down' means next video
    } else if (distance < -50) {
      // Swipe Down
      handleScroll('up'); // Assuming 'up' means previous video
    }
  
    // Reset touch positions
    setTouchStart(null);
    setTouchEnd(null);
  };
  
  useEffect(() => {
    loadSavedVideos();
  }, []);

  /**
   * Load saved videos from directory.
   */
  const loadSavedVideos = async (): Promise<void> => {
    try {
      if (directoryHandleRef.current) {
        await loadVideosFromDirectory(directoryHandleRef.current);
      }
    } catch (error) {
      console.error('Error loading saved videos:', error);
    }
  };

  /**
   * Load videos from directory.
   * @param dirHandle Directory handle.
   */
  const loadVideosFromDirectory = async (dirHandle: FileSystemDirectoryHandle): Promise<void> => {
    const videoFiles: string[] = [];
    
    for await (const entry of dirHandle.values()) {
      if (entry.kind === 'file') {
        if ((await entry.getFile()).type.startsWith('video/')) {
          const url = URL.createObjectURL((await entry.getFile()));
          videoFiles.push(url);
        }
      }
    }
    
    setVideos(videoFiles);
  };

  /**
   * Handle folder selection.
   */
  const handleFolderSelect = async (): Promise<void> => {
    try {
      // Show folder picker
      const dirHandle = await window.showDirectoryPicker({
        mode: 'read'
      });
      
      directoryHandleRef.current = dirHandle;
      await loadVideosFromDirectory(dirHandle);
      
    } catch (error) {
      console.error('Error accessing folder:', error);
      // Fallback to multiple file selection if folder picker is not supported
      const input = document.createElement('input');
      input.type = 'file';
      input.multiple = true;
      input.accept = 'video/*';
      
      input.onchange = (e) => {
        const files = (e.target as HTMLInputElement).files;
        if (files) {
          const videoUrls = Array.from(files).map(file => URL.createObjectURL(file));
          setVideos(videoUrls);
        }
      };
      
      input.click();
    }
  };

  /**
   * Handle scroll event.
   * @param direction 'up' or 'down' to scroll up or down.
   */
  const handleScroll = (direction: 'up' | 'down'): void => {
    const newIndex = direction === 'down' ? 
      Math.min(currentIndex + 1, videos.length - 1) : 
      Math.max(currentIndex - 1, 0);
    
    // Pause current video and reset volume
    if (videoRefs.current[currentIndex]) {
      console.log(`Pausing video at index: ${currentIndex}`);
      videoRefs.current[currentIndex].pause();
      videoRefs.current[currentIndex].volume = 0; // Reset volume to prevent sound
    }
    
    setCurrentIndex(newIndex);
    
    // Play new video and set volume
    if (videoRefs.current[newIndex]) {
      console.log(`Playing video at index: ${newIndex}`);
      videoRefs.current[newIndex].volume = 1; // Set volume for the new video
      videoRefs.current[newIndex].play();
    }
  };
  
  /**
   * Handle video ref.
   * @param el Video element.
   * @param index Index of the video element.
   */
  const handleVideoRef = (el: HTMLVideoElement | null, index: number): void => {
    if (el) {
      videoRefs.current[index] = el;
    }
  };
  
  return (
    <div className="h-screen w-screen bg-black text-white overflow-hidden">
      {videos.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center gap-4">
          <button
            onClick={handleFolderSelect}
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-6 py-3 rounded-full transition"
          >
            <Folder size={24} />
            <span>Select Videos Folder</span>
          </button>
          <p className="text-sm text-gray-400">
            Select a folder containing your videos
          </p>
        </div>
      ) : (
        <div className="h-full relative">
          {/* Video Container */}
          <div 
            className="h-full snap-y snap-mandatory overflow-y-scroll"
            style={{ scrollSnapType: 'y mandatory' }}
          >
            {videos.map((video, index) => (
              <div 
                key={index}
                className="h-full w-full snap-start relative"
              >
                <video
                  ref={(el) => handleVideoRef(el, index)}
                  src={video}
                  className="h-full w-full object-cover"
                  loop
                  playsInline
                  muted={index !== currentIndex}
                  onClick={(e) => {
                    const video = e.currentTarget;
                    video.paused ? video.play() : video.pause();
                  }}
                />
                
                {/* Overlay Controls */}
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">Video {index + 1}</p>
                    </div>
                    
                    {/* Right Side Actions */}
                    <div className="flex flex-col gap-4">
                      <button className="p-2 hover:bg-white/20 rounded-full transition">
                        <Heart size={28} />
                      </button>
                      <button className="p-2 hover:bg-white/20 rounded-full transition">
                        <MessageCircle size={28} />
                      </button>
                      <button className="p-2 hover:bg-white/20 rounded-full transition">
                        <Share2 size={28} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Navigation Buttons */}
          <button
            className="absolute top-1/2 left-4 transform -translate-y-1/2 bg-white/10 p-2 rounded-full"
            onClick={() => handleScroll('up')}
            disabled={currentIndex === 0}
          >
            ↑
          </button>
          <button
            className="absolute top-1/2 right-4 transform -translate-y-1/2 bg-white/10 p-2 rounded-full"
            onClick={() => handleScroll('down')}
            disabled={currentIndex === videos.length - 1}
          >
            ↓
          </button>
          
          {/* Folder Selection Button */}
          <button
            onClick={handleFolderSelect}
            className="absolute top-4 right-4 flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-full transition"
          >
            <Folder size={20} />
            <span>Change Folder</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default App;