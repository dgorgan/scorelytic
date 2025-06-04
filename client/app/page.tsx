'use client';
import Head from 'next/head';
import { useTransition, useState } from 'react';
import { useRouter } from 'next/navigation';

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
      <div className="flex flex-col items-center justify-center min-h-screen p-8">
        <h1 className="text-4xl font-bold mb-4">Welcome to Scorelytic</h1>
        <p className="text-lg text-gray-600 mb-8">
          Game review analytics, bias detection, and more.
        </p>
        {isPending || clicked ? (
          <div className="flex flex-col items-center gap-4 mt-8">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-blue-600 font-semibold text-lg">
              Loading your dashboard magic...
            </span>
          </div>
        ) : (
          <a
            href="/dashboard"
            onClick={handleClick}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition"
          >
            Go to Dashboard
          </a>
        )}
      </div>
    </>
  );
}
