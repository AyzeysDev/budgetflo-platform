// apps/web/src/app/(app)/budgets/category/columns.tsx
"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, MoreHorizontal, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { WebAppBudget, WebAppCategory } from '@/types/budget';
import { IconRenderer, AvailableIconName } from '../../categories/categoryUtils';
import { cn } from "@/lib/utils";

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

// This combines the WebAppBudget with a resolved category object.
// Omit is used to prevent conflicting optional 'category' properties.
export type CategoryBudgetWithDetails = Omit<WebAppBudget, 'category'> & {
  category: WebAppCategory | null;
};

export const columns = (
  onEdit: (budget: CategoryBudgetWithDetails) => void,
  onDelete: (budget: CategoryBudgetWithDetails) => void
): ColumnDef<CategoryBudgetWithDetails>[] => [
  {
    accessorKey: "category",
    header: "Category",
    cell: ({ row }) => {
      const category = row.original.category;
      if (!category) return <Badge variant="secondary">Unlinked</Badge>;
      return (
        <div className="flex items-center gap-2 font-medium">
          <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{backgroundColor: category.color || '#ccc'}}>
            <IconRenderer name={category.icon as AvailableIconName} size={14} color="white" />
          </div>
          <span>{category.name}</span>
        </div>
      );
    },
  },
  {
    accessorKey: "amount",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="justify-end w-full"
      >
        Budgeted
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => <div className="text-right font-mono">{formatCurrency(row.original.amount)}</div>,
  },
  {
    accessorKey: "spentAmount",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="justify-end w-full"
      >
        Spent
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => <div className="text-right font-mono text-destructive">{formatCurrency(row.original.spentAmount)}</div>,
  },
  {
    id: "remaining",
    header: () => <div className="text-right">Remaining</div>,
    cell: ({ row }) => {
      const remaining = row.original.amount - row.original.spentAmount;
      return (
        <div className={cn("text-right font-mono", remaining >= 0 ? "text-green-600" : "text-destructive")}>
          {formatCurrency(remaining)}
        </div>
      );
    },
  },
  {
    id: "progress",
    header: "Progress",
    cell: ({ row }) => {
      const { amount, spentAmount } = row.original;
      const progress = amount > 0 ? Math.min((spentAmount / amount) * 100, 100) : 0;
      const isOver = spentAmount > amount;
      return (
        <div className="flex items-center gap-2">
          <Progress value={progress} className={cn("h-2 w-24", isOver && "bg-destructive/20 [&>*]:bg-destructive")} />
          <span className="text-xs text-muted-foreground w-10 text-right">{progress.toFixed(0)}%</span>
        </div>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const budget = row.original;
      return (
        <div className="text-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => onEdit(budget)}>
                <Edit className="mr-2 h-4 w-4" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(budget)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
  },
];
