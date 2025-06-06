'use client';
import { useState } from 'react';
import Image from 'next/image';

interface GameDemoVideoProps {
  thumb: string;
  videoId: string;
  title?: string;
}

const GameDemoVideo = ({ thumb, videoId, title }: GameDemoVideoProps) => {
  const [iframeLoaded, setIframeLoaded] = useState(false);
  return (
    <div className="w-full aspect-[16/8] rounded-2xl overflow-hidden shadow-2xl border-4 border-violet-700 bg-black relative">
      {!iframeLoaded && (
        <Image
          src={thumb}
          alt={title || 'Game cover'}
          fill
          className="object-cover object-center absolute inset-0 z-0 transition-opacity duration-300"
          style={{ opacity: iframeLoaded ? 0 : 1 }}
        />
      )}
      <iframe
        src={`https://www.youtube.com/embed/${videoId}`}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="w-full h-full min-h-[240px] relative z-10 transition-opacity duration-300"
        onLoad={() => setIframeLoaded(true)}
        style={{ opacity: iframeLoaded ? 1 : 0 }}
      />
    </div>
  );
};

export default GameDemoVideo;
