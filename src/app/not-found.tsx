import Link from "next/link";

export default function NotFound() {
  return (
    <main
      id="main-content"
      className="flex min-h-screen flex-col items-center justify-center bg-white px-4"
    >
      <h1 className="text-6xl font-bold text-black">404</h1>
      <p className="mt-4 text-lg text-zinc-500">Halaman tidak ditemukan.</p>
      <Link
        href="/"
        className="mt-8 inline-flex h-11 items-center rounded-md bg-black px-6 text-sm font-medium text-white"
      >
        Kembali ke home
      </Link>
    </main>
  );
}
