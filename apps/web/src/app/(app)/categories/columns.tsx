// apps/web/src/app/(app)/categories/columns.tsx
"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, CheckCircle2, XCircle, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { CategoryDTO } from '@/../../api/src/models/budget.model';
import { IconRenderer, AvailableIconName, getContrastingTextColor } from './categoryUtils';

export const columns = (
  onEdit: (category: CategoryDTO) => void,
  onDelete: (category: CategoryDTO) => void
): ColumnDef<CategoryDTO>[] => [
  {
    accessorKey: "name",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Name
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const category = row.original;
      return (
        <div className="flex items-center gap-3">
          <div
            className="w-7 h-7 rounded-md flex items-center justify-center shadow-sm shrink-0"
            style={{ backgroundColor: category.color || '#6B7280' }}
          >
            <IconRenderer
              name={category.icon as AvailableIconName}
              className="w-4 h-4"
              style={{ color: getContrastingTextColor(category.color) }}
            />
          </div>
          <span className="font-medium">{category.name}</span>
        </div>
      );
    },
  },
  {
    accessorKey: "type",
    header: "Type",
    cell: ({ row }) => {
      const type = row.original.type;
      return (
        <Badge variant={type === 'income' ? 'default' : 'destructive'} className="capitalize">
          {type}
        </Badge>
      );
    },
  },
  {
    accessorKey: "includeInBudget",
    header: "In Budgets",
    cell: ({ row }) => {
      const isIncluded = row.original.includeInBudget;
      return isIncluded ? (
        <CheckCircle2 className="h-5 w-5 text-green-500" />
      ) : (
        <XCircle className="h-5 w-5 text-muted-foreground" />
      );
    },
  },
  {
    id: "edit",
    cell: ({ row }) => {
        const category = row.original;
        return (
             <Button 
                variant="ghost" 
                size="sm"
                onClick={() => onEdit(category)} 
                disabled={category.isSystemCategory}
                className="h-8 w-8 p-0 hover:bg-primary/10"
                title="Edit category"
              >
                <Edit className="w-4 h-4" />
                <span className="sr-only">Edit</span>
            </Button>
        )
    }
  },
  {
    id: "delete",
    cell: ({ row }) => {
        const category = row.original;
        return (
             <Button 
                variant="ghost" 
                size="sm"
                onClick={() => onDelete(category)} 
                disabled={category.isSystemCategory}
                className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                title="Delete category"
              >
                <Trash2 className="w-4 h-4" />
                 <span className="sr-only">Delete</span>
            </Button>
        )
    }
  },
];
