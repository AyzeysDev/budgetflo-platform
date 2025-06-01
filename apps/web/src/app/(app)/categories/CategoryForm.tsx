"use client";

import React, { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";    
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { CategoryDTO, CreateCategoryPayload, UpdateCategoryPayload } from '@/../../api/src/models/budget.model'; 
import { Loader2 } from 'lucide-react';
import { availableIcons, IconRenderer, colorPalette } from './categoryUtils';
import { cn } from '@/lib/utils';

const categoryFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be 100 characters or less"),
  type: z.enum(['income', 'expense'], { required_error: "Type is required" }),
  icon: z.string().optional().nullable().transform(val => val === "" ? null : val),
  color: z.string()
    .regex(/^#([0-9A-Fa-f]{3,4}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/, "Invalid hex color (e.g., #RRGGBB)")
    .optional()
    .nullable()
    .transform(val => val === "" ? null : val),
});

type CategoryFormData = z.infer<typeof categoryFormSchema>;

interface CategoryFormProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  categoryToEdit: CategoryDTO | null; // Removed optional since it's always passed
  onSaveSuccess: (category: CategoryDTO) => void;
}

// Type for API error structure
interface ApiError {
  msg: string;
  param?: string;
}

export default function CategoryForm({
  isOpen,
  onOpenChange,
  categoryToEdit,
  onSaveSuccess,
}: CategoryFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    control, 
    setValue,
    watch,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<CategoryFormData>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      name: '',
      type: 'expense', 
      icon: null,
      color: null,
    },
  });

  const watchedColor = watch("color");
  const watchedIcon = watch("icon");

  // Enhanced form reset with better management
  useEffect(() => {
    if (isOpen) {
      if (categoryToEdit) {
        reset({
          name: categoryToEdit.name,
          type: categoryToEdit.type,
          icon: categoryToEdit.icon || null,
          color: categoryToEdit.color || null,
        });
      } else {
        reset({ 
          name: '',
          type: 'expense',
          icon: null,
          color: null,
        });
      }
    }
  }, [categoryToEdit, isOpen, reset]);

  // Enhanced dialog close handler with form reset
  const handleOpenChange = (open: boolean) => {
    if (!open && !isSubmitting) {
      reset(); // Reset form when closing if not submitting
    }
    onOpenChange(open);
  };

  const onSubmit = async (data: CategoryFormData) => {
    const apiPayload: Omit<CreateCategoryPayload, 'userId'> | UpdateCategoryPayload = {
      name: data.name,
      type: data.type,
      icon: data.icon,
      color: data.color,
    };
    
    const urlBase = `/api/categories`; 
    const url = categoryToEdit ? `${urlBase}/${categoryToEdit.id}` : urlBase;
    const method = categoryToEdit ? 'PUT' : 'POST';

    const toastId = "category-form-toast";
    toast.loading(categoryToEdit ? "Updating category..." : "Creating category...", { id: toastId });

    try {
      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiPayload),
      });

      const result = await response.json();
      toast.dismiss(toastId);

      if (!response.ok) {
        // FIX 2: Proper typing for API errors instead of 'any'
        const errorMessage = result.error || 
          (Array.isArray(result.errors) ? 
            result.errors.map((e: ApiError) => e.msg).join(', ') : 
            "Failed to save category.");
        throw new Error(errorMessage);
      }
      
      toast.success(`Category "${result.data.name}" ${categoryToEdit ? 'updated' : 'created'} successfully!`);
      onSaveSuccess(result.data as CategoryDTO);
      handleOpenChange(false);
    } catch (error) {
      toast.dismiss(toastId);
      toast.error((error as Error).message);
      console.error("Category form error:", error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{categoryToEdit ? 'Edit Category' : 'Add New Category'}</DialogTitle>
          <DialogDescription>
            {categoryToEdit ? `Update the details for "${categoryToEdit.name}".` : 'Create a new category for your transactions and budgets.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 py-2">
          {/* Category Name */}
          <div>
            <Label htmlFor="name">Category Name</Label>
            <Input 
              id="name" 
              {...register('name')} 
              placeholder="e.g., Groceries, Salary"
              disabled={isSubmitting}
            />
            {errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}
          </div>

          {/* Category Type */}
          <div>
            <Label htmlFor="type">Type</Label>
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <Select 
                  onValueChange={field.onChange} 
                  value={field.value}
                  disabled={isSubmitting}
                >
                  <SelectTrigger id="type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="expense">Expense</SelectItem>
                    <SelectItem value="income">Income</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {errors.type && <p className="text-sm text-destructive mt-1">{errors.type.message}</p>}
          </div>
          
          {/* Icon Picker */}
          <div>
            <Label>Icon (Optional)</Label>
            <ScrollArea className="h-32 rounded-md border p-2">
              <div className="grid grid-cols-6 sm:grid-cols-8 gap-2">
                {availableIcons.map((iconName) => (
                  <Button
                    key={iconName}
                    type="button"
                    variant="outline"
                    size="icon"
                    disabled={isSubmitting}
                    className={cn(
                      "p-2 h-10 w-10",
                      watchedIcon === iconName && "ring-2 ring-primary ring-offset-2"
                    )}
                    onClick={() => {
                      const newIcon = watchedIcon === iconName ? null : iconName;
                      setValue('icon', newIcon, { shouldDirty: true });
                    }}
                    title={iconName}
                  >
                    <IconRenderer name={iconName} className="h-5 w-5" />
                  </Button>
                ))}
              </div>
            </ScrollArea>
            {errors.icon && <p className="text-sm text-destructive mt-1">{errors.icon.message}</p>}
          </div>

          {/* Enhanced Color Picker */}
          <div>
            <Label htmlFor="color-input">Color (Optional)</Label>
            <div className="flex items-center gap-2 mb-2">
              <Controller
                name="color"
                control={control}
                render={({ field }) => (
                  <input 
                    id="color-picker-native" 
                    type="color" 
                    value={field.value || "#000000"}
                    onChange={(e) => field.onChange(e.target.value)}
                    disabled={isSubmitting}
                    className="w-10 h-10 p-0 border border-border rounded cursor-pointer bg-background disabled:cursor-not-allowed disabled:opacity-50"
                  />
                )}
              />
              <Input 
                id="color-input"
                {...register('color')} 
                placeholder="#RRGGBB"
                className="flex-1"
                disabled={isSubmitting}
              />
            </div>
            
            {/* Color Palette */}
            <div className="flex flex-wrap gap-1.5">
              {colorPalette.map((color) => (
                <button
                  type="button"
                  key={color}
                  disabled={isSubmitting}
                  className={cn(
                    "w-6 h-6 rounded-full border-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50",
                    watchedColor === color ? "ring-2 ring-primary ring-offset-2 border-primary" : "border-transparent hover:border-muted-foreground"
                  )}
                  style={{ backgroundColor: color }}
                  onClick={() => setValue('color', color, { shouldDirty: true })}
                  title={color}
                />
              ))}
            </div>
            {errors.color && <p className="text-sm text-destructive mt-1">{errors.color.message}</p>}
          </div>

          <DialogFooter className="pt-6">
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isSubmitting}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isSubmitting || !isDirty}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {categoryToEdit ? 'Save Changes' : 'Create Category'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}