"use client"

import { ColumnDef } from "@tanstack/react-table"
import { MoreHorizontal, Edit, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Progress } from "@/components/ui/progress"
import type { WebAppLoanTracker } from "@/types/tracker"
import type { WebAppAccount } from "@/types/account"

const formatCurrency = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
const formatDate = (date: string) => new Date(date).toLocaleDateString("en-US", { year: 'numeric', month: 'long', day: 'numeric' });

export const getLoanColumns = (
  accountsMap: Map<string, WebAppAccount>,
  onEdit: (tracker: WebAppLoanTracker) => void,
  onDelete: (trackerId: string) => void,
  onViewProgress: (tracker: WebAppLoanTracker) => void,
  onRecordPayment: (tracker: WebAppLoanTracker) => void
): ColumnDef<WebAppLoanTracker>[] => [
  {
    accessorKey: "name",
    header: "Name",
  },
  {
    accessorKey: "linkedAccountId",
    header: "Account",
    cell: ({ row }) => {
        const accountId = row.original.linkedAccountId;
        if (!accountId) return <span className="text-muted-foreground">N/A</span>;
        const account = accountsMap.get(accountId);
        return account ? account.name : "Unknown Account";
    }
  },
  {
    accessorKey: "completionPercentage",
    header: "Progress",
    cell: ({ row }) => {
        const tracker = row.original;
        const progress = tracker.completionPercentage || 0;
        return (
            <div className="flex flex-col w-[150px]">
                <span className="text-xs">{progress}% paid</span>
                <Progress value={progress} className="h-2 mt-1" />
            </div>
        )
    }
  },
  {
    accessorKey: "remainingBalance",
    header: "Remaining Balance",
    cell: ({ row }) => formatCurrency(row.original.remainingBalance),
  },
    {
    accessorKey: "emiAmount",
    header: "EMI",
    cell: ({ row }) => formatCurrency(row.original.emiAmount),
  },
  {
    accessorKey: "nextDueDate",
    header: "Next Due Date",
    cell: ({ row }) => formatDate(row.original.nextDueDate),
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const tracker = row.original

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
            <DropdownMenuItem onClick={() => onEdit(tracker)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onViewProgress(tracker)}>
              View Progress
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onRecordPayment(tracker)}>Record Payment</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => onDelete(tracker.trackerId)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
] 