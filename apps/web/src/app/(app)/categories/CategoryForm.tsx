// apps/web/src/app/(app)/categories/CategoryForm.tsx
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
import { Loader2, Palette, AlertCircle } from 'lucide-react';
import {
  availableIcons,
  IconRenderer,
  iconColorPalette,
  AvailableIconName,
  isValidIconName,
  getRandomIcon,
  getRandomColor,
  getContrastingTextColor,
} from './categoryUtils';
import { cn } from '@/lib/utils';

const categoryFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be 100 characters or less"),
  type: z.enum(['income', 'expense'], { required_error: "Type is required" }),
  icon: z.string() // Base type is string
    .optional()    // It can be undefined
    .nullable()    // It can be null
    .transform(val => (val === "" ? null : val)), // Transform "" to null. Output: string | null | undefined
  color: z.string()
    .optional()
    .nullable()
    .transform(val => (val === "" ? null : val)) // Transform "" to null
    .refine(val => {
        if (val === null) return true; // Null is valid (after transform)
        // No need for typeof val !== "string" check here, Zod handles base type.
        return /^#([0-9A-Fa-f]{3,4}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/.test(val as string); // Assert val as string for regex
      }, {
      message: "Invalid hex color (e.g., #RRGGBB)",
    }),
});

// With this schema, CategoryFormData will be:
// {
//   name: string;
//   type: "income" | "expense";
//   icon?: string | null; // string comes from z.string(), ? from .optional(), null from .nullable()/.transform()
//   color?: string | null;
// }
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
  } = useForm<CategoryFormData>({ // CategoryFormData now has icon?: string | null
    resolver: zodResolver(categoryFormSchema),
    mode: 'onChange',
    defaultValues: {
      name: '',
      type: 'expense',
      icon: getRandomIcon(), // This is fine, as getRandomIcon() returns AvailableIconName (a string)
      color: getRandomColor(),
    },
  });

  const watchedIcon = watch("icon"); // Type: string | null | undefined
  const watchedColor = watch("color"); // Type: string | null | undefined

  useEffect(() => {
    if (isOpen) {
      if (categoryToEdit) {
        reset({
          name: categoryToEdit.name,
          type: categoryToEdit.type,
          // categoryToEdit.icon is string | null | undefined.
          // If it's a valid icon name, use it. Otherwise, default.
          icon: isValidIconName(categoryToEdit.icon) ? categoryToEdit.icon : getRandomIcon(),
          color: categoryToEdit.color || getRandomColor(),
        });
      } else {
         reset({
          name: '',
          type: 'expense',
          icon: getRandomIcon(),
          color: getRandomColor(),
        });
      }
    }
  }, [categoryToEdit, isOpen, reset]);

  const handleOpenChange = (open: boolean) => {
    if (!open && !isSubmitting) {
      if (categoryToEdit) {
         reset({
          name: categoryToEdit.name,
          type: categoryToEdit.type,
          icon: isValidIconName(categoryToEdit.icon) ? categoryToEdit.icon : getRandomIcon(),
          color: categoryToEdit.color || getRandomColor(),
        });
      } else {
        reset({ name: '', type: 'expense', icon: getRandomIcon(), color: getRandomColor() });
      }
    }
    onOpenChange(open);
  };

  const onSubmit: SubmitHandler<CategoryFormData> = async (data) => {
    // data.icon is string | null | undefined. We assume if it's a string, it's an AvailableIconName due to UI picker.
    // data.color is string | null | undefined.
    const apiPayload: Omit<CreateCategoryPayload, 'userId'> | UpdateCategoryPayload = {
      name: data.name,
      type: data.type,
      icon: (data.icon as AvailableIconName | null) ?? null, // Cast and ensure null if undefined
      color: data.color ?? null, // Ensure null if undefined
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
            result.errors.map((e: ApiError) => e.msg).join(', ') :
            "Failed to save category.");
        throw new Error(errorMessage);
      }

      toast.success(`Category "${result.data.name}" ${categoryToEdit ? 'updated' : 'created'} successfully!`);
      onSaveSuccess(result.data as CategoryDTO);
      onOpenChange(false);
    } catch (error) {
      toast.dismiss(toastId);
      toast.error((error as Error).message);
      console.error("Category form error:", error);
    }
  };

  const selectedIconPreview = useMemo(() => {
    // watchedIcon is string | null | undefined
    return isValidIconName(watchedIcon) ? watchedIcon : null;
  }, [watchedIcon]);

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg p-0">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle className="text-xl">
            {categoryToEdit ? 'Edit Category' : 'Add New Category'}
          </DialogTitle>
          <DialogDescription>
            {categoryToEdit ? `Update details for "${categoryToEdit.name}".` : 'Create a new category for transactions and budgets.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <ScrollArea className="max-h-[calc(100vh-15rem)]">
            <div className="space-y-5 px-6 pb-6">
              <div>
                <Label htmlFor="name" className="text-sm font-medium">Category Name</Label>
                <Input
                  id="name"
                  {...register('name')}
                  placeholder="e.g., Groceries, Salary"
                  disabled={isSubmitting}
                  className="mt-1"
                />
                {errors.name && <p className="text-xs text-destructive mt-1.5 flex items-center"><AlertCircle size={14} className="mr-1"/>{errors.name.message}</p>}
              </div>

              <div>
                <Label htmlFor="type" className="text-sm font-medium">Type</Label>
                <Controller
                  name="type"
                  control={control}
                  render={({ field }) => (
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={isSubmitting}
                    >
                      <SelectTrigger id="type" className="mt-1">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="expense">Expense</SelectItem>
                        <SelectItem value="income">Income</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.type && <p className="text-xs text-destructive mt-1.5 flex items-center"><AlertCircle size={14} className="mr-1"/>{errors.type.message}</p>}
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-medium">Customize Appearance (Optional)</Label>
                <div className="flex items-center gap-4 p-3 border rounded-md bg-muted/30 dark:bg-muted/10">
                  <div className="flex-shrink-0">
                    <Label htmlFor="icon-color-picker-native" className="sr-only">Icon Color</Label>
                    <Controller
                      name="color"
                      control={control}
                      render={({ field }) => (
                        <div className="relative w-10 h-10">
                           <input
                            id="icon-color-picker-native"
                            type="color"
                            value={field.value || iconColorPalette[8]}
                            onChange={(e) => field.onChange(e.target.value)}
                            disabled={isSubmitting}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          />
                          <div
                            className="w-10 h-10 rounded-md border border-input flex items-center justify-center pointer-events-none"
                            style={{ backgroundColor: field.value || iconColorPalette[8] }}
                            title="Selected Icon Color"
                          >
                            <Palette size={20} color={getContrastingTextColor(field.value || iconColorPalette[8])} />
                          </div>
                        </div>
                      )}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground mb-1">Selected Icon & Color:</p>
                    <div className="flex items-center gap-2 p-2 border border-dashed rounded-md h-10 bg-background">
                      {selectedIconPreview ? (
                        <IconRenderer name={selectedIconPreview} color={watchedColor || undefined} size={20} />
                      ) : (
                        <span className="text-xs text-muted-foreground italic">No icon</span>
                      )}
                      <span className="text-sm font-medium truncate" style={{ color: watchedColor || 'inherit' }}>
                        {selectedIconPreview || 'Pick an icon'}
                      </span>
                    </div>
                  </div>
                </div>
                {errors.color && <p className="text-xs text-destructive mt-1.5 flex items-center"><AlertCircle size={14} className="mr-1"/>{errors.color.message}</p>}
                
                <div>
                  <Label htmlFor="icon-grid" className="text-xs text-muted-foreground">Choose an Icon:</Label>
                  <ScrollArea className="h-40 rounded-md border p-2 mt-1" id="icon-grid">
                    <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-1.5">
                      {availableIcons.map((iconName) => (
                        <Button
                          key={iconName}
                          type="button"
                          variant="outline"
                          size="icon"
                          disabled={isSubmitting}
                          className={cn(
                            "p-1.5 h-9 w-9 aspect-square",
                            watchedIcon === iconName && "ring-2 ring-primary ring-offset-1 bg-primary/10 dark:bg-primary/20"
                          )}
                          onClick={() => {
                            const newIcon = watchedIcon === iconName ? null : iconName;
                            // Since schema expects string | null | undefined, and AvailableIconName is a string subset
                            setValue('icon', newIcon as (string | null), { shouldDirty: true, shouldValidate: true });
                          }}
                          title={iconName}
                        >
                          <IconRenderer name={iconName} size={18} color={watchedIcon === iconName ? (watchedColor || "currentColor") : "currentColor"} />
                        </Button>
                      ))}
                    </div>
                  </ScrollArea>
                  {/* Error for icon will show if refine fails (e.g. if a non-AvailableIconName string was somehow set) */}
                  {errors.icon && <p className="text-xs text-destructive mt-1.5 flex items-center"><AlertCircle size={14} className="mr-1"/>{errors.icon.message}</p>}
                </div>

                <div>
                  <Label htmlFor="color-palette" className="text-xs text-muted-foreground">Choose Icon Color:</Label>
                  <div className="flex flex-wrap gap-1.5 mt-1" id="color-palette">
                    {iconColorPalette.map((colorOption) => (
                      <button
                        type="button"
                        key={colorOption}
                        disabled={isSubmitting}
                        className={cn(
                          "w-7 h-7 rounded-full border-2 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50",
                          watchedColor === colorOption ? "ring-2 ring-primary border-primary" : "border-transparent hover:border-muted-foreground/50"
                        )}
                        style={{ backgroundColor: colorOption }}
                        onClick={() => setValue('color', colorOption, { shouldDirty: true, shouldValidate: true })}
                        title={colorOption}
                      />
                    ))}
                     <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        disabled={isSubmitting}
                        onClick={() => setValue('color', null, { shouldDirty: true, shouldValidate: true })}
                      >
                        Clear Color
                      </Button>
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>

          <DialogFooter className="p-6 pt-4 border-t">
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isSubmitting}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isSubmitting || !isDirty || !formIsValid}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {categoryToEdit ? 'Save Changes' : 'Create Category'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
