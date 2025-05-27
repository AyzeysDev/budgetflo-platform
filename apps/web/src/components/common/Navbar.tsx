// apps/web/src/components/common/Navbar.tsx
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PiggyBank, Menu } from 'lucide-react'; // BudgetFlo icon
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"; // Ensure Sheet is added via ShadCN
import { ThemeToggle } from './ThemeToggle';
import { usePathname } from 'next/navigation';
import React from 'react';

export default function Navbar() {
  const pathname = usePathname();
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);

  const navLinks = [
    { href: "/#features", label: "Features" },
    { href: "/#how-it-works", label: "How It Works" },
    { href: "/#pricing", label: "Pricing" },
  ];

  // Close sheet on navigation
  React.useEffect(() => {
    if (isSheetOpen) {
        setIsSheetOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]); // Only trigger on pathname change

  return (
    <header className="py-4 px-6 md:px-10 shadow-sm sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <nav className="container mx-auto flex justify-between items-center">
        <Link href="/#hero-section" className="flex items-center space-x-2 text-xl font-semibold hover:opacity-80 transition-opacity">
          <PiggyBank className="h-7 w-7 text-primary" />
          <span className="text-foreground">BudgetFlo</span>
        </Link>

        <div className="hidden md:flex items-center space-x-6">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
            >
              {link.label}
            </Link>
          ))}
          <Button asChild variant="outline" size="sm">
            <Link href="/login">Login</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/signup">Sign Up Free</Link>
          </Button>
          <ThemeToggle />
        </div>

        <div className="md:hidden flex items-center space-x-2">
          <ThemeToggle />
          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px] sm:w-[320px] p-0"> {/* Remove default padding */}
              <SheetHeader className="p-4 border-b mb-4"> {/* Add padding and border */}
                <SheetTitle>
                  <Link 
                    href="/#hero-section" 
                    className="flex items-center space-x-2 text-lg font-semibold"
                    onClick={() => setIsSheetOpen(false)}
                  >
                    <PiggyBank className="h-6 w-6 text-primary" />
                    <span>BudgetFlo</span>
                  </Link>
                </SheetTitle>
              </SheetHeader>
              <div className="grid gap-2 p-4"> {/* Add padding for links */}
                {navLinks.map((link) => (
                  <Link
                    key={link.label}
                    href={link.href}
                    className="block px-3 py-2 rounded-md text-base font-medium text-foreground hover:bg-accent hover:text-accent-foreground"
                    onClick={() => setIsSheetOpen(false)}
                  >
                    {link.label}
                  </Link>
                ))}
                <hr className="my-3" />
                <Button asChild variant="outline" className="w-full" onClick={() => setIsSheetOpen(false)}>
                  <Link href="/login">Login</Link>
                </Button>
                <Button asChild className="w-full" onClick={() => setIsSheetOpen(false)}>
                  <Link href="/signup">Sign Up Free</Link>
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </header>
  );
}