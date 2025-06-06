import React from 'react';

const SkeletonDetail = () => (
  <main className="max-w-5xl mx-auto px-6 sm:px-8 py-10 sm:py-14">
    <div className="w-full aspect-[16/8] rounded-2xl overflow-hidden shadow-2xl border-4 border-violet-700 bg-black relative animate-pulse mb-8" />
    <div className="h-10 bg-violet-700/40 rounded w-2/3 mb-4 animate-pulse" />
    <div className="h-6 bg-violet-700/20 rounded w-1/3 mb-6 animate-pulse" />
    <div className="h-8 bg-violet-700/30 rounded w-1/2 mb-8 animate-pulse" />
    <div className="h-40 bg-violet-800/30 rounded-2xl mb-8 animate-pulse" />
  </main>
);

export default SkeletonDetail;
