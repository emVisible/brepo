import type { Metadata } from 'next';
import { HomePage } from '@/components/home/HomePage';

export const metadata: Metadata = {
  title: 'BriefRepo — Paste a repo, preview its map',
  description: 'Enter a GitHub URL or local path to generate an interactive project navigation report. Open source, local-first.',
  alternates: { canonical: '/en', languages: { zh: '/' } },
};

export default function Page() {
  return <HomePage lang="en" />;
}
