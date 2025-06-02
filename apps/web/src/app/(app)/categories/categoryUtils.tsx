// apps/web/src/app/(app)/categories/categoryUtils.tsx
import React from 'react';
import * as LucideIcons from 'lucide-react';
import type { LucideProps, LucideIcon } from 'lucide-react'; // Import LucideIcon type

// Define a type for the icon names we allow from lucide-react
// This list should be curated to include icons suitable for categories.
// It's crucial that these names exactly match the export names from 'lucide-react'.
export const availableIcons = [
  // Finance & Shopping
  "ShoppingCart", "CreditCard", "Banknote", "Landmark", "PiggyBank", "Gift", "ReceiptText",
  "Coins", "Wallet", "DollarSign", "Euro", "Bitcoin", "BadgePercent", "TrendingUp", "TrendingDown", "BadgeDollarSign",
  // Home & Living
  "Home", "BedDouble", "Utensils", "CookingPot", "Plug", "Wrench", "Tv", "Dog", "Cat", "Flower", "TreePine", "Sofa", "Lamp", "Bath", "Refrigerator", "Microwave",
  // Transportation
  "Car", "Bike", "Bus", "Train", "Plane", "Fuel", "Ship", "TramFront", "Rocket",
  // Health & Wellness
  "HeartPulse", "Dumbbell", "Brain", "Stethoscope", "Pill", "Activity", "Apple",
  // Entertainment & Leisure
  "Gamepad2", "Music", "Clapperboard", "Ticket", "BookOpen", "Camera", "Paintbrush", "PartyPopper", "Coffee", "Wine", "Film", "Tv2", "Podcast", "Radio",
  // Work & Education
  "Briefcase", "GraduationCap", "BookMarked", "PenTool", "Laptop", "PenLine", "School",
  // Travel & Places
  "MapPin", "Hotel", "PlaneTakeoff", "Umbrella", "MountainSnow", "Sailboat", "Globe", "Backpack",
  // People & Communication
  "Users", "User", "MessageSquare", "Phone", "Smile", "Baby",
  // General & Utility
  "Package", "Tag", "CalendarDays", "Settings", "AlertTriangle", "CheckCircle2", "XCircle", "Info", "HelpCircle", "Star", "Award", "Zap", "Trash2", "Edit3", "PlusCircle", "ShieldCheck", "FileText", "Target", "Scissors", "WashingMachine"
] as const;

export type AvailableIconName = typeof availableIcons[number];

// Default icons and colors
export const DEFAULT_EXPENSE_ICON: AvailableIconName = "ShoppingCart";
export const DEFAULT_EXPENSE_COLOR: string = "#EF5350"; // A red from the palette

export const DEFAULT_INCOME_ICON: AvailableIconName = "Landmark";
export const DEFAULT_INCOME_COLOR: string = "#66BB6A"; // A green from the palette

export const FALLBACK_ICON: AvailableIconName = "Tag"; // Default fallback if an icon name is somehow invalid

// Type guard to check if a string is a valid AvailableIconName
export function isValidIconName(name: string | null | undefined): name is AvailableIconName {
  if (!name) return false;
  return (availableIcons as readonly string[]).includes(name);
}

// Create a correctly typed record for our available icons
const TypedLucideIcons: Record<AvailableIconName, LucideIcon> = {} as Record<AvailableIconName, LucideIcon>;
for (const iconName of availableIcons) {
  if (LucideIcons[iconName]) {
    TypedLucideIcons[iconName] = LucideIcons[iconName] as LucideIcon;
  } else {
    console.warn(`Lucide icon "${iconName}" not found in LucideIcons module during TypedLucideIcons creation.`);
  }
}


interface IconRendererProps extends Omit<LucideProps, 'name'> {
  name: AvailableIconName | string | null | undefined; // Allow any string, but will use fallback if not valid
  className?: string;
  size?: number;
  color?: string;
  strokeWidth?: number;
  style?: React.CSSProperties;
}

export const IconRenderer: React.FC<IconRendererProps> = ({
  name,
  className,
  size = 20,
  color,
  strokeWidth,
  style,
  ...props
}) => {
  let IconComponent: LucideIcon | undefined;

  if (name && isValidIconName(name)) {
    IconComponent = TypedLucideIcons[name];
  } else {
    // If name is provided but not valid, log a warning (optional, can be noisy)
    // if (name) {
    //   console.warn(`IconRenderer: Invalid or unlisted icon name "${name}". Using fallback icon "${FALLBACK_ICON}".`);
    // }
    IconComponent = TypedLucideIcons[FALLBACK_ICON];
  }
  
  // Absolute fallback if even FALLBACK_ICON is somehow misconfigured (should not happen)
  if (!IconComponent) {
    IconComponent = LucideIcons.Tag;
  }
  
  return (
    <IconComponent
      className={className}
      size={size}
      color={color}
      strokeWidth={strokeWidth}
      style={style}
      {...props}
    />
  );
};

export function getContrastingTextColor(hexColor: string | null | undefined): string {
  if (!hexColor) return 'inherit'; // Default to CSS inheritance if no color

  const hex = hexColor.replace('#', '');
  const fullHex = hex.length === 3
    ? hex.split('').map(char => char + char).join('')
    : hex;

  if (fullHex.length !== 6) return 'inherit'; // Invalid hex length

  const r = parseInt(fullHex.substring(0, 2), 16);
  const g = parseInt(fullHex.substring(2, 4), 16);
  const b = parseInt(fullHex.substring(4, 6), 16);

  if (isNaN(r) || isNaN(g) || isNaN(b)) return 'inherit'; // Invalid hex components

  // Calculate luminance
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  
  // Return black for light backgrounds, white for dark backgrounds
  return luminance > 0.5 ? '#000000' : '#FFFFFF';
}

// Palette for user selection, can be expanded or curated
export const iconColorPalette = [
  // Reds & Oranges
  "#EF5350", "#E53935", "#D32F2F", // Reds
  "#FFA726", "#FB8C00", "#F57C00", // Oranges
  // Yellows & Greens
  "#FFCA28", "#FFB300", "#FFEE58", // Yellows
  "#66BB6A", "#43A047", "#2E7D32", // Greens
  "#9CCC65", "#7CB342",
  // Blues & Cyans
  "#42A5F5", "#1E88E5", "#1565C0", // Blues
  "#26C6DA", "#00ACC1", "#00838F", // Cyans
  "#29B6F6",
  // Purples & Pinks
  "#AB47BC", "#8E24AA", "#6A1B9A", // Purples
  "#7E57C2", "#5E35B1",
  "#EC407A", "#D81B60", "#C2185B", // Pinks
  // Browns & Greys
  "#8D6E63", "#6D4C41", "#4E342E", // Browns
  "#757575", "#546E7A", "#37474F", // Greys
  // Black & a very dark grey (almost black)
  "#212121", "#000000", 
];

// These functions are kept as they might be useful for other random suggestions
// or if the user clears a selection and wants a random pick.
export function getRandomIcon(): AvailableIconName {
  const randomIndex = Math.floor(Math.random() * availableIcons.length);
  return availableIcons[randomIndex];
}

export function getRandomColor(): string {
  const randomIndex = Math.floor(Math.random() * iconColorPalette.length);
  return iconColorPalette[randomIndex];
}
