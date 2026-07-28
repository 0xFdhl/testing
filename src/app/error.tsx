"use client";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main
      id="main-content"
      className="flex min-h-screen flex-col items-center justify-center bg-white px-4"
    >
      <h1 className="text-4xl font-bold text-black">Terjadi kesalahan</h1>
      <p className="mt-4 text-lg text-zinc-500">
        Maaf, terjadi kesalahan yang tidak terduga.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-8 inline-flex h-11 items-center rounded-md bg-black px-6 text-sm font-medium text-white"
      >
        Coba lagi
      </button>
    </main>
  );
}
