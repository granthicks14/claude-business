import Link from "next/link";

export default function NotFound() {
  return (
    <div className="max-w-lg mx-auto py-16 text-center">
      <div className="card p-8">
        <p className="text-sm font-semibold text-accent-text">404</p>
        <h1 className="text-xl font-semibold mt-1">This page doesn&apos;t exist</h1>
        <p className="text-sm text-muted mt-2">
          The link may be from an older version, or a section that only appears once you&apos;ve picked a business.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center h-10 px-4 rounded-lg bg-accent text-white dark:text-[oklch(15%_0.02_265)] font-semibold text-sm mt-6"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
