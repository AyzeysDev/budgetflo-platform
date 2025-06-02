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
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import type { CategoryDTO, CreateCategoryPayload, UpdateCategoryPayload } from '@/../../api/src/models/budget.model';
import { Loader2, Palette, X, Sparkles, Check, TrendingUp, TrendingDown } from 'lucide-react';
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
  iconColorPalette // Changed from colorPalette to iconColorPalette if that's the intended name
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
      <DialogContent className="sm:max-w-2xl w-[95vw] max-h-[95vh] p-0 gap-0 bg-gradient-to-br from-background via-background to-muted/30 border-2 border-border/50 shadow-2xl rounded-3xl overflow-hidden">
        {/* Ultra Modern Header with Gradient */}
        <div className="relative overflow-hidden bg-gradient-to-r from-primary/10 via-primary/5 to-accent/10 border-b border-border/30">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-60" />
          <div className="relative px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div>
                  <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
                    {categoryToEdit ? 'Edit Category' : 'Create Category'}
                  </DialogTitle>
                  <DialogDescription className="text-muted-foreground/80 mt-1">
                    {categoryToEdit ? 'Update your category details' : 'Design your perfect category'}
                  </DialogDescription>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => handleOpenChange(false)}
                className="rounded-full hover:bg-destructive/10 hover:text-destructive transition-all duration-200"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1 max-h-[calc(95vh-200px)]">
          {/* Assign an id to the form for the submit button outside the form */}
          <form id="category-inner-form" onSubmit={handleSubmit(onSubmit)} className="p-8 space-y-8">
            {/* Category Name */}
            <div className="space-y-3">
              <Label htmlFor="name" className="text-base font-semibold flex items-center gap-2">
                Category Name
                <Badge variant="secondary" className="text-xs">Required</Badge>
              </Label>
              <Input
                id="name"
                {...register('name')}
                placeholder="e.g., Monthly Groceries, Freelance Income"
                disabled={isSubmitting}
                className="h-12 text-base border-2 border-border/50 focus:border-primary/50 rounded-xl transition-all duration-200 bg-background/50"
              />
              {errors.name && (
                // Changed <p> to <div> to fix hydration error
                <div className="text-sm text-destructive flex items-center gap-2 mt-2">
                  <div className="w-1 h-1 rounded-full bg-destructive" />
                  {errors.name.message}
                </div>
              )}
            </div>

            {/* Category Type */}
            <div className="space-y-4">
              <Label className="text-base font-semibold">Category Type</Label>
              <Controller
                name="type"
                control={control}
                render={({ field }) => (
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => {
                        field.onChange('expense');
                        trigger(['icon', 'color']);
                      }}
                      disabled={isSubmitting}
                      className={cn(
                        "relative p-6 rounded-2xl border-2 transition-all duration-300 group",
                        field.value === 'expense' 
                          ? "border-red-500/50 bg-red-50 dark:bg-red-950/30 shadow-lg shadow-red-500/20" 
                          : "border-border/30 bg-background/50 hover:border-red-300 hover:bg-red-50/50 dark:hover:bg-red-950/20"
                      )}
                    >
                      <div className="flex flex-col items-center gap-3">
                        <div className={cn(
                          "w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300",
                          field.value === 'expense' 
                            ? "bg-red-500 text-white shadow-lg" 
                            : "bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 group-hover:bg-red-200 dark:group-hover:bg-red-900/70"
                        )}>
                          <TrendingDown className="w-6 h-6" />
                        </div>
                        <div className="text-center">
                          <p className="font-semibold text-sm">Expense</p>
                          <p className="text-xs text-muted-foreground">Money going out</p>
                        </div>
                        {field.value === 'expense' && (
                          <div className="absolute top-3 right-3">
                            <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center">
                              <Check className="w-4 h-4 text-white" />
                            </div>
                          </div>
                        )}
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        field.onChange('income');
                        trigger(['icon', 'color']);
                      }}
                      disabled={isSubmitting}
                      className={cn(
                        "relative p-6 rounded-2xl border-2 transition-all duration-300 group",
                        field.value === 'income' 
                          ? "border-green-500/50 bg-green-50 dark:bg-green-950/30 shadow-lg shadow-green-500/20" 
                          : "border-border/30 bg-background/50 hover:border-green-300 hover:bg-green-50/50 dark:hover:bg-green-950/20"
                      )}
                    >
                      <div className="flex flex-col items-center gap-3">
                        <div className={cn(
                          "w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300",
                          field.value === 'income' 
                            ? "bg-green-500 text-white shadow-lg" 
                            : "bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400 group-hover:bg-green-200 dark:group-hover:bg-green-900/70"
                        )}>
                          <TrendingUp className="w-6 h-6" />
                        </div>
                        <div className="text-center">
                          <p className="font-semibold text-sm">Income</p>
                          <p className="text-xs text-muted-foreground">Money coming in</p>
                        </div>
                        {field.value === 'income' && (
                          <div className="absolute top-3 right-3">
                            <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                              <Check className="w-4 h-4 text-white" />
                            </div>
                          </div>
                        )}
                      </div>
                    </button>
                  </div>
                )}
              />
              {errors.type && (
                // Changed <p> to <div> to fix hydration error
                <div className="text-sm text-destructive flex items-center gap-2">
                  <div className="w-1 h-1 rounded-full bg-destructive" />
                  {errors.type.message}
                </div>
              )}
            </div>

            {/* Preview Card */}
            <div className="relative">
              <Label className="text-base font-semibold mb-4 block">Preview</Label>
              <div className="relative p-6 rounded-2xl border-2 border-dashed border-border/50 bg-gradient-to-br from-muted/30 to-muted/10">
                <div className="absolute top-4 right-4">
                  <Badge variant="outline" className="text-xs">Live Preview</Badge>
                </div>
                <div 
                  className="w-20 h-20 rounded-2xl flex items-center justify-center shadow-lg mx-auto mb-4"
                  style={{ backgroundColor: previewColor }}
                >
                  <IconRenderer 
                    name={selectedIconPreview} 
                    size={32} 
                    color={getContrastingTextColor(previewColor)} 
                  />
                </div>
                <div className="text-center">
                  <p className="font-semibold text-lg" style={{ color: previewColor }}>
                    {watch('name') || 'Category Name'}
                  </p>
                  <Badge 
                    variant={watchedType === 'income' ? 'default' : 'secondary'}
                    className="mt-2"
                  >
                    {watchedType === 'income' ? 'Income' : 'Expense'}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Color Palette */}
            <div className="space-y-4">
              <Label className="text-base font-semibold flex items-center gap-2">
                <Palette className="w-5 h-5" />
                Choose Color
              </Label>
              <div className="grid grid-cols-8 gap-3">
                {iconColorPalette.map((color: string) => ( // Ensure iconColorPalette is the correct name from your utils
                  <button
                    type="button"
                    key={color}
                    disabled={isSubmitting}
                    className={cn(
                      "relative w-12 h-12 rounded-xl border-2 transition-all duration-200 hover:scale-110 hover:shadow-lg",
                      watchedColor === color 
                        ? "border-foreground shadow-lg scale-110" 
                        : "border-border/30 hover:border-border"
                    )}
                    style={{ backgroundColor: color }}
                    onClick={() => setValue('color', color, { shouldDirty: true })}
                  >
                    {watchedColor === color && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Check className="w-5 h-5" color={getContrastingTextColor(color)} />
                      </div>
                    )}
                  </button>
                ))}
              </div>
               {errors.color && (
                // Changed <p> to <div> to fix hydration error
                <div className="text-sm text-destructive flex items-center gap-2 mt-2">
                  <div className="w-1 h-1 rounded-full bg-destructive" />
                  {errors.color.message}
                </div>
              )}
            </div>

            {/* Icon Grid */}
            <div className="space-y-4">
              <Label className="text-base font-semibold">Choose Icon</Label>
              <ScrollArea className="h-48 rounded-2xl border-2 border-border/30 p-4 bg-muted/20">
                <div className="grid grid-cols-8 md:grid-cols-10 gap-2">
                  {availableIcons.map((iconName) => (
                    <button
                      key={iconName}
                      type="button"
                      disabled={isSubmitting}
                      className={cn(
                        "relative w-12 h-12 rounded-xl border-2 transition-all duration-200 hover:scale-105 flex items-center justify-center",
                        watchedIcon === iconName 
                          ? "border-primary bg-primary/10 shadow-lg scale-105" 
                          : "border-border/30 bg-background/50 hover:border-primary/50 hover:bg-primary/5"
                      )}
                      onClick={() => setValue('icon', iconName, { shouldDirty: true, shouldValidate: true })}
                      title={iconName}
                    >
                      <IconRenderer 
                        name={iconName} 
                        size={20} 
                        color={watchedIcon === iconName ? previewColor : "currentColor"} 
                      />
                      {watchedIcon === iconName && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </ScrollArea>
              {errors.icon && (
                // Changed <p> to <div> to fix hydration error
                <div className="text-sm text-destructive flex items-center gap-2 mt-2">
                  <div className="w-1 h-1 rounded-full bg-destructive" />
                  {errors.icon.message}
                </div>
              )}
            </div>
          </form>
        </ScrollArea>

        {/* Ultra Modern Footer */}
        <div className="border-t border-border/30 bg-gradient-to-r from-background to-muted/30 p-6">
          <div className="flex items-center justify-end gap-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
              className="h-12 px-8 rounded-xl border-2 hover:bg-muted/50"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              form="category-inner-form" // Links to the form by its id
              disabled={isSubmitting || !isDirty || !formIsValid}
              // onClick={handleSubmit(onSubmit)} // Not needed here if type="submit" and form="id" are used
              className="h-12 px-8 rounded-xl bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80 shadow-lg hover:shadow-xl transition-all duration-200"
            >
              {isSubmitting && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
              {categoryToEdit ? 'Save Changes' : 'Create Category'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}