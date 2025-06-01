// apps/web/src/app/(app)/categories/CategoryClientPage.tsx
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { PlusCircle, Tags, Edit3, Trash2, AlertTriangleIcon, ListFilter, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import type { CategoryDTO } from '@/../../api/src/models/budget.model';
import CategoryForm from './CategoryForm';
import { IconRenderer, AvailableIconName } from './categoryUtils';
import { cn } from '@/lib/utils';

interface CategoryClientPageProps {
  initialCategories: CategoryDTO[];
}

type CategoryTypeFilter = "all" | "income" | "expense";

export default function CategoryClientPage({ initialCategories }: CategoryClientPageProps) {
  const [categories, setCategories] = useState<CategoryDTO[]>(initialCategories);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryDTO | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<CategoryDTO | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<CategoryTypeFilter>("all");

  const sortCategories = (cats: CategoryDTO[]) => {
    return [...cats].sort((a, b) => {
      if (a.isSystemCategory && !b.isSystemCategory) return -1;
      if (!a.isSystemCategory && b.isSystemCategory) return 1;
      return a.name.localeCompare(b.name);
    });
  };
  
  useEffect(() => {
    setCategories(sortCategories(initialCategories));
  }, [initialCategories]);

  const handleAddCategory = () => {
    setEditingCategory(null);
    setIsFormModalOpen(true);
  };

  const handleEditCategory = (category: CategoryDTO) => {
    setEditingCategory(category);
    setIsFormModalOpen(true);
  };

  const confirmDeleteCategory = (category: CategoryDTO) => {
    setCategoryToDelete(category);
  };

  const handleDeleteCategory = async () => {
    if (!categoryToDelete) return;

    const toastId = `delete-${categoryToDelete.id}`;
    toast.loading(`Deleting category: ${categoryToDelete.name}...`, { id: toastId });
    try {
      const response = await fetch(`/api/categories/${categoryToDelete.id}`, { method: 'DELETE' });
      if (!response.ok && response.status !== 204) { // 204 No Content is a success for DELETE
        const errorData = await response.json().catch(() => ({ error: "Failed to delete category" }));
        throw new Error(errorData.error || "Operation failed");
      }
      toast.success(`Category "${categoryToDelete.name}" deleted.`, { id: toastId });
      setCategories(prev => sortCategories(prev.filter(cat => cat.id !== categoryToDelete.id)));
    } catch (error) {
      toast.error((error as Error).message, { id: toastId });
    } finally {
      setCategoryToDelete(null); // Close confirmation dialog
    }
  };

  const onFormSaveSuccess = useCallback((savedCategory: CategoryDTO) => {
    setCategories(prev => {
      const isEditing = prev.some(cat => cat.id === savedCategory.id);
      if (isEditing) {
        return sortCategories(prev.map(cat => cat.id === savedCategory.id ? savedCategory : cat));
      }
      return sortCategories([...prev, savedCategory]);
    });
    setIsFormModalOpen(false);
    setEditingCategory(null);
  }, []);

  const filteredCategories = categories.filter(category => {
    const matchesSearchTerm = category.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === "all" || category.type === typeFilter;
    return matchesSearchTerm && matchesType;
  });

  return (
    <>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 md:mb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight flex items-center">
            <Tags className="mr-3 h-8 w-8 text-primary" /> Manage Categories
          </h1>
          <p className="text-md text-muted-foreground mt-1">
            Organize your income and expenses with custom categories.
          </p>
        </div>
        <Button onClick={handleAddCategory} size="lg" className="w-full sm:w-auto">
          <PlusCircle className="mr-2 h-5 w-5" /> Add New Category
        </Button>
      </div>

      <Card>
        <CardHeader className="border-b">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div>
              <CardTitle>Your Categories</CardTitle>
              <CardDescription>
                {`Displaying ${filteredCategories.length} of ${categories.length} categor${categories.length === 1 ? 'y' : 'ies'}.`}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-grow sm:flex-grow-0">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search categories..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 w-full sm:w-[200px] lg:w-[250px]"
                />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <ListFilter className="mr-2 h-4 w-4" />
                    Filter
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Filter by type</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuCheckboxItem
                    checked={typeFilter === "all"}
                    onCheckedChange={() => setTypeFilter("all")}
                  >
                    All Types
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={typeFilter === "income"}
                    onCheckedChange={() => setTypeFilter("income")}
                  >
                    Income
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={typeFilter === "expense"}
                    onCheckedChange={() => setTypeFilter("expense")}
                  >
                    Expense
                  </DropdownMenuCheckboxItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredCategories.length === 0 && (
            <div className="text-center py-12 px-6">
              <Tags className="mx-auto h-16 w-16 text-muted-foreground/50" />
              <h3 className="mt-6 text-xl font-semibold">No categories found</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {searchTerm || typeFilter !== "all" 
                  ? "Try adjusting your search or filters." 
                  : "Get started by adding your first category."}
              </p>
              {!searchTerm && typeFilter === "all" && (
                 <Button onClick={handleAddCategory} className="mt-6">
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Category
                </Button>
              )}
            </div>
          )}
          {filteredCategories.length > 0 && (
            <ul className="divide-y divide-border">
              {filteredCategories.map((category) => (
                <li
                  key={category.id}
                  className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" /> */}
                    <div 
                      className={cn(
                        "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
                        category.isSystemCategory ? "bg-muted" : "bg-card" // No background color for icon container itself
                      )}
                    >
                      <IconRenderer
                        name={category.icon as AvailableIconName | null}
                        size={20}
                        color={category.color || (category.type === 'income' ? 'var(--color-chart-2)' : 'var(--color-chart-1)')} // Apply category color or default
                        className="opacity-90"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate" title={category.name}>
                        {category.name}
                      </p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {category.type}
                        {category.isSystemCategory && (
                          <span className="ml-2 text-xs font-medium text-sky-600 dark:text-sky-400">(System)</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      onClick={() => handleEditCategory(category)}
                      title="Edit category"
                      disabled={category.isSystemCategory}
                    >
                      <Edit3 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                      onClick={() => confirmDeleteCategory(category)}
                      title="Delete category"
                      disabled={category.isSystemCategory}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {isFormModalOpen && (
        <CategoryForm
          isOpen={isFormModalOpen}
          onOpenChange={setIsFormModalOpen}
          categoryToEdit={editingCategory}
          onSaveSuccess={onFormSaveSuccess}
        />
      )}

      {categoryToDelete && (
        <Dialog open={!!categoryToDelete} onOpenChange={() => setCategoryToDelete(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <AlertTriangleIcon className="h-6 w-6 mr-2 text-destructive" /> Confirm Deletion
              </DialogTitle>
              <DialogDescription className="pt-2">
                Are you sure you want to delete the category &quot;<strong>{categoryToDelete.name}</strong>&quot;?
                This action cannot be undone, and it might affect existing transactions or budgets linked to it.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0 pt-4">
              <Button variant="outline" onClick={() => setCategoryToDelete(null)}>Cancel</Button>
              <Button variant="destructive" onClick={handleDeleteCategory}>Delete Category</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
