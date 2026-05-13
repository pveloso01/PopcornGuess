import type { Metadata, Viewport } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ClientAuthProvider from '@/contexts/ClientAuthProvider';
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister';
import BackendHealthProbe from '@/components/BackendHealthProbe';

/**
 * Typography is system-font-stack first. We previously pulled Geist from
 * Google Fonts via `next/font/google`, but that requires the build host
 * to have network access to fonts.googleapis.com — which fails in
 * air-gapped CI and behind corporate firewalls. System fonts ship 0 KB,
 * eliminate the third-party fetch, and look excellent on every platform.
 */
const geistSans = {
  variable: '--font-geist-sans',
};
const geistMono = {
  variable: '--font-geist-mono',
};

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://popcornguess.example';
const SITE_NAME = 'PopcornGuess';
const SITE_DESCRIPTION =
  'A daily movie and TV trivia puzzle. Guess the title from a ladder of clues. New puzzle every day at midnight UTC. No account needed.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — Daily Movie & TV Puzzle`,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    'movie wordle',
    'daily movie quiz',
    'tv trivia',
    'guess the movie',
    'cinema puzzle',
  ],
  authors: [{ name: 'PopcornGuess' }],
  manifest: '/manifest.webmanifest',
  // Favicon comes from app/icon.svg (Next auto-detects the file). The
  // explicit apple-touch icon points to the same SVG so iOS shows the
  // brand mark on the home screen instead of a screenshot.
  icons: {
    apple: '/icons/icon.svg',
  },
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    title: `${SITE_NAME} — Daily Movie & TV Puzzle`,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_NAME} — Daily Movie & TV Puzzle`,
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export const viewport: Viewport = {
  themeColor: '#0a0a0a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): React.JSX.Element {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ClientAuthProvider>
          <BackendHealthProbe />
          <Navbar />
          <div className="min-h-[calc(100vh-4rem)]">{children}</div>
          <Footer />
          <ServiceWorkerRegister />
        </ClientAuthProvider>
      </body>
    </html>
  );
}
