"use client"

import { ColumnDef } from "@tanstack/react-table"
import { MoreHorizontal } from "lucide-react"
import { WebAppSavingsTracker } from "@/types/tracker"
import { WebAppAccount } from "@/types/account"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"

const formatCurrency = (value: number | null | undefined): string => {
  if (value === null || typeof value === 'undefined') {
    return '$0.00';
  }
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
};

export const getSavingsColumns = (
  accountsMap: Map<string, WebAppAccount>,
  onEdit: (tracker: WebAppSavingsTracker) => void,
  onDelete: (trackerId: string) => void,
  onViewProgress: (tracker: WebAppSavingsTracker) => void,
): ColumnDef<WebAppSavingsTracker>[] => [
  {
    accessorKey: "name",
    header: "Name",
  },
  {
    header: "Linked Account",
    accessorFn: (row) => accountsMap.get(row.linkedAccountId)?.name || "N/A",
  },
  {
    header: "Progress",
    cell: ({ row }) => {
      const tracker = row.original;
      const current = tracker.currentBalance || 0;
      const target = tracker.overallTarget;

      if (target === null || typeof target === 'undefined' || target === 0) {
        return <span className="text-muted-foreground">{formatCurrency(current)} / No Target</span>;
      }
      
      const progress = (current / target) * 100;
      return (
        <div className="flex flex-col gap-2">
           <span className="text-sm font-medium">
            {formatCurrency(current)} / {formatCurrency(target)}
          </span>
          <Progress value={progress} className="w-[150px]" />
        </div>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const tracker = row.original;
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
            <DropdownMenuItem onClick={() => onEdit(tracker)}>Edit</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onViewProgress(tracker)}>View Progress</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={() => onDelete(tracker.trackerId)}>Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
] 