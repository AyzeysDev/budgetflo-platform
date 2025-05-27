// apps/web/src/components/common/Navbar.tsx
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PiggyBank, Menu } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from './ThemeToggle';
import { usePathname } from 'next/navigation';
import React from 'react';
import { useSession, signOut } from "next-auth/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface NavbarProps {
  onGetStartedClick: () => void; // Function to open the auth modal
}

export default function Navbar({ onGetStartedClick }: NavbarProps) {
  const pathname = usePathname();
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);
  const { data: session, status } = useSession();

  const navLinks = [
    { href: "/#features", label: "Features" },
    { href: "/#how-it-works", label: "How It Works" },
    { href: "/#pricing", label: "Pricing" },
  ];

  React.useEffect(() => {
    if (isSheetOpen) {
        setIsSheetOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const userInitial = session?.user?.name ? session.user.name.charAt(0).toUpperCase() :
                      session?.user?.email ? session.user.email.charAt(0).toUpperCase() : '?';

  return (
    <header className="py-4 px-6 md:px-10 shadow-sm sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <nav className="container mx-auto flex justify-between items-center">
        <Link href={session ? "/home" : "/#hero-section"} className="flex items-center space-x-2 text-xl font-semibold hover:opacity-80 transition-opacity">
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
          {status === "authenticated" ? (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/home">Dashboard</Link>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={session.user?.image ?? undefined} alt={session.user?.name ?? "User"} />
                      <AvatarFallback>{userInitial}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{session.user?.name}</p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {session.user?.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {/* Add other items like Profile, Settings if needed */}
                  <DropdownMenuItem onClick={() => signOut({ callbackUrl: '/' })}>
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              {/* Single "Get Started" button */}
              <Button size="sm" onClick={onGetStartedClick}>
                Get Started
              </Button>
            </>
          )}
          <ThemeToggle />
        </div>

        {/* Mobile Menu */}
        <div className="md:hidden flex items-center space-x-2">
          <ThemeToggle />
          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px] sm:w-[320px] p-0">
              <SheetHeader className="p-4 border-b mb-4">
                <SheetTitle>
                  <Link 
                    href={session ? "/home" : "/#hero-section"}
                    className="flex items-center space-x-2 text-lg font-semibold"
                    onClick={() => setIsSheetOpen(false)}
                  >
                    <PiggyBank className="h-6 w-6 text-primary" />
                    <span>BudgetFlo</span>
                  </Link>
                </SheetTitle>
              </SheetHeader>
              <div className="grid gap-2 p-4">
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
                {status === "authenticated" ? (
                  <>
                    <Button asChild variant="ghost" className="w-full justify-start" onClick={() => setIsSheetOpen(false)}>
                      <Link href="/home">Dashboard</Link>
                    </Button>
                    <Button variant="ghost" className="w-full justify-start" onClick={() => { signOut({ callbackUrl: '/' }); setIsSheetOpen(false); }}>
                      Log out
                    </Button>
                  </>
                ) : (
                  <>
                    {/* Single "Get Started" button for mobile sheet */}
                    <Button className="w-full" onClick={() => { onGetStartedClick(); setIsSheetOpen(false); }}>
                      Get Started
                    </Button>
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </header>
  );
}