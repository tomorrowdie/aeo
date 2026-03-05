import Link from 'next/link';

export default function Navbar() {
  return (
    <nav className="fixed top-0 right-0 z-50 flex items-center gap-2 p-3">
      <a
        href="https://aeo.washinmura.jp/blog"
        target="_blank"
        rel="noopener noreferrer"
        className="rounded-full border border-[#374151] px-3 py-1 text-sm text-gray-300 hover:border-[#00ff88] hover:text-[#00ff88] transition-colors"
      >
        Blog
      </a>
      <span className="rounded-full border border-[#a855f7] px-3 py-1 text-sm text-[#a855f7]">
        v3 Update
      </span>
      <span className="rounded-full bg-[#1f2937] px-3 py-1 text-sm text-white font-medium">
        EN
      </span>
    </nav>
  );
}
