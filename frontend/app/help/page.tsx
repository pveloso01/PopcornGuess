/**
 * Help/FAQ Page
 * Feature 23: Legal & Documentation
 */

export default function HelpPage() {
  const faqs = [
    {
      q: 'How do I play?',
      a: 'Choose a game mode, answer movie/TV questions, and build your streak!',
    },
    {
      q: 'What is a streak?',
      a: 'Complete the daily quiz every day to build your streak. Miss a day and it resets!',
    },
    {
      q: 'How does scoring work?',
      a: 'Each correct answer earns points. The faster you answer in Blitz mode, the more bonus points you get!',
    },
    {
      q: 'Can I play anonymously?',
      a: 'Yes! Your progress is saved locally. Create an account to sync across devices.',
    },
  ];

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold text-gradient-gold mb-8">Help & FAQ</h1>
        <div className="space-y-6">
          {faqs.map((faq, i) => (
            <div key={i} className="bg-[var(--background-secondary)] rounded-lg p-6">
              <h3 className="text-xl font-bold mb-2">{faq.q}</h3>
              <p className="text-[var(--text-secondary)]">{faq.a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
