// apps/web/src/app/(app)/accounts/AccountsClientPage.tsx
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { PlusCircle, Landmark, CreditCard, PiggyBank, Briefcase, HandCoins, HelpCircle, MoreVertical, Edit, Trash2, Banknote, Home, Car, GraduationCap, Coins, PieChart as PieChartIcon, ArrowUpRight, ArrowDownRight, WalletCards, TrendingUp, TrendingDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { toast } from 'sonner';
import type { WebAppAccount, WebAppAccountType, WebAppAssetType, WebAppLiabilityType } from '@/types/account';
import { ASSET_TYPES, LIABILITY_TYPES } from '@/types/account';
import AccountForm from './AccountForm';
import { Badge } from '@/components/ui/badge';
import { ChartContainer, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { PieChart, Pie, Tooltip } from 'recharts';

interface AccountsClientPageProps {
  initialAccounts: WebAppAccount[];
}

const formatCurrency = (value: number | undefined | null, currency = 'USD') => {
    if (value === null || value === undefined) return '$0.00';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value);
};

const accountTypeConfig: Record<WebAppAccountType, { label: string; icon: React.ElementType; isDebt: boolean }> = {
    checking: { label: 'Checking Account', icon: Landmark, isDebt: false },
    savings: { label: 'Savings Account', icon: PiggyBank, isDebt: false },
    cash: { label: 'Cash', icon: Banknote, isDebt: false },
    investment: { label: 'Investment Account', icon: Briefcase, isDebt: false },
    property: { label: 'Property', icon: Home, isDebt: false },
    other_asset: { label: 'Other Asset', icon: Coins, isDebt: false },
    credit_card: { label: 'Credit Card', icon: CreditCard, isDebt: true },
    home_loan: { label: 'Home Loan / Mortgage', icon: Home, isDebt: true },
    personal_loan: { label: 'Personal Loan', icon: HandCoins, isDebt: true },
    car_loan: { label: 'Car Loan', icon: Car, isDebt: true },
    student_loan: { label: 'Student Loan', icon: GraduationCap, isDebt: true },
    line_of_credit: { label: 'Line of Credit', icon: CreditCard, isDebt: true },
    other_liability: { label: 'Other Liability', icon: HelpCircle, isDebt: true },
};

const assetTypeOrder: WebAppAssetType[] = ['checking', 'savings', 'investment', 'property', 'cash', 'other_asset'];
const liabilityTypeOrder: WebAppLiabilityType[] = ['credit_card', 'home_loan', 'car_loan', 'student_loan', 'personal_loan', 'line_of_credit', 'other_liability'];

const ASSET_COLOR = "#02a141";
const LIABILITY_COLOR = "#990f0f";

export default function AccountsClientPage({ initialAccounts }: AccountsClientPageProps) {
  const [accounts, setAccounts] = useState<WebAppAccount[]>(initialAccounts);
  const [accountToDelete, setAccountToDelete] = useState<WebAppAccount | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<WebAppAccount | null>(null);

  useEffect(() => {
    setAccounts(initialAccounts);
  }, [initialAccounts]);
  
  const handleAddClick = () => {
    setEditingAccount(null);
    setIsFormOpen(true);
  }

  const handleEditClick = (account: WebAppAccount) => {
    setEditingAccount(account);
    setIsFormOpen(true);
  }

  const { netWorth, totalAssets, totalDebts } = useMemo(() => {
    return accounts.reduce((acc, account) => {
        const balance = account.balance;
        if (LIABILITY_TYPES.includes(account.type as WebAppLiabilityType)) {
            acc.totalDebts += balance;
        } else {
            acc.totalAssets += balance;
        }
        acc.netWorth = acc.totalAssets - acc.totalDebts;
        return acc;
    }, { netWorth: 0, totalAssets: 0, totalDebts: 0 });
  }, [accounts]);

  const netWorthChartData = useMemo(() => {
    const data = [];
    if (totalAssets > 0) data.push({ name: 'Total Assets', value: totalAssets, fill: ASSET_COLOR });
    if (totalDebts > 0) data.push({ name: 'Total Liabilities', value: totalDebts, fill: LIABILITY_COLOR });
    return data;
  }, [totalAssets, totalDebts]);

  const chartConfig = {
    "Total Assets": { label: "Assets", color: ASSET_COLOR },
    "Total Liabilities": { label: "Liabilities", color: LIABILITY_COLOR },
  } satisfies ChartConfig;


  const groupedAssets = useMemo(() => {
    const groups: Partial<Record<WebAppAssetType, WebAppAccount[]>> = {};
    const assetAccounts = accounts.filter(acc => ASSET_TYPES.includes(acc.type as WebAppAssetType));
    for (const account of assetAccounts) {
        if (!groups[account.type as WebAppAssetType]) {
            groups[account.type as WebAppAssetType] = [];
        }
        groups[account.type as WebAppAssetType]?.push(account);
    }
    return groups;
  }, [accounts]);

  const groupedLiabilities = useMemo(() => {
    const groups: Partial<Record<WebAppLiabilityType, WebAppAccount[]>> = {};
    const liabilityAccounts = accounts.filter(acc => LIABILITY_TYPES.includes(acc.type as WebAppLiabilityType));
     for (const account of liabilityAccounts) {
        if (!groups[account.type as WebAppLiabilityType]) {
            groups[account.type as WebAppLiabilityType] = [];
        }
        groups[account.type as WebAppLiabilityType]?.push(account);
    }
    return groups;
  }, [accounts]);

  const handleDeleteConfirm = async () => {
    if (!accountToDelete) return;
    const toastId = `delete-account-${accountToDelete.accountId}`;
    toast.loading("Deleting account...", { id: toastId });
    try {
        const response = await fetch(`/api/accounts/${accountToDelete.accountId}`, { method: 'DELETE' });
        if (response.status !== 204) {
             const errorData = await response.json().catch(() => ({error: 'Failed to delete account.'}));
             throw new Error(errorData.error);
        }
        toast.success(`Account "${accountToDelete.name}" deleted successfully.`, { id: toastId });
        setAccounts(prev => prev.filter(acc => acc.accountId !== accountToDelete.accountId));
    } catch (error) {
        toast.error((error as Error).message, { id: toastId });
    } finally {
        setAccountToDelete(null);
    }
  };

  const onFormSaveSuccess = (savedAccount: WebAppAccount) => {
    setAccounts(prev => {
        const existing = prev.find(acc => acc.accountId === savedAccount.accountId);
        if (existing) {
            return prev.map(acc => acc.accountId === savedAccount.accountId ? savedAccount : acc);
        }
        return [...prev, savedAccount];
    });
    setIsFormOpen(false); // Close the form on success
  };
  
  const hasAssets = Object.keys(groupedAssets).length > 0;
  const hasLiabilities = Object.keys(groupedLiabilities).length > 0;


  return (
    <>
      <div className="flex flex-col gap-6 md:gap-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight flex items-center gap-3">
              <Landmark className="h-8 w-8 text-primary" />
              Accounts
            </h1>
            <p className="text-md text-muted-foreground mt-1">
              A complete overview of your financial accounts.
            </p>
          </div>
          <Button onClick={handleAddClick}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add Account
          </Button>
        </div>

        <Card>
            <CardHeader>
                <CardTitle>Net Worth Overview</CardTitle>
                <CardDescription>A snapshot of your financial health.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-center">
                <div className="flex flex-col items-center justify-center gap-4">
                    <div className="h-[180px] w-full">
                        {netWorthChartData.length > 0 ? (
                            <ChartContainer config={chartConfig} className="mx-auto aspect-square h-full">
                                <PieChart>
                                    <Tooltip
                                        cursor={false}
                                        content={<ChartTooltipContent hideLabel />}
                                    />
                                    <Pie
                                        data={netWorthChartData}
                                        dataKey="value"
                                        nameKey="name"
                                        innerRadius={60}
                                        outerRadius={90}
                                        cornerRadius={8}
                                        paddingAngle={5}
                                        strokeWidth={2}
                                        labelLine={{ stroke: "hsl(var(--muted-foreground))" }}
                                        label={({ cx, cy, midAngle, outerRadius, value }) => {
                                            const RADIAN = Math.PI / 180;
                                            const radius = outerRadius + 20;
                                            const x = cx + radius * Math.cos(-midAngle * RADIAN);
                                            const y = cy + radius * Math.sin(-midAngle * RADIAN);
                                            return (
                                                <text
                                                    x={x}
                                                    y={y}
                                                    textAnchor={x > cx ? 'start' : 'end'}
                                                    dominantBaseline="central"
                                                    className="text-xs fill-foreground"
                                                >
                                                    {new Intl.NumberFormat('en-US', {
                                                        style: 'decimal',
                                                        notation: 'compact',
                                                        compactDisplay: 'short'
                                                    }).format(value)}
                                                </text>
                                            );
                                        }}
                                    />
                                </PieChart>
                            </ChartContainer>
                        ) : (
                            <div className="flex flex-col items-center justify-center text-center text-muted-foreground p-8 h-full">
                                <PieChartIcon className="h-12 w-12 mb-3 opacity-50" />
                                <p className="font-semibold text-base">Net Worth Breakdown</p>
                                <p className="text-xs max-w-xs">Add your first asset or liability account to visualize your financial standing.</p>
                            </div>
                        )}
                    </div>
                    {netWorthChartData.length > 0 && netWorth !== 0 && (
                        <div className="text-center">
                            <div className="flex items-center justify-center gap-1 text-sm font-medium">
                                {netWorth > 0 ? (
                                    <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                                        <TrendingUp className="h-4 w-4" />
                                        <span>Assets are up!</span>
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
                                        <TrendingDown className="h-4 w-4" />
                                        <span>Liablities are up!</span>
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Based on current assets vs liabilities.
                            </p>
                        </div>
                    )}
                </div>
                <div className="space-y-3">
                     <div className="flex items-center p-3 rounded-lg bg-muted/50 border">
                        <div className="p-2.5 rounded-full bg-green-600/10 text-green-600 dark:text-green-400 mr-3">
                            <ArrowUpRight className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Total Assets</p>
                            <p className="text-xl font-semibold">{formatCurrency(totalAssets)}</p>
                        </div>
                    </div>
                     <div className="flex items-center p-3 rounded-lg bg-muted/50 border">
                         <div className="p-2.5 rounded-full bg-red-600/10 text-red-600 dark:text-red-400 mr-3">
                            <ArrowDownRight className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Total Liabilities</p>
                            <p className="text-xl font-semibold">{formatCurrency(totalDebts)}</p>
                        </div>
                    </div>
                     <div className="flex items-center p-3 rounded-lg bg-primary/10 border border-primary/20">
                         <div className="p-2.5 rounded-full bg-primary/20 text-primary mr-3">
                            <PieChartIcon className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-sm text-primary/80">Net Worth</p>
                            <p className="text-xl font-bold text-primary">{formatCurrency(netWorth)}</p>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
                <h2 className="text-2xl font-semibold tracking-tight">Assets</h2>
                {!hasAssets ? (
                    <Card className="flex flex-col items-center justify-center p-8 text-center border-dashed">
                        <WalletCards className="h-12 w-12 text-muted-foreground mb-4" />
                        <CardTitle className="text-lg font-medium">No Asset Accounts</CardTitle>
                        <CardDescription className="mt-1">Add a checking, savings, or investment account to get started.</CardDescription>
                    </Card>
                ) : (
                    <Accordion type="multiple" defaultValue={assetTypeOrder.filter(type => groupedAssets[type])} className="w-full">
                        {assetTypeOrder.map(type => {
                            const accountsForType = groupedAssets[type];
                            if (!accountsForType || accountsForType.length === 0) return null;
                            const { label, icon: Icon } = accountTypeConfig[type];
                            const typeTotal = accountsForType.reduce((sum, acc) => sum + acc.balance, 0);

                            return (
                                <AccordionItem value={type} key={type}>
                                    <AccordionTrigger className="text-lg font-medium hover:no-underline px-2">
                                        <div className="flex items-center gap-3 flex-1">
                                            <Icon className="h-5 w-5 text-muted-foreground" />
                                            <span>{label}</span>
                                            <Badge variant="secondary">{accountsForType.length}</Badge>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-lg font-semibold text-green-600 dark:text-green-400">{formatCurrency(typeTotal)}</span>
                                            <div className="w-8" /> 
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent>
                                    {accountsForType.map(account => (
                                        <div key={account.accountId} className="flex items-center p-3 rounded-md hover:bg-muted/50">
                                            <div className="flex items-center gap-3 flex-1">
                                                <div className="text-foreground font-medium">{account.name}</div>
                                                {account.institution && <Badge variant="outline" className="hidden sm:inline-flex">{account.institution}</Badge>}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="font-semibold text-foreground">{formatCurrency(account.balance)}</div>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                                                <MoreVertical className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem onSelect={() => handleEditClick(account)}>
                                                                <Edit className="mr-2 h-4 w-4" /> Edit
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => setAccountToDelete(account)} className="text-destructive focus:text-destructive">
                                                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                            </div>
                                        </div>
                                    ))}
                                    </AccordionContent>
                                </AccordionItem>
                            )
                        })}
                    </Accordion>
                )}
            </div>

             <div className="space-y-6">
                <h2 className="text-2xl font-semibold tracking-tight">Liabilities</h2>
                 {!hasLiabilities ? (
                    <Card className="flex flex-col items-center justify-center p-8 text-center border-dashed">
                        <CreditCard className="h-12 w-12 text-muted-foreground mb-4" />
                        <CardTitle className="text-lg font-medium">No Liability Accounts</CardTitle>
                        <CardDescription className="mt-1">Add a credit card, loan, or other liability to see the full picture.</CardDescription>
                    </Card>
                ) : (
                    <Accordion type="multiple" defaultValue={liabilityTypeOrder.filter(type => groupedLiabilities[type])} className="w-full">
                        {liabilityTypeOrder.map(type => {
                            const accountsForType = groupedLiabilities[type];
                            if (!accountsForType || accountsForType.length === 0) return null;
                            const { label, icon: Icon } = accountTypeConfig[type];
                            const typeTotal = accountsForType.reduce((sum, acc) => sum + acc.balance, 0);

                            return (
                                <AccordionItem value={type} key={type}>
                                    <AccordionTrigger className="text-lg font-medium hover:no-underline px-2">
                                    <div className="flex items-center gap-3 flex-1">
                                        <Icon className="h-5 w-5 text-muted-foreground" />
                                        <span>{label}</span>
                                        <Badge variant="secondary">{accountsForType.length}</Badge>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-lg font-semibold text-red-600 dark:text-red-400">{formatCurrency(typeTotal)}</span>
                                        <div className="w-8" />
                                    </div>
                                    </AccordionTrigger>
                                    <AccordionContent>
                                    {accountsForType.map(account => (
                                        <div key={account.accountId} className="flex items-center p-3 rounded-md hover:bg-muted/50">
                                            <div className="flex items-center gap-3 flex-1">
                                                <div className="text-foreground font-medium">{account.name}</div>
                                                {account.institution && <Badge variant="outline" className="hidden sm:inline-flex">{account.institution}</Badge>}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="font-semibold text-foreground">{formatCurrency(account.balance)}</div>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                                                <MoreVertical className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem onSelect={() => handleEditClick(account)}>
                                                                <Edit className="mr-2 h-4 w-4" /> Edit
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => setAccountToDelete(account)} className="text-destructive focus:text-destructive">
                                                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                            </div>
                                        </div>
                                    ))}
                                    </AccordionContent>
                                </AccordionItem>
                            )
                        })}
                    </Accordion>
                )}
            </div>
        </div>
      </div>
      
      {/* Reusable Form Dialog */}
      <AccountForm 
        isOpen={isFormOpen}
        onOpenChange={setIsFormOpen}
        accountToEdit={editingAccount}
        onSaveSuccess={onFormSaveSuccess}
      />
      
      {accountToDelete && (
        <Dialog open={!!accountToDelete} onOpenChange={() => setAccountToDelete(null)}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Delete Account</DialogTitle>
                    <DialogDescription>
                        Are you sure you want to delete the account &quot;{accountToDelete.name}&quot;? This action cannot be undone.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setAccountToDelete(null)}>Cancel</Button>
                    <Button variant="destructive" onClick={handleDeleteConfirm}>Delete</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      )}
    </>
  );
}
