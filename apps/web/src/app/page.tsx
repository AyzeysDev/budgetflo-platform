// apps/web/src/app/page.tsx
import Link from 'next/link';
import Navbar from '@/components/common/Navbar';
import Footer from '@/components/common/Footer';
import { Button } from '@/components/ui/button';
import type { Metadata } from 'next';
import { TrendingUp, Target, PieChart, Bot, CheckCircle } from 'lucide-react';

export const metadata: Metadata = {
  title: 'BudgetFlo | Smart Budgeting & Expense Tracking with AI',
  description: 'Take control of your finances with BudgetFlo. Easy-to-use budgeting tools, expense tracking, visual dashboards, and AI-powered insights to help you achieve your financial goals.',
};

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="flex-grow">
        {/* Hero Section */}
        <section
          id="hero-section"
          className="relative text-center pt-20 pb-24 md:pt-28 md:pb-32 lg:pt-32 lg:pb-40 bg-gradient-to-b from-primary-light via-background to-background dark:from-primary-dark/30 dark:via-background dark:to-background overflow-hidden"
        >
          <div className="container mx-auto px-6 sm:px-8 relative z-10">
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-6 text-foreground leading-tight tracking-tight">
              Master Your Money with <span className="text-primary">BudgetFlo</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-xl md:max-w-2xl mx-auto mb-10">
              Effortlessly set budgets, track spending, and gain AI-powered financial insights. Your journey to financial clarity starts here.
            </p>
            <Button asChild size="lg" className="px-8 py-3 text-lg font-semibold rounded-lg shadow-md hover:bg-primary/90 transition-all duration-300 ease-in-out transform hover:scale-105 active:scale-95">
              <Link href="/signup">Get Started Free</Link>
            </Button>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-16 md:py-24 bg-background">
          <div className="container mx-auto px-6 sm:px-8 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Smart Features for Financial Wellness</h2>
            <p className="text-lg text-muted-foreground mb-12 max-w-xl mx-auto">
              BudgetFlo provides the tools you need to succeed financially.
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {[
                { icon: Target, title: "Intuitive Budgeting", desc: "Set monthly budgets for various categories and subcategories with ease." },
                { icon: TrendingUp, title: "Expense Tracking", desc: "Monitor your weekly and monthly spending against your set limits effortlessly." },
                { icon: PieChart, title: "Visual Dashboards", desc: "See budget vs. actual spending with clear radar and line graphs." },
                { icon: Bot, title: "AI-Powered Insights", desc: "Get smart suggestions, behavioral trends, and future predictions from Gemini AI." },
              ].map((feature, index) => (
                <div key={index} className="p-6 border border-border rounded-lg shadow-lg bg-card hover:shadow-xl transition-shadow duration-300 flex flex-col items-center text-center">
                  <feature.icon className="h-10 w-10 text-primary mb-5" strokeWidth={1.5} />
                  <h3 className="text-xl font-semibold mb-2 text-card-foreground">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm flex-grow">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works Section - Updated background and card styling */}
        <section id="how-it-works" className="py-16 md:py-24 bg-background">
            <div className="container mx-auto px-6 sm:px-8 text-center">
                <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Get Started in 3 Simple Steps</h2>
                <p className="text-lg text-muted-foreground mb-12 max-w-xl mx-auto">
                    Take control of your finances quickly and easily with BudgetFlo.
                </p>
                 <div className="grid md:grid-cols-3 gap-8 text-left">
                    {[
                        { title: "Set Your Budgets", desc: "Define your monthly spending goals across customizable categories like housing, food, and transport." },
                        { title: "Track Your Expenses", desc: "Easily log your daily transactions and see how your spending aligns with your budget in real-time." },
                        { title: "Gain Smart Insights", desc: "Receive AI-driven weekly and monthly reports, spending habit analysis, and tips to save more effectively." },
                    ].map((step, index) => (
                        <div key={index} className="p-6 bg-card border border-border rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300">
                            <div className="flex items-center justify-center w-12 h-12 mb-5 rounded-full bg-primary/10 text-primary font-bold text-xl mx-auto md:mx-0">{index + 1}</div>
                            <h3 className="mb-2 text-xl font-semibold text-card-foreground text-center md:text-left">{step.title}</h3>
                            <p className="text-muted-foreground text-sm">{step.desc}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="py-16 md:py-24 bg-background">
          <div className="container mx-auto px-6 sm:px-8 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Simple, Transparent Pricing</h2>
            <p className="text-lg text-muted-foreground mb-12 max-w-xl mx-auto">
              Start for free, upgrade when youre ready for more power.
            </p>
            <div className="grid md:grid-cols-1 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
                {/* Free Tier */}
                <div className="p-8 border border-border rounded-xl shadow-lg bg-card flex flex-col">
                    <h3 className="text-2xl font-semibold mb-2 text-card-foreground">Free</h3>
                    <p className="text-4xl font-bold text-primary mb-1">$0<span className="text-base font-normal text-muted-foreground">/month</span></p>
                    <p className="text-sm text-muted-foreground mb-6">Perfect for getting started.</p>
                    <ul className="space-y-2.5 text-left mb-8 flex-grow text-sm">
                        {[ "Basic Budgeting Tools", "Manual Expense Tracking", "Up to 3 Categories", "Weekly Email Summary"].map(item => (
                            <li key={item} className="flex items-center"><CheckCircle className="h-4 w-4 mr-2 text-green-500 shrink-0" /> <span className="text-muted-foreground">{item}</span></li>
                        ))}
                    </ul>
                    <Button asChild variant="outline" size="lg" className="w-full mt-auto">
                        <Link href="/signup">Get Started</Link>
                    </Button>
                </div>
                {/* Pro Tier */}
                <div className="p-8 border-2 border-primary rounded-xl shadow-2xl bg-card flex flex-col relative ring-2 ring-primary/30">
                    <div className="absolute top-0 -translate-y-1/2 left-1/2 -translate-x-1/2">
                        <span className="bg-primary text-primary-foreground px-4 py-1.5 text-sm font-semibold rounded-full shadow-md">Most Popular</span>
                    </div>
                    <h3 className="text-2xl font-semibold mb-2 text-card-foreground mt-5">Pro</h3>
                    <p className="text-4xl font-bold text-primary mb-1">$7<span className="text-base font-normal text-muted-foreground">/month</span></p>
                    <p className="text-sm text-muted-foreground mb-6">For individuals serious about financial control.</p>
                     <ul className="space-y-2.5 text-left mb-8 flex-grow text-sm">
                        {[ "Everything in Free, plus:", "Unlimited Categories & Budgets", "Advanced Visual Dashboards", "AI-Powered Insights & Predictions", "Financial Goal Setting & Tracking", "Priority Email Support"].map(item => (
                            <li key={item} className="flex items-center"><CheckCircle className="h-4 w-4 mr-2 text-green-500 shrink-0" /> <span className="text-muted-foreground">{item}</span></li>
                        ))}
                    </ul>
                    <Button asChild size="lg" className="w-full mt-auto">
                        <Link href="/signup?plan=pro">Choose Pro</Link>
                    </Button>
                </div>
                 {/* Custom/Team Tier */}
                <div className="p-8 border border-border rounded-xl shadow-lg bg-card flex flex-col">
                    <h3 className="text-2xl font-semibold mb-2 text-card-foreground">Teams</h3>
                    <p className="text-lg font-semibold text-primary mb-1">Lets Talk</p>
                     <p className="text-sm text-muted-foreground mb-6">For small teams or custom needs.</p>
                    <ul className="space-y-2.5 text-left mb-8 flex-grow text-sm">
                        {[ "Everything in Pro, plus:", "Shared Budgets (Optional)", "Team Dashboards", "Custom Integrations", "Dedicated Account Manager" ].map(item => (
                            <li key={item} className="flex items-center"><CheckCircle className="h-4 w-4 mr-2 text-green-500 shrink-0" /> <span className="text-muted-foreground">{item}</span></li>
                        ))}
                    </ul>
                    <Button asChild variant="outline" size="lg" className="w-full mt-auto">
                        <Link href="/contact-sales">Contact Us</Link>
                    </Button>
                </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}