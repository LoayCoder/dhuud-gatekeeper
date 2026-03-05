import { useMemo } from 'react';
import { useUserRoles } from '@/features/users';
import { useModuleAccess } from '@/hooks/use-module-access';
import { ALL_HOME_CARDS, type RoleCardCategory, type HomeActionCard } from '@/config/home-actions';

export function useHomeActions() {
  const { userRoles, isLoading: rolesLoading, hasRoleInCategory } = useUserRoles();
  const { hasModule, isLoading: modulesLoading } = useModuleAccess();

  // Determine which categories apply to this user
  const userCategories = useMemo(() => {
    const cats = new Set<RoleCardCategory>(['base']); // Everyone gets base cards
    
    // Check for security roles
    if (hasRoleInCategory('security')) {
      cats.add('security');
    }
    
    // Check for HSSE roles
    if (hasRoleInCategory('hsse')) {
      cats.add('hsse');
    }
    
    return cats;
  }, [userRoles, hasRoleInCategory]);

  // Filter cards based on user's categories and module access
  const visibleCards = useMemo(() => {
    return ALL_HOME_CARDS.filter((card) => {
      // Check if user has at least one matching category
      const hasMatchingCategory = card.categories.some((c) => userCategories.has(c));
      if (!hasMatchingCategory) return false;
      
      // Check module access if required
      if (card.requiredModule && !hasModule(card.requiredModule as any)) {
        return false;
      }
      
      return true;
    });
  }, [userCategories, hasModule]);

  // Deduplicate cards (some cards appear in multiple categories)
  const uniqueCards = useMemo(() => {
    const seen = new Set<string>();
    return visibleCards.filter((card) => {
      if (seen.has(card.id)) return false;
      seen.add(card.id);
      return true;
    });
  }, [visibleCards]);

  return {
    cards: uniqueCards,
    isLoading: rolesLoading || modulesLoading,
    categoryCount: userCategories.size,
  };
}

