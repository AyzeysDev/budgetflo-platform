// apps/web/src/components/common/Footer.tsx
import Link from 'next/link';

export default function Footer() {
  const currentYear = new Date().getFullYear();
  return (
    <footer className="py-8 bg-slate-100 dark:bg-slate-900 text-center text-slate-600 dark:text-slate-400">
      <div className="container mx-auto px-6">
        <p className="mb-2 text-sm">
          &copy; {currentYear} BudgetFlo. All rights reserved.
        </p>
        <div className="space-x-4 text-sm">
          <Link href="/privacy-policy" className="hover:text-primary transition-colors">Privacy Policy</Link>
          <Link href="/terms-of-service" className="hover:text-primary transition-colors">Terms of Service</Link>
        </div>
      </div>
    </footer>
  );
}