// apps/web/src/app/(app)/budgets/MonthYearPicker.tsx
"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ChevronLeft, ChevronRight, CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MonthYearPickerProps {
  currentPeriod: { year: number; month: number };
  onPeriodChange: (period: { year: number; month: number }) => void;
  disabled?: boolean;
}

const months = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

export function MonthYearPicker({ currentPeriod, onPeriodChange, disabled }: MonthYearPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewYear, setViewYear] = useState(currentPeriod.year);

  const handleMonthSelect = (monthIndex: number) => {
    onPeriodChange({ year: viewYear, month: monthIndex + 1 });
    setIsOpen(false);
  };
  
  const selectedPeriodDisplay = new Date(currentPeriod.year, currentPeriod.month - 1).toLocaleString('default', { month: 'long', year: 'numeric' });

  // When the popover opens, sync the viewYear with the current selection
  const handleOpenChange = (open: boolean) => {
    if (open) {
      setViewYear(currentPeriod.year);
    }
    setIsOpen(open);
  }

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-[180px] justify-start text-left font-normal h-9" disabled={disabled}>
          <CalendarIcon className="mr-2 h-4 w-4" />
          {selectedPeriodDisplay}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="center">
        <div className="p-3">
          <div className="flex items-center justify-between pb-2 mb-2 border-b">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setViewYear(viewYear - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-sm font-semibold">{viewYear}</div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setViewYear(viewYear + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-1">
            {months.map((month, index) => (
              <Button
                key={month}
                variant="ghost"
                className={cn(
                  "h-8 text-xs font-normal",
                  currentPeriod.year === viewYear && currentPeriod.month === index + 1 && "bg-primary text-primary-foreground hover:bg-primary/90"
                )}
                onClick={() => handleMonthSelect(index)}
              >
                {month}
              </Button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
