import type { MetadataRoute } from 'next';
export const dynamic = 'force-static';
export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://brepo.vercel.app';
  return [{ url: `${base}/`, lastModified: new Date() }, { url: `${base}/zh`, lastModified: new Date() }];
}
