/**
 * ErrorMessage Component
 * Displays error messages to users
 */

interface ErrorMessageProps {
  message: string;
}

export default function ErrorMessage({ message }: ErrorMessageProps) {
  return (
    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
      <p className="text-red-500">{message}</p>
    </div>
  );
}
