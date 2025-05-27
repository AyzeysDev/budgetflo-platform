// apps/web/src/app/layout.tsx
import { Geist, Geist_Mono } from "next/font/google"; // Using the exact import from jdmatchr-ui
import "./globals.css";
// Toaster is handled by Providers in this version
// import { Toaster } from "@/components/ui/sonner";
import Providers from "@/components/providers";
import type { Metadata } from 'next';

// Initialize Geist Sans font with variable and subsets (as in jdmatchr-ui)
const geistSans = Geist({ // Using 'Geist' as per jdmatchr-ui
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

// Initialize Geist Mono font with variable and subsets (as in jdmatchr-ui)
const geistMono = Geist_Mono({ // Using 'Geist_Mono' as per jdmatchr-ui
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: 'BudgetFlo | Smart Budgeting & Expense Tracking', // Updated for BudgetFlo
  description: 'Take control of your finances with BudgetFlo. Easy budgeting, expense tracking, and AI-powered insights to help you achieve your financial goals.', // Updated for BudgetFlo
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <body
        className="min-h-screen bg-background font-sans antialiased"
        // The font-sans class from Tailwind will use the --font-geist-sans variable
        // if your Tailwind CSS configuration (in globals.css @theme or tailwind.config.ts) is set up.
      >
        <Providers> {/* This component should wrap ThemeProvider and Toaster */}
          {children}
        </Providers>
        {/* The Toaster component is inside Providers in the jdmatchr-ui example you provided.
            If it were not, it would be placed here, like so:
            <Toaster richColors position="top-right"/>
        */}
      </body>
    </html>
  );
}