import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface GameCardProps {
  id: string;
  slug: string;
  thumb: string;
  title: string;
  channelTitle: string;
  releaseYear?: number | string;
  score?: number;
  isBiasAdjusted?: boolean;
}

const GameCard: React.FC<GameCardProps> = ({
  id,
  slug,
  thumb,
  title,
  channelTitle,
  releaseYear,
  score,
  isBiasAdjusted,
}) => (
  <Link
    key={id}
    href={`/game-demos/${slug}`}
    className="group relative block max-w-sm w-full mx-auto rounded-xl sm:rounded-2xl overflow-hidden shadow-lg sm:shadow-2xl border-4 border-violet-700 bg-violet-900 hover:scale-105 transition-transform"
    style={{ minHeight: 420 }}
  >
    <div className="relative aspect-[1] w-full h-86 overflow-hidden flex items-end justify-center">
      <Image
        src={thumb}
        alt={title || 'Game cover'}
        fill
        className="object-cover object-center group-hover:brightness-110 group-hover:scale-105 transition-all duration-300"
        sizes="(max-width: 768px) 100vw, 33vw"
        priority
      />
    </div>
    <div className="absolute bottom-0 left-0 right-0 flex flex-col px-4 pt-2 pb-0 bg-violet-800/90 text-white font-semibold rounded-b-2xl">
      <div className="text-lg font-extrabold text-white truncate drop-shadow mb-0.5">
        {title || 'Untitled Game'}
      </div>
      <div className="text-xs text-violet-200 font-semibold truncate mb-1">
        {channelTitle || 'Unknown Channel'}
      </div>
      <hr className="my-1 border-violet-400/30" />
      <div className="flex flex-col w-full py-2 rounded-b-2xl">
        <div className="flex items-center justify-between w-full mb-0.5">
          <span className="uppercase tracking-wider text-[11px] text-violet-200 font-bold">
            Release Year
          </span>
          <span className="uppercase tracking-wider text-[11px] text-violet-200 font-bold ml-auto">
            Score
          </span>
        </div>
        <div className="flex items-center justify-between w-full">
          <span className="text-base font-bold">{releaseYear || ''}</span>
          {score !== undefined && (
            <div className="flex items-center gap-1">
              <span className="bg-violet-600 px-4 py-1 rounded-full text-lg font-extrabold shadow">
                {Math.round(score * 10) / 10}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
    <div className="absolute top-2 right-2 bg-violet-700/80 text-white text-xs px-2 py-1 rounded shadow">
      Demo
    </div>
  </Link>
);

export default GameCard;
