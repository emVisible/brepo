import type { Metadata } from 'next';
import '../styles/globals.css';

export const metadata: Metadata = {
  title: 'BriefRepo — Paste a repo. See its shape.',
  description: 'Static analysis in seconds. Treemap and city, side by side. Open source, local-first.',
  metadataBase: new URL('https://brepo.vercel.app'),
  openGraph: { title: 'BriefRepo', description: 'Paste a repo. See its shape.', type: 'website' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
