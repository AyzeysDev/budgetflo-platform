// apps/web/src/components/layout/Sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useState } from "react";
import {
  LayoutDashboard,
  CreditCard,
  TrendingUp,
  PieChartIcon,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  PiggyBank,
  BotMessageSquare,
  Target,
  Tags,
  Landmark,
  WalletCards,
  ListChecks,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useSession, signOut } from "next-auth/react";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  subItems?: NavItem[];
  section?: string;
}

const mainNavItems: NavItem[] = [
  { href: "/home", label: "Dashboard", icon: LayoutDashboard, section: "Overview" },
  { href: "/budgets", label: "Budget Center", icon: WalletCards, section: "Overview" },
  { href: "/accounts", label: "Accounts", icon: Landmark, section: "Management" },
  { href: "/budgets/category", label: "Category Budgets", icon: ListChecks, section: "Management" },
  { href: "/categories", label: "Categories", icon: Tags, section: "Management" },
  { href: "/transactions", label: "Transactions", icon: CreditCard, section: "Management" },
  { href: "/goals-trackers", label: "Goals & Trackers", icon: Target, section: "Trackers" },
  { href: "/reports", label: "Reports", icon: PieChartIcon, section: "Analysis" },
  { href: "/trends", label: "Trend Tracking", icon: TrendingUp, section: "Analysis" },
  { href: "/insights", label: "AI Insights", icon: BotMessageSquare, section: "Analysis" },
  { href: "/settings", label: "Settings", icon: Settings, section: "System" },
];

const settingsNavItems: NavItem[] = [
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const userInitial = session?.user?.name
    ? session.user.name.charAt(0).toUpperCase()
    : session?.user?.email
    ? session.user.email.charAt(0).toUpperCase()
    : "?";

  const toggleSidebar = () => setIsCollapsed(!isCollapsed);

  const navSections: { title: string; items: NavItem[] }[] = [
    { title: "Overview", items: mainNavItems.filter(item => item.section === "Overview") },
    { title: "Management", items: mainNavItems.filter(item => item.section === "Management") },
    { title: "Analysis", items: mainNavItems.filter(item => item.section === "Analysis") },
    { title: "Trackers", items: mainNavItems.filter(item => item.section === "Trackers") },
  ];


  return (
    <aside
      className={cn(
        "hidden md:flex flex-col bg-card border-r border-border transition-all duration-300 ease-in-out",
        isCollapsed ? "w-20" : "w-64 lg:w-72"
      )}
    >
      {/* Header */}
      <div className={cn("flex items-center border-b border-border p-4 h-16", isCollapsed ? "justify-center" : "justify-between")}>
        {!isCollapsed && (
          <Link href="/home" className="flex items-center gap-2 text-lg font-semibold text-primary">
            <PiggyBank className="h-7 w-7" />
            <span>BudgetFlo</span>
          </Link>
        )}
        <Button variant="ghost" size="icon" onClick={toggleSidebar} className={cn(isCollapsed && "mx-auto")}>
          {isCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
          <span className="sr-only">{isCollapsed ? "Expand sidebar" : "Collapse sidebar"}</span>
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
        {navSections.map((section) => (
          section.items.length > 0 && (
            <div key={section.title}>
              {!isCollapsed && section.title && (
                <h3 className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                  {section.title}
                </h3>
              )}
              {section.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isCollapsed ? "justify-center" : "",
                    (pathname === item.href || (item.href !== "/home" && pathname.startsWith(item.href)))
                      ? "bg-primary/10 text-primary dark:bg-primary/20"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground dark:hover:bg-muted/50"
                  )}
                  title={isCollapsed ? item.label : undefined}
                >
                  <item.icon className={cn("h-5 w-5", isCollapsed ? "mx-auto" : "")} />
                  {!isCollapsed && <span>{item.label}</span>}
                </Link>
              ))}
            </div>
          )
        ))}
      </nav>

      {/* Footer - Settings, User, Logout, Theme */}
      <div className="mt-auto border-t border-border p-3 space-y-2">
         {settingsNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isCollapsed ? "justify-center" : "",
                pathname === item.href
                  ? "bg-muted text-foreground dark:bg-muted/80"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground dark:hover:bg-muted/50"
              )}
              title={isCollapsed ? item.label : undefined}
            >
              <item.icon className={cn("h-5 w-5", isCollapsed ? "mx-auto" : "")} />
              {!isCollapsed && <span>{item.label}</span>}
            </Link>
          ))}

        <div className={cn("flex items-center gap-2", isCollapsed ? "flex-col" : "justify-between")}>
            <ThemeToggle />
            {!isCollapsed && session?.user && (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="flex items-center gap-2 p-1 h-auto focus-visible:ring-0 focus-visible:ring-offset-0">
                             <Avatar className="h-8 w-8">
                                <AvatarImage src={session.user.image ?? undefined} alt={session.user.name ?? "User"} />
                                <AvatarFallback>{userInitial}</AvatarFallback>
                            </Avatar>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent side="top" align="end" className="w-56 mb-2">
                        <DropdownMenuLabel className="font-normal">
                            <div className="flex flex-col space-y-1">
                                <p className="text-sm font-medium leading-none">{session.user.name}</p>
                                <p className="text-xs leading-none text-muted-foreground">
                                    {session.user.email}
                                </p>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => signOut({ callbackUrl: '/' })}>
                            <LogOut className="mr-2 h-4 w-4" />
                            <span>Log out</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            )}
             {isCollapsed && session?.user && (
                <Avatar className="h-8 w-8 mt-2">
                    <AvatarImage src={session.user.image ?? undefined} alt={session.user.name ?? "User"} />
                    <AvatarFallback>{userInitial}</AvatarFallback>
                </Avatar>
            )}
        </div>
         {isCollapsed && (
            <Button variant="ghost" size="icon" onClick={() => signOut({ callbackUrl: '/' })} title="Log out" className="w-full mt-1">
                <LogOut className="h-5 w-5" />
            </Button>
        )}
      </div>
    </aside>
  );
}
