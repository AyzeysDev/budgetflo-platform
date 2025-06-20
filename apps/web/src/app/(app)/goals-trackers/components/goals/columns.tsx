"use client"

import { ColumnDef } from "@tanstack/react-table"
import { MoreHorizontal, ArrowUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import type { WebAppGoal } from "@/types/goal"

const formatCurrency = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
const formatDate = (date: string) => new Date(date).toLocaleDateString("en-US", { year: 'numeric', month: 'long', day: 'numeric' });

export const getGoalColumns = (
  onEdit: (goal: WebAppGoal) => void,
  onDelete: (goalId: string) => void,
  onAddContribution: (goal: WebAppGoal) => void
): ColumnDef<WebAppGoal>[] => [
  {
    accessorKey: "name",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => (
        <div className="font-medium">{row.original.name}</div>
    )
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
       const status = row.original.status;
       const variant = status === 'completed' ? 'default' : status === 'overdue' ? 'destructive' : 'outline';
       return <Badge variant={variant} className="capitalize">{status.replace('_', ' ')}</Badge>
    }
  },
  {
    accessorKey: "progress",
    header: "Progress",
    cell: ({ row }) => {
        const goal = row.original;
        const progress = goal.progressPercentage || 0;
        return (
            <div className="flex flex-col w-[150px]">
                <div className="flex justify-between text-xs">
                    <span>{formatCurrency(goal.currentAmount)}</span>
                    <span className="text-muted-foreground">{formatCurrency(goal.targetAmount)}</span>
                </div>
                <Progress value={progress} className="h-2 mt-1" />
                <span className="text-xs text-muted-foreground mt-1">{progress}%</span>
            </div>
        )
    }
  },
  {
    accessorKey: "targetDate",
    header: "Target Date",
    cell: ({ row }) => formatDate(row.original.targetDate),
  },
  {
    accessorKey: "daysRemaining",
    header: "Days Remaining",
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const goal = row.original

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
            <DropdownMenuItem onClick={() => onAddContribution(goal)}>Add Contribution</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEdit(goal)}>Edit</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => onDelete(goal.goalId)}
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
] 