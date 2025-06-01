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
    // This case should ideally not happen if availableIcons is kept in sync with LucideIcons exports
    console.warn(`Lucide icon "${iconName}" not found in LucideIcons module during TypedLucideIcons creation.`);
  }
}


interface IconRendererProps extends Omit<LucideProps, 'name'> {
  name: AvailableIconName | string | null | undefined;
  fallbackIcon?: AvailableIconName;
  className?: string;
  size?: number;
  color?: string;
  strokeWidth?: number;
  style?: React.CSSProperties;
}

export const IconRenderer: React.FC<IconRendererProps> = ({
  name,
  fallbackIcon = "Tag", // Default fallback icon name from AvailableIconName
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
  } else if (name) {
    // console.warn(`IconRenderer: Invalid or unlisted icon name "${name}". Using fallback icon "${fallbackIcon}".`);
    // Log only if the name was provided but not valid, to avoid noise for intentionally null/undefined names
  }

  // If IconComponent is still undefined (e.g., name was invalid or not in availableIcons), use the fallback
  if (!IconComponent) {
    IconComponent = TypedLucideIcons[fallbackIcon];
    // If even the fallbackIcon is somehow invalid (should not happen if fallbackIcon is an AvailableIconName),
    // default to a hardcoded known icon like Tag.
    if (!IconComponent) {
      IconComponent = LucideIcons.Tag; // Absolute fallback
    }
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
  if (!hexColor) return 'inherit';

  const hex = hexColor.replace('#', '');
  const fullHex = hex.length === 3
    ? hex.split('').map(char => char + char).join('')
    : hex;

  if (fullHex.length !== 6) return 'inherit';

  const r = parseInt(fullHex.substring(0, 2), 16);
  const g = parseInt(fullHex.substring(2, 4), 16);
  const b = parseInt(fullHex.substring(4, 6), 16);

  if (isNaN(r) || isNaN(g) || isNaN(b)) return 'inherit';

  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luminance > 0.5 ? '#000000' : '#FFFFFF';
}

export const iconColorPalette = [
  "#EF5350", "#E53935", "#EC407A", "#D81B60",
  "#FFA726", "#FB8C00", "#FFCA28", "#FFB300", "#FFEE58",
  "#66BB6A", "#43A047", "#9CCC65", "#7CB342",
  "#42A5F5", "#1E88E5", "#26C6DA", "#00ACC1", "#29B6F6",
  "#AB47BC", "#8E24AA", "#7E57C2", "#5E35B1",
  "#8D6E63", "#6D4C41", "#757575", "#546E7A",
  "#000000",
];

export function getRandomIcon(): AvailableIconName {
  const randomIndex = Math.floor(Math.random() * availableIcons.length);
  return availableIcons[randomIndex];
}

export function getRandomColor(): string {
  const randomIndex = Math.floor(Math.random() * iconColorPalette.length);
  return iconColorPalette[randomIndex];
}
