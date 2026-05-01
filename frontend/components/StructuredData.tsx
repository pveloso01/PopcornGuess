import Script from 'next/script';

interface StructuredDataProps {
  /** Inline JSON-LD object. */
  data: Record<string, unknown>;
  id?: string;
}

/**
 * Inject a JSON-LD <script> tag. Used for Schema.org markup.
 * Renders server-side; safe under SSR + RSC.
 */
export default function StructuredData({
  data,
  id = 'structured-data',
}: StructuredDataProps): React.JSX.Element {
  return (
    <Script
      id={id}
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
      strategy="afterInteractive"
    />
  );
}

export function siteJsonLd(siteUrl: string): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'PopcornGuess',
    url: siteUrl,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${siteUrl}/quiz/daily?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };
}

export function gameJsonLd(siteUrl: string): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'VideoGame',
    name: 'PopcornGuess',
    url: siteUrl,
    applicationCategory: 'GameApplication',
    genre: ['Trivia', 'Puzzle', 'Word'],
    gamePlatform: 'Web',
    operatingSystem: 'All',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    description:
      "A daily movie and TV trivia puzzle. Guess today's title from a ladder of clues.",
  };
}
