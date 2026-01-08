import { ReactNode } from 'react';
import Link from 'next/link';
import { Heart } from 'lucide-react';

export default function FamilyAuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800">
      {/* Fixed Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200/50 dark:border-gray-800/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center">
              <h1 className="text-2xl tracking-tight text-slate-900 dark:text-slate-100">
                <span className="font-bold">MyHealth</span>
                <span className="font-light text-blue-600 dark:text-blue-400">Guide</span>
              </h1>
            </Link>
            {/* Family badge */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm">
              <Heart className="w-4 h-4" />
              <span className="font-medium">For Families</span>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="min-h-screen px-4 py-12 pt-24">
        <div className="max-w-md mx-auto w-full">
          {children}
        </div>
      </div>
    </div>
  );
}
