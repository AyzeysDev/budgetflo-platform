// apps/web/src/lib/schemas.ts
import { z } from 'zod';

// Define common currency codes - can be expanded
export const currencyCodes = ['USD', 'EUR', 'GBP', 'AUD', 'CAD', 'JPY', 'INR'] as const;
export type CurrencyCode = typeof currencyCodes[number];

export const notificationFrequencies = ['daily', 'weekly', 'monthly', 'none'] as const;
export type NotificationFrequency = typeof notificationFrequencies[number];

// Zod schema for the new settings form validation, aligning with WebAppUserSettingsUpdatePayload
export const userSettingsFormSchema = z.object({
  displayName: z.string()
    .max(100, { message: 'Display name cannot exceed 100 characters.' })
    .optional()
    .nullable() // Allow null or empty string to clear it
    .transform(val => val === "" ? null : val), // Treat empty string as null for backend

  bio: z.string()
    .max(500, { message: 'Bio cannot exceed 500 characters.'})
    .optional()
    .nullable()
    .transform(val => val === "" ? null : val),

  notificationFrequency: z.enum(notificationFrequencies, {
    errorMap: () => ({ message: "Please select a valid notification frequency." })
  }).optional(), 

  preferredCurrency: z.enum(currencyCodes, {
    errorMap: () => ({ message: "Please select a valid currency." })
  }).optional(),

  displayDecimalPlaces: z.union([z.literal(0), z.literal(2)], {
    errorMap: () => ({ message: "Please select a valid decimal display option."})
  }).optional(),
});

// TypeScript type inferred from the Zod schema for the form data
export type UserSettingsFormData = z.infer<typeof userSettingsFormSchema>;


// The old settingsSchema might still be used if parts of the page display read-only info
// based on a broader profile structure, but the form itself will use userSettingsFormSchema.
// For clarity, I'm commenting out the old one if it's fully replaced by the form's needs.
/*
export const settingsSchema = z.object({
  name: z.string().min(1, { message: 'Name is required.' }).max(100, { message: 'Name cannot exceed 100 characters.' }).optional().or(z.literal('')),
  email: z.string().email({ message: 'Invalid email address.' }), // Email is read-only
  notificationFrequency: z.enum(notificationFrequencies, {
    errorMap: () => ({ message: "Please select a valid notification frequency." })
  }).optional(),
  preferredCurrency: z.enum(currencyCodes, {
    errorMap: () => ({ message: "Please select a valid currency." })
  }).optional().or(z.literal('')), 
  displayDecimalPlaces: z.union([z.literal(0), z.literal(2)], {
    errorMap: () => ({ message: "Please select a valid decimal display option."})
  }).optional(),
});
export type SettingsFormData = z.infer<typeof settingsSchema>;
*/
