import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#101522] text-[#F3F4F8] p-4 select-none">
      <div className="text-center space-y-4 max-w-md">
        <h1 className="text-6xl font-extrabold text-[#8B7CFF]">404</h1>
        <h2 className="text-xl font-bold">Page Not Found</h2>
        <p className="text-sm text-[#9DA8BE]">
          The page you are looking for does not exist or has been moved.
        </p>
        <div className="pt-2">
          <Link
            href="/"
            className="inline-flex items-center px-4 py-2 rounded-xl bg-[#8B7CFF] hover:bg-[#7867FB] text-white text-sm font-semibold transition-colors"
          >
            Return to Noviq AI
          </Link>
        </div>
      </div>
    </div>
  );
}
