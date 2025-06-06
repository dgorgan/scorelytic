'use client';
import Head from 'next/head';
import { useTransition, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function Home() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [clicked, setClicked] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setClicked(true);
    startTransition(() => {
      router.push('/dashboard');
    });
  };

  return (
    <>
      <Head>
        <title>Scorelytic</title>
        <meta name="description" content="Scorelytic: Game review analytics and bias detection" />
      </Head>
      <div
        className="flex flex-col items-center justify-center min-h-screen py-16 px-8"
        style={{
          background: 'linear-gradient(135deg, #f6e6fb 0%, #e0b6f9 40%, #bfaaff 100%)',
          minHeight: '100vh',
          width: '100vw',
          position: 'fixed',
          top: 0,
          left: 0,
          zIndex: -1,
        }}
      >
        <div
          className="flex flex-col items-center justify-center min-h-screen p-8"
          style={{ zIndex: 1 }}
        >
          <Image
            src="/scorelytic-orb.png"
            alt="Scorelytic Orb"
            width={50}
            height={50}
            style={{
              objectFit: 'contain',
              maxWidth: '100%',
              marginBottom: '24px',
            }}
          />
          <h1 className="text-4xl sm:text-5xl font-extrabold mb-4 text-white drop-shadow-lg text-center">
            Welcome to{' '}
            <span className="bg-gradient-to-r from-[#7c3aed] to-[#a18aff] bg-clip-text text-transparent drop-shadow-lg">
              Scorelytic
            </span>
          </h1>
          <div className="h-1 w-16 bg-gradient-to-r from-[#7c3aed] to-[#a18aff] rounded-full my-4" />
          <p className="text-xl text-white mb-8 max-w-xl text-center">
            Game review analytics, bias detection, and more.
            <br />
            <span className="bg-gradient-to-r from-[#7c3aed] to-[#a18aff] bg-clip-text text-transparent font-semibold">
              Data-driven. Insightful. Beautiful.
            </span>
          </p>
          {isPending || clicked ? (
            <div className="flex flex-col items-center gap-4 mt-8">
              <div className="w-12 h-12 border-4 border-white border-t-[#a18aff] rounded-full animate-spin"></div>
              <span className="text-white font-semibold text-lg">
                Loading your dashboard magic...
              </span>
            </div>
          ) : (
            <a
              href="/dashboard"
              onClick={handleClick}
              className="mt-6 px-8 py-3 bg-gradient-to-r from-[#7c3aed] to-[#a18aff] text-white rounded-xl shadow-lg hover:from-[#6d5dfc] hover:to-[#a18aff] transition text-lg font-semibold"
            >
              Go to Dashboard
            </a>
          )}
        </div>
      </div>
    </>
  );
}
