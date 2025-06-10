// apps/web/src/app/(app)/transactions/columns.tsx
"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, MoreHorizontal, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { WebAppTransaction } from "@/types/transaction";
import { WebAppCategory } from "@/types/budget";
import { WebAppAccount } from "@/types/account";
import { IconRenderer, AvailableIconName } from '../categories/categoryUtils';
import { cn } from "@/lib/utils";

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

// Merged Transaction type for easier prop passing
export type TransactionWithDetails = WebAppTransaction & {
  category?: WebAppCategory | null;
  account?: WebAppAccount | null;
};

export const columns = (
  onEdit: (transaction: TransactionWithDetails) => void,
  onDelete: (transaction: TransactionWithDetails) => void
): ColumnDef<TransactionWithDetails>[] => [
  {
    accessorKey: "date",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Date
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const date = new Date(row.getValue("date"));
      return <div className="text-left">{date.toLocaleDateString()}</div>;
    },
  },
  {
    accessorKey: "category",
    header: "Category",
    cell: ({ row }) => {
      const category = row.original.category;
      if (!category) return <span className="text-muted-foreground">Uncategorized</span>;
      return (
        <Badge variant="outline" className="font-normal">
          <IconRenderer name={category.icon as AvailableIconName} size={14} className="mr-1.5" style={{color: category.color || 'inherit'}} />
          {category.name}
        </Badge>
      );
    },
  },
  {
    accessorKey: "account",
    header: "Account",
    cell: ({ row }) => {
      const account = row.original.account;
      return <div>{account?.name || 'N/A'}</div>;
    },
  },
  {
    accessorKey: "amount",
    header: ({ column }) => {
      return (
        <div className="text-right">
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Amount
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        </div>
      );
    },
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("amount"));
      const type = row.original.type;
      const isIncome = type === 'income';

      return (
        <div className={cn(
          "text-right font-medium",
          isIncome ? "text-green-600 dark:text-green-500" : "text-foreground"
        )}>
          {isIncome ? `+${formatCurrency(amount)}` : formatCurrency(amount)}
        </div>
      );
    },
  },
  {
    accessorKey: "notes",
    header: "Notes",
    cell: ({ row }) => {
        const notes = row.getValue("notes") as string | null;
        return <div className="text-sm text-muted-foreground truncate max-w-xs">{notes || '-'}</div>
    }
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const transaction = row.original;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => onEdit(transaction)}>
              <Edit className="mr-2 h-4 w-4" /> Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onDelete(transaction)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
