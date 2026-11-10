import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-5xl" aria-hidden>
        🧭
      </p>
      <h1 className="text-2xl font-bold text-white">Không tìm thấy trang</h1>
      <p className="text-sm text-slate-400">Đường dẫn này không tồn tại hoặc đã được chuyển đi.</p>
      <Link href="/" className="rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600">
        Về trang chủ
      </Link>
    </main>
  );
}
