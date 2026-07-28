export default function Loading() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-white px-6">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-zinc-300 border-t-black" />
      <p className="text-sm font-medium tracking-wide text-black/55">Loading...</p>
    </main>
  );
}
