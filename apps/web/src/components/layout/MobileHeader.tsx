// apps/web/src/components/layout/MobileHeader.tsx
"use client";

import Link from "next/link";
import {
  Menu,
  PiggyBank,
  LayoutDashboard,
  CreditCard,
  TrendingUp,
  PieChartIcon,
  Settings,
  LogOut,
  BotMessageSquare,
  FileText,
  Target,
  Tags,
  Landmark,
  WalletCards,
  ListChecks,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import React from "react";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  section?: string;
}

const mainNavItemsMobile: NavItem[] = [
  { href: "/home", label: "Dashboard", icon: LayoutDashboard, section: "Overview" },
  { href: "/budgets", label: "Budget Center", icon: WalletCards, section: "Overview" },
  { href: "/accounts", label: "Accounts", icon: Landmark, section: "Management" },
  { href: "/budgets/category", label: "Category Budgets", icon: ListChecks, section: "Management" },
  { href: "/categories", label: "Categories", icon: Tags, section: "Management" },
  { href: "/transactions", label: "Transactions", icon: CreditCard, section: "Management" },
  { href: "/goals", label: "Financial Goals", icon: Target, section: "Management" },
  { href: "/reports", label: "Reports", icon: PieChartIcon, section: "Analysis" },
  { href: "/trends", label: "Trend Tracking", icon: TrendingUp, section: "Analysis" },
  { href: "/insights", label: "AI Insights", icon: BotMessageSquare, section: "Analysis" },
  { href: "/loans-savings", label: "Loans & Savings", icon: FileText, section: "Trackers" },
];
const settingsNavItemsMobile: NavItem[] = [
  { href: "/settings", label: "Settings", icon: Settings },
];


export function MobileHeader() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);

  const userInitial = session?.user?.name
    ? session.user.name.charAt(0).toUpperCase()
    : session?.user?.email
    ? session.user.email.charAt(0).toUpperCase()
    : "?";

  const navSectionsMobile: { title: string; items: NavItem[] }[] = [
    { title: "Overview", items: mainNavItemsMobile.filter(item => item.section === "Overview") },
    { title: "Management", items: mainNavItemsMobile.filter(item => item.section === "Management") },
    { title: "Analysis", items: mainNavItemsMobile.filter(item => item.section === "Analysis") },
    { title: "Trackers", items: mainNavItemsMobile.filter(item => item.section === "Trackers") },
  ];

  return (
    <header className="md:hidden sticky top-0 z-40 flex items-center justify-between h-16 px-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon">
            <Menu className="h-6 w-6" />
            <span className="sr-only">Toggle Navigation</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[280px] p-0 flex flex-col">
          <SheetHeader className="p-4 border-b">
            <SheetTitle>
              <Link
                href="/home"
                className="flex items-center gap-2 text-lg font-semibold text-primary"
                onClick={() => setIsSheetOpen(false)}
              >
                <PiggyBank className="h-7 w-7" />
                <span>BudgetFlo</span>
              </Link>
            </SheetTitle>
          </SheetHeader>
          <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
            {navSectionsMobile.map((section) => (
              section.items.length > 0 && (
                <div key={section.title}>
                  {section.title && (
                    <h3 className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                      {section.title}
                    </h3>
                  )}
                  {section.items.map((item) => (
                    <SheetClose asChild key={item.href}>
                      <Link
                        href={item.href}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                          (pathname === item.href || (item.href !== "/home" && pathname.startsWith(item.href)))
                            ? "bg-primary/10 text-primary dark:bg-primary/20"
                            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground dark:hover:bg-muted/50"
                        )}
                      >
                        <item.icon className="h-5 w-5" />
                        <span>{item.label}</span>
                      </Link>
                    </SheetClose>
                  ))}
                </div>
              )
            ))}
          </nav>
          <div className="mt-auto border-t p-3 space-y-2">
            {settingsNavItemsMobile.map((item) => (
               <SheetClose asChild key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                     pathname === item.href
                      ? "bg-muted text-foreground dark:bg-muted/80"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground dark:hover:bg-muted/50"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </Link>
              </SheetClose>
            ))}
            {session?.user && (
              <div className="flex items-center justify-between pt-2 border-t mt-2">
                <div className="flex items-center gap-2">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={session.user.image ?? undefined} alt={session.user.name ?? "User"} />
                    <AvatarFallback>{userInitial}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-foreground">{session.user.name}</span>
                    <span className="text-xs text-muted-foreground">{session.user.email}</span>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => { signOut({ callbackUrl: '/' }); setIsSheetOpen(false); }} title="Log out">
                  <LogOut className="h-5 w-5" />
                </Button>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <Link href="/home" className="flex items-center gap-2 text-lg font-semibold text-primary md:hidden">
        <PiggyBank className="h-7 w-7" />
        <span className="sr-only">BudgetFlo Home</span>
      </Link>
      <ThemeToggle />
    </header>
  );
}
