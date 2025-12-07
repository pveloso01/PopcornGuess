/**
 * LoadingSpinner Component
 * Simple loading spinner for async operations
 */

export default function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--accent-primary)]"></div>
    </div>
  );
}
