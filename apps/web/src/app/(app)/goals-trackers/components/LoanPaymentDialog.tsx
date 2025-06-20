'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import type { WebAppLoanTracker, WebAppRecordEMIPaymentPayload } from '@/types/tracker';

interface LoanPaymentDialogProps {
  tracker: WebAppLoanTracker;
  onClose: () => void;
  onPaymentSaved: (tracker: WebAppLoanTracker) => void;
}

const paymentSchema = z.object({
  amount: z.number().min(0.01, 'Amount must be positive'),
  paymentDate: z.string().nonempty('Payment date is required'),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

export default function LoanPaymentDialog({ tracker, onClose, onPaymentSaved }: LoanPaymentDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      amount: tracker.emiAmount,
      paymentDate: new Date().toISOString().split('T')[0], // YYYY-MM-DD
    },
  });

  const onSubmit = async (data: PaymentFormData) => {
    setIsSubmitting(true);
    const toastId = toast.loading('Recording payment...');

    const payload: WebAppRecordEMIPaymentPayload = {
      amount: data.amount,
      paymentDate: new Date(data.paymentDate).toISOString(),
    };

    try {
      const response = await fetch(`/api/trackers/loans/${tracker.trackerId}/record-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to record payment');
      }

      const updatedTracker = await response.json();
      toast.success('Payment recorded successfully', { id: toastId });
      onPaymentSaved(updatedTracker);
      onClose();
    } catch (error) {
      toast.error((error as Error).message, { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record Payment for {tracker.name}</DialogTitle>
          <DialogDescription>
            Record a payment for this loan. The default amount is the EMI.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Payment Amount</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              {...register('amount', { valueAsNumber: true })}
              disabled={isSubmitting}
            />
            {errors.amount && <p className="text-sm text-destructive">{errors.amount.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="paymentDate">Payment Date</Label>
            <Input
              id="paymentDate"
              type="date"
              {...register('paymentDate')}
              disabled={isSubmitting}
            />
            {errors.paymentDate && <p className="text-sm text-destructive">{errors.paymentDate.message}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Recording...' : 'Record Payment'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 