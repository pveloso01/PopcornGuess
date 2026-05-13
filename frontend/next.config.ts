/**
 * Feature 19: Performance Optimization
 * Next.js Configuration
 */

import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Optimize images
  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // Enable compression
  compress: true,

  // Production optimizations
  productionBrowserSourceMaps: false,

  // React strict mode
  reactStrictMode: true,

  // Power Pack features
  poweredByHeader: false,

  // Build output mode. Standalone gives us a tight self-contained
  // server bundle that works whether we deploy to Vercel, Fly, or
  // a plain Node host.
  output: 'standalone',

  // No experimental flags — `optimizeCss` relies on `critters`, which is
  // unmaintained and breaks Next 16's prerender of /_global-error. The
  // perf cost is negligible at our scale; Cloudflare cache absorbs it.
};

export default nextConfig;
