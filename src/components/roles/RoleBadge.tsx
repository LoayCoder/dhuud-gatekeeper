import { Badge } from '@/components/ui/badge';
import { useTranslation } from 'react-i18next';
import { RoleCategory } from '@/hooks/use-user-roles';

interface RoleBadgeProps {
  code: string;
  name: string;
  category: RoleCategory;
  size?: 'sm' | 'md';
}

const categoryColors: Record<RoleCategory, string> = {
  general: 'bg-primary/10 text-primary border-primary/20',
  hsse: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
  environmental: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20',
  ptw: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  security: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
  audit: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
  food_safety: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  contractor: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20',
};

export function RoleBadge({ code, name, category, size = 'md' }: RoleBadgeProps) {
  const { t } = useTranslation();
  
  // Try to get translated name, fallback to provided name
  const translatedName = t(`roles.${code}`, { defaultValue: name });
  
  const sizeClasses = size === 'sm' ? 'text-xs px-1.5 py-0.5' : 'text-sm px-2 py-1';
  
  return (
    <Badge 
      variant="outline" 
      className={`${categoryColors[category]} ${sizeClasses} font-medium`}
    >
      {translatedName}
    </Badge>
  );
}

export function RoleCategoryBadge({ category }: { category: RoleCategory }) {
  const { t } = useTranslation();
  
  return (
    <Badge 
      variant="outline" 
      className={`${categoryColors[category]} text-xs font-semibold uppercase tracking-wide`}
    >
      {t(`roleCategories.${category}`)}
    </Badge>
  );
}
