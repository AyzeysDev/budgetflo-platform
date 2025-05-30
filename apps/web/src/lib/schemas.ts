// apps/web/src/lib/schemas.ts
import { z } from 'zod';

// Define common currency codes - can be expanded
export const currencyCodes = ['USD', 'EUR', 'GBP', 'AUD', 'CAD', 'JPY', 'INR'] as const;
export type CurrencyCode = typeof currencyCodes[number];

export const notificationFrequencies = ['daily', 'weekly', 'monthly', 'none'] as const;
export type NotificationFrequency = typeof notificationFrequencies[number];

// Zod schema for settings form validation
export const settingsSchema = z.object({
  name: z.string().min(1, { message: 'Name is required.' }).max(100, { message: 'Name cannot exceed 100 characters.' }).optional().or(z.literal('')),
  email: z.string().email({ message: 'Invalid email address.' }), // Email is read-only

  // Bio is removed from the editable form schema
  // image is removed from the editable form schema

  // New editable fields
  notificationFrequency: z.enum(notificationFrequencies, {
    errorMap: () => ({ message: "Please select a valid notification frequency." })
  }).optional(), // Optional as it might not be set by user yet, or default is applied
  preferredCurrency: z.enum(currencyCodes, {
    errorMap: () => ({ message: "Please select a valid currency." })
  }).optional().or(z.literal('')), // Optional, allow empty if user clears it (though UI might prevent this)
  displayDecimalPlaces: z.union([z.literal(0), z.literal(2)], {
    errorMap: () => ({ message: "Please select a valid decimal display option."})
  }).optional(), // Optional, default applied in form
});

// TypeScript type inferred from the Zod schema
export type SettingsFormData = z.infer<typeof settingsSchema>;
