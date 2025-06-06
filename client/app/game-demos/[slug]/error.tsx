'use client';

export default function Error({ error }: { error: Error }) {
  return (
    <div className="text-center text-red-500 mt-20">
      <h2>Something went wrong loading this game demo.</h2>
      <pre className="mt-4 text-sm text-red-300">{error.message}</pre>
    </div>
  );
}
