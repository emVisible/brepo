import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://brepo.vercel.app';
  const now = new Date();
  return [
    { url: `${base}/`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/en`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${base}/history`, lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
  ];
}
