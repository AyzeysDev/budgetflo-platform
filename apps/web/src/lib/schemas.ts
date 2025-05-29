// apps/web/src/lib/schemas.ts
import { z } from 'zod';

// Zod schema for settings form validation
export const settingsSchema = z.object({
  name: z.string().min(1, { message: 'Name is required.' }).max(100, { message: 'Name cannot exceed 100 characters.' }).optional().or(z.literal('')),
  email: z.string().email({ message: 'Invalid email address.' }), // Email is read-only but good to have in schema
  bio: z.string().max(500, { message: 'Bio cannot exceed 500 characters.' }).optional().or(z.literal('')),
  // 'image' field removed from schema as it's not directly editable in this form version
});

// TypeScript type inferred from the Zod schema
export type SettingsFormData = z.infer<typeof settingsSchema>;
