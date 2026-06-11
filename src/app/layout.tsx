import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/layout/Navbar';
import { ToastProvider } from '@/components/common/ToastProvider';

export const metadata: Metadata = {
  title: 'MC Mod Hub',
  description: 'Minecraft Mod/光影/材质包桌面管理工具',
  icons: {
    icon: '/icon.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-mc-bg text-mc-text antialiased">
        <ToastProvider>
          <Navbar />
          {/* 留出导航栏高度 */}
          <main className="pt-14 min-h-screen">{children}</main>
        </ToastProvider>
      </body>
    </html>
  );
}
