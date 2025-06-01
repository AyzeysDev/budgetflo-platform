// apps/web/src/app/(app)/categories/categoryUtils.tsx
import React from 'react';
import * as LucideIcons from 'lucide-react';
import type { LucideProps } from 'lucide-react';

// Define a type for the icon names we allow from lucide-react
// This list can be expanded or curated as needed.
export const availableIcons = [
  // Finance & Shopping
  "ShoppingCart", "CreditCard", "Banknote", "Landmark", "PiggyBank", "Gift", "Receipt", "Coins", "Wallet", "DollarSign", "Euro", "Bitcoin", "BadgePercent",
  // Home & Living
  "Home", "BedDouble", "Utensils", "CookingPot", "Plug", "Wrench", "Tv", "Dog", "Cat", "Flower", "TreePine",
  // Transportation
  "Car", "Bike", "Bus", "Train", "Plane", "Fuel", "Ship",
  // Health & Wellness
  "HeartPulse", "Dumbbell", "Brain", "Stethoscope", "Pill",
  // Entertainment & Leisure
  "Gamepad2", "Music", "Clapperboard", "Ticket", "BookOpen", "Camera", "Paintbrush", "PartyPopper", "Coffee", "Wine",
  // Work & Education
  "Briefcase", "GraduationCap", "BookMarked", "PenTool", "Laptop",
  // Travel & Places
  "MapPin", "Hotel", "PlaneTakeoff", "Umbrella", "MountainSnow", "Sailboat",
  // People & Communication
  "Users", "User", "MessageSquare", "Phone",
  // General & Utility
  "Package", "Tag", "CalendarDays", "Settings", "AlertTriangle", "CheckCircle2", "XCircle", "Info", "HelpCircle", "Star", "Award", "Zap"
] as const;

export type AvailableIconName = typeof availableIcons[number];

// Proper interface with specific prop types
interface IconRendererProps {
  name: AvailableIconName | string | null | undefined;
  fallback?: React.ReactNode;
  className?: string;
  size?: number;
  color?: string;
  strokeWidth?: number;
  style?: React.CSSProperties;
}

// Type for accessing Lucide icons dynamically
type LucideIconComponent = React.ForwardRefExoticComponent<
  Omit<LucideProps, "ref"> & React.RefAttributes<SVGSVGElement>
>;

export const IconRenderer: React.FC<IconRendererProps> = ({ 
  name, 
  fallback = null, 
  className,
  size,
  color,
  strokeWidth,
  style,
  ...props 
}) => {
  // Handle null, undefined, or empty names
  if (!name) {
    if (fallback) return <>{fallback}</>;
    const DefaultIcon = LucideIcons.Tag;
    return <DefaultIcon className={className} size={size} color={color} strokeWidth={strokeWidth} style={style} {...props} />;
  }

  // Safe way to access the icon component with proper error handling
  const lucideIconsRecord = LucideIcons as unknown as Record<string, LucideIconComponent>;
  const IconComponent = lucideIconsRecord[name];
  
  // Check if the icon exists and is a valid component
  if (!IconComponent || typeof IconComponent !== 'function') {
    // If name is not a valid Lucide icon, return fallback or default
    if (fallback) return <>{fallback}</>;
    const DefaultIcon = LucideIcons.Tag;
    return <DefaultIcon className={className} size={size} color={color} strokeWidth={strokeWidth} style={style} {...props} />;
  }

  // Render the found icon with proper typing
  return React.createElement(IconComponent, {
    className,
    size,
    color,
    strokeWidth,
    style,
    ...props
  } as LucideProps);
};

// Simple color contrast checker (basic implementation)
// Returns 'black' or 'white' for text color based on background hex
export function getContrastingTextColor(hexColor: string | null | undefined): string {
  if (!hexColor) return 'inherit'; // Default text color if no bg color

  // Remove # if present
  const hex = hexColor.replace('#', '');

  // Handle 3-character hex codes
  const fullHex = hex.length === 3 
    ? hex.split('').map(char => char + char).join('')
    : hex;

  // Convert hex to RGB
  const r = parseInt(fullHex.substring(0, 2), 16);
  const g = parseInt(fullHex.substring(2, 4), 16);
  const b = parseInt(fullHex.substring(4, 6), 16);

  // Calculate luminance (per WCAG equation)
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

  return luminance > 0.5 ? '#000000' : '#FFFFFF'; // Threshold can be adjusted
}

// Predefined color palette for easier selection
export const colorPalette = [
  "#F44336", // Red
  "#E91E63", // Pink
  "#9C27B0", // Purple
  "#673AB7", // Deep Purple
  "#3F51B5", // Indigo
  "#2196F3", // Blue
  "#03A9F4", // Light Blue
  "#00BCD4", // Cyan
  "#009688", // Teal
  "#4CAF50", // Green
  "#8BC34A", // Light Green
  "#CDDC39", // Lime
  "#FFEB3B", // Yellow
  "#FFC107", // Amber
  "#FF9800", // Orange
  "#FF5722", // Deep Orange
  "#795548", // Brown
  "#9E9E9E", // Grey
  "#607D8B", // Blue Grey
  "#000000", // Black
];

// Helper function to check if a string is a valid icon name
export function isValidIconName(name: string): name is AvailableIconName {
  return availableIcons.includes(name as AvailableIconName);
}

// Helper function to get a random icon from the available icons
export function getRandomIcon(): AvailableIconName {
  const randomIndex = Math.floor(Math.random() * availableIcons.length);
  return availableIcons[randomIndex];
}

// Helper function to get a random color from the palette
export function getRandomColor(): string {
  const randomIndex = Math.floor(Math.random() * colorPalette.length);
  return colorPalette[randomIndex];
}