import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { ChevronDown, ChevronRight, ChevronLeft, Settings2, Search, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import {
  useAllEventCategoriesWithStatus,
  useToggleEventCategory,
  type EventCategoryWithStatus,
} from '@/hooks/use-active-event-categories';
import {
  useAllEventSubtypesWithStatus,
  useToggleEventSubtype,
  type EventSubtypeWithStatus,
} from '@/hooks/use-active-event-subtypes';

interface CategoryRowProps {
  category: EventCategoryWithStatus;
  isExpanded: boolean;
  onToggleExpand: () => void;
  searchQuery: string;
}

function CategoryRow({ category, isExpanded, onToggleExpand, searchQuery }: CategoryRowProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  const toggleCategory = useToggleEventCategory();
  const { data: subtypes, isLoading: subtypesLoading } = useAllEventSubtypesWithStatus(
    isExpanded ? category.id : undefined
  );
  const toggleSubtype = useToggleEventSubtype();

  const handleCategoryToggle = async (checked: boolean) => {
    try {
      await toggleCategory.mutateAsync({ categoryId: category.id, isActive: checked });
      toast.success(
        checked 
          ? t('settings.eventCategories.categoryEnabled') 
          : t('settings.eventCategories.categoryDisabled')
      );
    } catch (error) {
      toast.error(t('common.error'));
    }
  };

  const handleSubtypeToggle = async (subtypeId: string, checked: boolean) => {
    try {
      await toggleSubtype.mutateAsync({ subtypeId, isActive: checked });
      toast.success(
        checked 
          ? t('settings.eventCategories.subtypeEnabled') 
          : t('settings.eventCategories.subtypeDisabled')
      );
    } catch (error) {
      toast.error(t('common.error'));
    }
  };

  // Filter subtypes by search query
  const filteredSubtypes = subtypes?.filter(sub => 
    !searchQuery || 
    t(sub.name_key).toLowerCase().includes(searchQuery.toLowerCase()) ||
    sub.code.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const activeSubtypesCount = subtypes?.filter(s => s.is_active).length || 0;
  const totalSubtypesCount = subtypes?.length || 0;

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggleExpand}>
      <div 
        className={cn(
          "border rounded-lg transition-colors",
          !category.is_active && "opacity-60 bg-muted/30",
          category.is_active && "bg-card"
        )}
      >
        {/* Category Header */}
        <div className="flex items-center justify-between p-4">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2 text-start">
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                direction === 'rtl' ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
              )}
              <span className="font-medium">{t(category.name_key)}</span>
              {isExpanded && subtypes && (
                <Badge variant="secondary" className="ms-2">
                  {activeSubtypesCount}/{totalSubtypesCount}
                </Badge>
              )}
            </Button>
          </CollapsibleTrigger>

          <div className="flex items-center gap-3">
            {category.is_override && (
              <Badge variant="outline" className="text-xs">
                {t('settings.eventCategories.customized')}
              </Badge>
            )}
            <Switch
              checked={category.is_active}
              onCheckedChange={handleCategoryToggle}
              disabled={toggleCategory.isPending}
            />
          </div>
        </div>

        {/* Subtypes List */}
        <CollapsibleContent>
          <div className="border-t px-4 py-3 space-y-2 bg-muted/20">
            {subtypesLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : filteredSubtypes.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">
                {searchQuery 
                  ? t('settings.eventCategories.noMatchingSubtypes')
                  : t('settings.eventCategories.noSubtypes')
                }
              </p>
            ) : (
              filteredSubtypes.map(subtype => (
                <div
                  key={subtype.id}
                  className={cn(
                    "flex items-center justify-between py-2 px-3 rounded-md transition-colors",
                    !subtype.is_active && "opacity-60 bg-muted/50",
                    subtype.is_active && "bg-background"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{t(subtype.name_key)}</span>
                    {subtype.is_override && (
                      <Badge variant="outline" className="text-xs">
                        {t('settings.eventCategories.customized')}
                      </Badge>
                    )}
                  </div>
                  <Switch
                    checked={subtype.is_active}
                    onCheckedChange={(checked) => handleSubtypeToggle(subtype.id, checked)}
                    disabled={toggleSubtype.isPending || !category.is_active}
                    className="scale-90"
                  />
                </div>
              ))
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

export default function EventCategoryManagement() {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const { data: categories, isLoading, error } = useAllEventCategoriesWithStatus();

  const toggleExpand = (categoryId: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  const expandAll = () => {
    if (categories) {
      setExpandedCategories(new Set(categories.map(c => c.id)));
    }
  };

  const collapseAll = () => {
    setExpandedCategories(new Set());
  };

  // Filter categories by search query
  const filteredCategories = categories?.filter(cat =>
    !searchQuery ||
    t(cat.name_key).toLowerCase().includes(searchQuery.toLowerCase()) ||
    cat.code.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const activeCount = categories?.filter(c => c.is_active).length || 0;
  const totalCount = categories?.length || 0;

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{t('common.error')}</AlertDescription>
      </Alert>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings2 className="h-5 w-5" />
          {t('settings.eventCategories.title')}
        </CardTitle>
        <CardDescription>
          {t('settings.eventCategories.description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats & Controls */}
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Badge variant="secondary">
              {t('settings.eventCategories.activeCategories', { count: activeCount, total: totalCount })}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={expandAll}>
              {t('settings.eventCategories.expandAll')}
            </Button>
            <Button variant="outline" size="sm" onClick={collapseAll}>
              {t('settings.eventCategories.collapseAll')}
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('settings.eventCategories.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="ps-9"
          />
        </div>

        {/* Category List */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {searchQuery 
              ? t('settings.eventCategories.noMatchingCategories')
              : t('settings.eventCategories.noCategories')
            }
          </div>
        ) : (
          <div className="space-y-3">
            {filteredCategories.map(category => (
              <CategoryRow
                key={category.id}
                category={category}
                isExpanded={expandedCategories.has(category.id)}
                onToggleExpand={() => toggleExpand(category.id)}
                searchQuery={searchQuery}
              />
            ))}
          </div>
        )}

        {/* Info Note */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {t('settings.eventCategories.infoNote')}
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
