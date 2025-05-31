// apps/web/src/lib/schemas.ts
import { z } from 'zod';

export const currencyCodes = ['USD', 'EUR', 'GBP', 'AUD', 'CAD', 'JPY', 'INR'] as const;
export type CurrencyCode = typeof currencyCodes[number];

export const notificationFrequencies = ['daily', 'weekly', 'monthly', 'none'] as const;
export type NotificationFrequency = typeof notificationFrequencies[number];

export const userSettingsFormSchema = z.object({
  displayName: z.string()
    .max(100, { message: 'Display name cannot exceed 100 characters.' })
    .optional()
    .nullable() 
    .transform(val => val === "" ? null : val),

  // bio: z.string() // Bio field removed
  //   .max(500, { message: 'Bio cannot exceed 500 characters.'})
  //   .optional()
  //   .nullable()
  //   .transform(val => val === "" ? null : val),

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

export type UserSettingsFormData = z.infer<typeof userSettingsFormSchema>;
