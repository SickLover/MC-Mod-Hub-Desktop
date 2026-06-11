'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navbar() {
  const pathname = usePathname();

  const linkClass = (href: string) =>
    `px-4 py-2 rounded-mc text-sm font-medium transition-colors duration-200 ${
      pathname === href
        ? 'bg-mc-green text-white'
        : 'text-mc-muted hover:text-mc-text hover:bg-mc-card'
    }`;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-14 bg-mc-bg/95 backdrop-blur border-b border-white/5 flex items-center px-6">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2 mr-8">
        <img src="/icon.png" alt="MC Mod Hub" className="w-7 h-7" />
        <span className="text-lg font-bold text-mc-green tracking-wide">
          MC Mod Hub
        </span>
      </Link>

      {/* Nav Links */}
      <div className="flex items-center gap-1">
        <Link href="/" className={linkClass('/')}>
          首页
        </Link>
        <Link href="/collections" className={linkClass('/collections')}>
          收藏夹
        </Link>
        <Link href="/settings" className={linkClass('/settings')}>
          设置
        </Link>
      </div>

      {/* Spacer */}
      <div className="flex-1" />
    </nav>
  );
}
