interface StructuredDataProps {
  /** Inline JSON-LD object. */
  data: Record<string, unknown>;
  id?: string;
}

/**
 * Inject a JSON-LD <script> tag for Schema.org markup.
 *
 * Uses a plain server-rendered <script> rather than next/script because:
 * 1) JSON-LD has zero runtime — there's nothing to defer or strategise.
 * 2) next/script pulls a client-side chunk that interferes with Next 16's
 *    prerender of /_global-error in some configurations.
 * 3) Plain <script> is simpler, smaller, and standards-compliant.
 */
export default function StructuredData({
  data,
  id = 'structured-data',
}: StructuredDataProps): React.JSX.Element {
  return (
    <script
      id={id}
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
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
