"use client";

import React, { useEffect, useMemo } from 'react';
import { useForm, Controller, SubmitHandler } from 'react-hook-form';
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
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import type { CategoryDTO, CreateCategoryPayload, UpdateCategoryPayload } from '@/../../api/src/models/budget.model';
import { Loader2, Palette, Check, TrendingUp, TrendingDown } from 'lucide-react';
import {
  availableIcons,
  IconRenderer,
  AvailableIconName,
  isValidIconName,
  getContrastingTextColor,
  DEFAULT_EXPENSE_ICON,
  DEFAULT_EXPENSE_COLOR,
  DEFAULT_INCOME_ICON,
  DEFAULT_INCOME_COLOR,
  FALLBACK_ICON,
  iconColorPalette
} from './categoryUtils';
import { cn } from '@/lib/utils';

const categoryFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be 100 characters or less"),
  type: z.enum(['income', 'expense'], { required_error: "Type is required" }),
  icon: z.string().optional().nullable().transform(val => (val === "" ? null : val)),
  color: z.string()
    .nullable()
    .optional()
    .nullable()
    .transform(val => (val === "" ? null : val))
    .refine(val => {
        if (val === null) return true;
        return /^#([0-9A-Fa-f]{3,4}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/.test(val as string);
      }, {
      message: "Invalid hex color (e.g., #RRGGBB)",
    }),
});

type CategoryFormData = z.infer<typeof categoryFormSchema>;

interface CategoryFormProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  categoryToEdit: CategoryDTO | null;
  onSaveSuccess: (category: CategoryDTO) => void;
}

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
    formState: { errors, isSubmitting, isDirty, isValid: formIsValid },
    trigger, 
  } = useForm<CategoryFormData>({
    resolver: zodResolver(categoryFormSchema),
    mode: 'onChange', 
    defaultValues: { 
      name: '',
      type: 'expense',
      icon: DEFAULT_EXPENSE_ICON,
      color: DEFAULT_EXPENSE_COLOR,
    },
  });

  const watchedType = watch("type");
  const watchedIcon = watch("icon");
  const watchedColor = watch("color");

  useEffect(() => {
    if (isOpen) {
      if (categoryToEdit) {
        reset({
          name: categoryToEdit.name,
          type: categoryToEdit.type,
          icon: isValidIconName(categoryToEdit.icon) ? categoryToEdit.icon : (categoryToEdit.type === 'income' ? DEFAULT_INCOME_ICON : DEFAULT_EXPENSE_ICON),
          color: categoryToEdit.color || (categoryToEdit.type === 'income' ? DEFAULT_INCOME_COLOR : DEFAULT_EXPENSE_COLOR),
        });
      } else {
        reset({
          name: '',
          type: 'expense',
          icon: DEFAULT_EXPENSE_ICON,
          color: DEFAULT_EXPENSE_COLOR,
        });
      }
    }
  }, [categoryToEdit, isOpen, reset]);

  useEffect(() => {
    if (!isOpen) return; 
    const isNewCategory = !categoryToEdit;
    
    if (watchedType === 'income') {
      setValue('icon', DEFAULT_INCOME_ICON, { shouldDirty: isNewCategory, shouldValidate: true });
      setValue('color', DEFAULT_INCOME_COLOR, { shouldDirty: isNewCategory, shouldValidate: true });
    } else if (watchedType === 'expense') {
      setValue('icon', DEFAULT_EXPENSE_ICON, { shouldDirty: isNewCategory, shouldValidate: true });
      setValue('color', DEFAULT_EXPENSE_COLOR, { shouldDirty: isNewCategory, shouldValidate: true });
    }
    if(isNewCategory) {
        trigger(['icon', 'color']);
    }
  }, [watchedType, categoryToEdit, setValue, isOpen, trigger]);

  const handleOpenChange = (open: boolean) => {
    if (!open && !isSubmitting) {
      if (categoryToEdit) {
         reset({
          name: categoryToEdit.name,
          type: categoryToEdit.type,
          icon: isValidIconName(categoryToEdit.icon) ? categoryToEdit.icon : (categoryToEdit.type === 'income' ? DEFAULT_INCOME_ICON : DEFAULT_EXPENSE_ICON),
          color: categoryToEdit.color || (categoryToEdit.type === 'income' ? DEFAULT_INCOME_COLOR : DEFAULT_EXPENSE_COLOR),
        });
      } else {
        reset({ name: '', type: 'expense', icon: DEFAULT_EXPENSE_ICON, color: DEFAULT_EXPENSE_COLOR });
      }
    }
    onOpenChange(open);
  };

  const onSubmit: SubmitHandler<CategoryFormData> = async (data) => {
    const apiPayload: Omit<CreateCategoryPayload, 'userId'> | UpdateCategoryPayload = {
      name: data.name,
      type: data.type,
      icon: (data.icon as AvailableIconName | null) ?? (data.type === 'income' ? DEFAULT_INCOME_ICON : DEFAULT_EXPENSE_ICON),
      color: data.color ?? (data.type === 'income' ? DEFAULT_INCOME_COLOR : DEFAULT_EXPENSE_COLOR),
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
        const errorMessage = result.error ||
          (Array.isArray(result.errors) ?
            result.errors.map((e: ApiError) => `${e.param ? e.param + ': ' : ''}${e.msg}`).join(', ') :
            "Failed to save category.");
        throw new Error(errorMessage);
      }

      toast.success(`Category "${result.data.name}" ${categoryToEdit ? 'updated' : 'created'} successfully!`);
      onSaveSuccess(result.data as CategoryDTO);
      onOpenChange(false); 
    } catch (error) {
      toast.dismiss(toastId);
      toast.error((error as Error).message || "An unknown error occurred.");
      console.error("Category form error:", error);
    }
  };

  const selectedIconPreview = useMemo(() => {
    return isValidIconName(watchedIcon) ? watchedIcon : FALLBACK_ICON;
  }, [watchedIcon]);

  const previewColor = watchedColor ?? (watchedType === 'income' ? DEFAULT_INCOME_COLOR : DEFAULT_EXPENSE_COLOR);

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg w-[95vw] max-h-[85vh] p-0 gap-0 bg-background border border-border shadow-xl rounded-2xl overflow-hidden">
        {/* Clean Header */}
        <DialogHeader className="px-6 py-4 border-b border-border">
          <div>
            <DialogTitle className="text-xl font-semibold text-foreground">
              {categoryToEdit ? 'Edit Category' : 'Create Category'}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground mt-1">
              {categoryToEdit ? 'Update your category details' : 'Design your perfect category'}
            </DialogDescription>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 max-h-[calc(85vh-160px)]">
          <form id="category-form" onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
            {/* Category Name */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium text-foreground">
                Category Name
              </Label>
              <Input
                id="name"
                {...register('name')}
                placeholder="e.g., Groceries, Salary"
                disabled={isSubmitting}
                className="h-10 border border-border rounded-lg focus:border-primary focus:ring-1 focus:ring-primary"
              />
              {errors.name && (
                <div className="text-xs text-destructive flex items-center gap-1">
                  <div className="w-1 h-1 rounded-full bg-destructive" />
                  {errors.name.message}
                </div>
              )}
            </div>

            {/* Category Type */}
            <div className="space-y-3">
              <Label className="text-sm font-medium text-foreground">Category Type</Label>
              <Controller
                name="type"
                control={control}
                render={({ field }) => (
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        field.onChange('expense');
                        trigger(['icon', 'color']);
                      }}
                      disabled={isSubmitting}
                      className={cn(
                        "p-4 rounded-xl border transition-all duration-200 text-center",
                        field.value === 'expense' 
                          ? "border-red-300 bg-red-50 dark:bg-red-950/30 dark:border-red-800" 
                          : "border-border hover:border-red-300 hover:bg-red-50/50 dark:hover:bg-red-950/20"
                      )}
                    >
                      <div className={cn(
                        "w-8 h-8 rounded-lg mx-auto mb-2 flex items-center justify-center",
                        field.value === 'expense' 
                          ? "bg-red-500 text-white" 
                          : "bg-muted text-red-600 dark:text-red-400"
                      )}>
                        <TrendingDown className="w-4 h-4" />
                      </div>
                      <div className="text-sm font-medium text-foreground">Expense</div>
                      <div className="text-xs text-muted-foreground">Money going out</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        field.onChange('income');
                        trigger(['icon', 'color']);
                      }}
                      disabled={isSubmitting}
                      className={cn(
                        "p-4 rounded-xl border transition-all duration-200 text-center",
                        field.value === 'income' 
                          ? "border-green-300 bg-green-50 dark:bg-green-950/30 dark:border-green-800" 
                          : "border-border hover:border-green-300 hover:bg-green-50/50 dark:hover:bg-green-950/20"
                      )}
                    >
                      <div className={cn(
                        "w-8 h-8 rounded-lg mx-auto mb-2 flex items-center justify-center",
                        field.value === 'income' 
                          ? "bg-green-500 text-white" 
                          : "bg-muted text-green-600 dark:text-green-400"
                      )}>
                        <TrendingUp className="w-4 h-4" />
                      </div>
                      <div className="text-sm font-medium text-foreground">Income</div>
                      <div className="text-xs text-muted-foreground">Money coming in</div>
                    </button>
                  </div>
                )}
              />
              {errors.type && (
                <div className="text-xs text-destructive flex items-center gap-1">
                  <div className="w-1 h-1 rounded-full bg-destructive" />
                  {errors.type.message}
                </div>
              )}
            </div>

            {/* Preview */}
            <div className="space-y-3">
              <Label className="text-sm font-medium text-foreground">Preview</Label>
              <div className="p-4 rounded-xl border border-border bg-muted/30">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: previewColor }}
                  >
                    <IconRenderer 
                      name={selectedIconPreview} 
                      size={20} 
                      color={getContrastingTextColor(previewColor)} 
                    />
                  </div>
                  <div>
                    <div className="font-medium text-sm text-foreground" style={{ color: previewColor }}>
                      {watch('name') || 'Category Name'}
                    </div>
                    <Badge 
                      variant={watchedType === 'income' ? 'default' : 'destructive'}
                      className="text-xs mt-1"
                    >
                      {watchedType === 'income' ? 'Income' : 'Expense'}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* Color Palette */}
            <div className="space-y-3">
              <Label className="text-sm font-medium text-foreground flex items-center gap-2">
                <Palette className="w-4 h-4" />
                Choose Color
              </Label>
              <div className="grid grid-cols-8 gap-2">
                {iconColorPalette.map((color: string) => (
                  <button
                    type="button"
                    key={color}
                    disabled={isSubmitting}
                    className={cn(
                      "relative w-8 h-8 rounded-lg border transition-all duration-200 hover:scale-110",
                      watchedColor === color 
                        ? "border-foreground scale-110" 
                        : "border-border"
                    )}
                    style={{ backgroundColor: color }}
                    onClick={() => setValue('color', color, { shouldDirty: true })}
                  >
                    {watchedColor === color && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Check className="w-4 h-4" color={getContrastingTextColor(color)} />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Icon Grid */}
            <div className="space-y-3">
              <Label className="text-sm font-medium text-foreground">Choose Icon</Label>
              <ScrollArea className="h-32 rounded-lg border border-border p-3">
                <div className="grid grid-cols-8 gap-2">
                  {availableIcons.map((iconName) => (
                    <button
                      key={iconName}
                      type="button"
                      disabled={isSubmitting}
                      className={cn(
                        "w-8 h-8 rounded-lg border transition-all duration-200 hover:scale-105 flex items-center justify-center",
                        watchedIcon === iconName 
                          ? "border-primary bg-primary/10" 
                          : "border-border hover:border-primary/50"
                      )}
                      onClick={() => setValue('icon', iconName, { shouldDirty: true, shouldValidate: true })}
                      title={iconName}
                    >
                      <IconRenderer 
                        name={iconName} 
                        size={16} 
                        color={watchedIcon === iconName ? previewColor : "currentColor"} 
                      />
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </form>
        </ScrollArea>

        {/* Footer - Fixed spacing to prevent overlap */}
        <div className="px-6 py-4 border-t border-border bg-muted/30 mt-auto">
          <div className="flex justify-center gap-3">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
              className="h-10 px-6 text-sm"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              form="category-form"
              disabled={isSubmitting || !isDirty || !formIsValid}
              className="h-10 px-6 text-sm"
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {categoryToEdit ? 'Save Changes' : 'Create Category'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}