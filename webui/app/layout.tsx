import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import '../styles/globals.css';

const geistSans = Geist({ subsets: ['latin'], variable: '--font-geist-sans' });
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' });

const SITE_URL = 'https://brepo.vercel.app';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'BriefRepo — 粘贴仓库，预览导航',
    template: '%s · BriefRepo',
  },
  description: '输入 GitHub 链接或本地路径，生成一份可交互的项目导航报告。开源、本地优先。',
  keywords: ['BriefRepo', 'GitHub 分析', 'repo 可视化', '项目导航', 'onboarding', 'treemap', '代码分析', 'repository map', 'code visualization'],
  authors: [{ name: 'BriefRepo Contributors' }],
  creator: 'BriefRepo',
  robots: { index: true, follow: true },
  alternates: {
    canonical: '/',
    languages: { en: '/en' },
  },
  openGraph: {
    type: 'website',
    locale: 'zh_CN',
    alternateLocale: ['en_US'],
    url: '/',
    siteName: 'BriefRepo',
    title: 'BriefRepo — 粘贴仓库，预览导航',
    description: '输入 GitHub 链接或本地路径，生成一份可交互的项目导航报告。开源、本地优先。',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BriefRepo — 粘贴仓库，预览导航',
    description: '输入 GitHub 链接或本地路径，生成一份可交互的项目导航报告。',
  },
  icons: { icon: '/icon.svg' },
};

export const viewport: Viewport = {
  themeColor: '#0A0A0B',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" data-theme="dark" className={`${geistSans.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
