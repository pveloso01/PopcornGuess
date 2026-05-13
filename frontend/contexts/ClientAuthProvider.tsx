'use client';

/**
 * Dynamically-loaded AuthProvider with SSR disabled.
 *
 * Next 16's prerender of /_global-error pulls the layout's client
 * chunk through a render path where React's dispatcher is not
 * initialised. AuthProvider's useState + useEffect hydration code
 * blew up the build with "Cannot read properties of null (reading
 * 'useContext')". `ssr: false` on a dynamic import keeps AuthProvider
 * entirely out of the server bundle.
 *
 * Trade-off: a brief client-only render after hydration. Acceptable
 * for an auth wrapper — auth-aware UI takes effect on first interaction,
 * not first paint, and no SEO surface depends on it.
 */

import dynamic from 'next/dynamic';

const AuthProvider = dynamic(
  () => import('./AuthContext').then((mod) => ({ default: mod.AuthProvider })),
  { ssr: false }
);

export default function ClientAuthProvider({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return <AuthProvider>{children}</AuthProvider>;
}
