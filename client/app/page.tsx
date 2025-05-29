import Head from 'next/head';

export default function Home() {
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
        <a
          href="/dashboard"
          className="px-6 py-3 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition"
        >
          Go to Dashboard
        </a>
      </div>
    </>
  );
}
