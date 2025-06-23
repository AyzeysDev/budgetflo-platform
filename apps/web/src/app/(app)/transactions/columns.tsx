// apps/web/src/app/(app)/transactions/columns.tsx
"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, MoreHorizontal, Edit, Trash2, ArrowRightLeft } from "lucide-react";
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
import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';

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

/**
 * A Client Component to safely format dates on the client side
 * to prevent hydration mismatch errors.
 * @param {object} props - The component props.
 * @param {string | Date} props.date - The date to format.
 */
const FormattedDateCell = ({ date }: { date: string | Date }) => {
    const [formattedDate, setFormattedDate] = useState<string>('');

    useEffect(() => {
        // This effect runs only on the client, after hydration.
        // It safely formats the date according to the user's locale.
        setFormattedDate(new Date(date).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        }));
    }, [date]);

    // Render a placeholder or nothing on the server and initial client render
    // to ensure the server and client output match initially.
    if (!formattedDate) {
        // You can return a placeholder skeleton here if you want
        return <div className="text-left w-24 h-5" />;
    }

    return <div className="text-left">{formattedDate}</div>;
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
      const dateValue = row.getValue("date") as string;
      // Use the client-side safe date formatter component
      return <FormattedDateCell date={dateValue} />;
    },
  },
  {
    accessorKey: "category",
    header: "Category",
    cell: ({ row }) => {
      const category = row.original.category as WebAppCategory | null;
      const source = row.original.source;

      if (source === 'account_transfer') {
        return <Badge variant="outline" className="text-muted-foreground">Transfer</Badge>;
      }

      if (!category) {
        return <span className="text-muted-foreground text-xs italic">Uncategorized</span>;
      }
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
    header: ({ column }) => <div className="text-right">Amount</div>,
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("amount"));
      const { type, source } = row.original;

      const isTransfer = source === 'account_transfer';

      const formatted = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(amount);

      let amountColorClass = "text-foreground";
      if (isTransfer) {
        amountColorClass = "text-muted-foreground";
      } else if (type === 'income') {
        amountColorClass = "text-green-600 dark:text-green-500";
      } else if (type === 'expense') {
        amountColorClass = "text-red-600 dark:text-red-500";
      }
      
      return <div className={cn("text-right font-medium", amountColorClass)}>{formatted}</div>
    },
  },
  {
    accessorKey: "description",
    header: "Description",
    cell: ({ row }) => {
      const { description, source } = row.original;
      const isTransfer = source === 'account_transfer';
      return (
        <div className="flex items-center gap-2">
          {isTransfer && <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />}
          <span className="truncate max-w-[250px]">{description}</span>
        </div>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const transaction = row.original;
      const isTransfer = transaction.source === 'account_transfer';

      return (
        <div className="text-right">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">Open menu</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                {!isTransfer && (
                  <DropdownMenuItem onClick={() => onEdit(transaction)}>
                    <Edit className="mr-2 h-4 w-4" />
                    <span>Edit</span>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  onClick={() => onDelete(transaction)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  <span>Delete</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
        </div>
      );
    },
  },
];
