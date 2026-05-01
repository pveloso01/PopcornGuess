import type { MetadataRoute } from 'next';

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://popcornguess.example'
).replace(/\/$/, '');

const now = () => new Date();

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `${SITE_URL}/`,
      lastModified: now(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${SITE_URL}/quiz/daily`,
      lastModified: now(),
      changeFrequency: 'daily',
      priority: 0.95,
    },
    {
      url: `${SITE_URL}/help`,
      lastModified: now(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${SITE_URL}/privacy`,
      lastModified: now(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/terms`,
      lastModified: now(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/legal/dmca`,
      lastModified: now(),
      changeFrequency: 'monthly',
      priority: 0.2,
    },
  ];
}
