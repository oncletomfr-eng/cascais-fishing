import { 
  Fish,
  Users, 
  MapPin, 
  Trophy, 
  Target, 
  Star, 
  Calendar,
  Medal,
  Crown,
  Gem,
  LucideIcon
} from 'lucide-react';

// Map string icon names to actual Lucide React components
export const iconMap: Record<string, LucideIcon> = {
  Fish,
  Users,
  MapPin,
  Trophy,
  Target,
  Star,
  Calendar,
  Medal,
  Crown,
  Gem,
};

// Helper function to get the icon component from string name
export const getIconComponent = (iconName: string): LucideIcon => {
  return iconMap[iconName] || Fish; // Default to Fish if icon not found
};
