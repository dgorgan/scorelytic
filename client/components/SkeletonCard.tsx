import React from 'react';

const SkeletonCard = () => (
  <div
    className="animate-pulse max-w-sm w-full mx-auto rounded-xl sm:rounded-2xl overflow-hidden shadow-lg sm:shadow-2xl border-4 border-violet-700 bg-violet-900"
    style={{ minHeight: 420 }}
  >
    <div className="relative aspect-[1] w-full h-86 bg-violet-700/40 flex items-end justify-center">
      <div className="w-full h-full bg-violet-800/60" />
    </div>
    <div className="absolute bottom-0 left-0 right-0 flex flex-col px-4 pt-2 pb-0 bg-violet-800/90 text-white font-semibold rounded-b-2xl">
      <div className="h-6 bg-violet-700/60 rounded w-3/4 mb-2" />
      <div className="h-4 bg-violet-700/40 rounded w-1/2 mb-2" />
      <hr className="my-1 border-violet-400/30" />
      <div className="flex flex-col w-full py-2 rounded-b-2xl">
        <div className="flex items-center justify-between w-full mb-0.5">
          <span className="h-3 bg-violet-700/40 rounded w-1/4" />
          <span className="h-3 bg-violet-700/40 rounded w-1/4 ml-auto" />
        </div>
        <div className="flex items-center justify-between w-full">
          <span className="h-5 bg-violet-700/60 rounded w-1/4" />
          <span className="h-6 bg-violet-700/60 rounded-full w-10 ml-auto" />
        </div>
      </div>
    </div>
    <div className="absolute top-2 right-2 bg-violet-700/40 text-white text-xs px-2 py-1 rounded shadow w-12 h-6" />
  </div>
);

export default SkeletonCard;
