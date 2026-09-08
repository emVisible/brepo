import type { Metadata } from 'next';
import { HomePage } from '@/components/home/HomePage';

export const metadata: Metadata = {
  title: 'BriefRepo — 粘贴仓库，预览导航',
  description: '输入 GitHub 仓库链接，生成一份可交互的项目导航报告。开源、本地优先。',
  alternates: { canonical: '/', languages: { en: '/en' } },
};

export default function Page() {
  return <HomePage lang="zh" />;
}
