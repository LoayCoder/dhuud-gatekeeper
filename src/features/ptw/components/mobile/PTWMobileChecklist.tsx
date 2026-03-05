import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  ChevronDown, 
  ChevronUp, 
  HardHat, 
  Shield, 
  Flame,
  CheckCircle2
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { MobileChecklistItem } from './MobileChecklistItem';
import { cn } from '@/lib/utils';

export interface ChecklistItem {
  id: string;
  title: string;
  description?: string;
  isRequired: boolean;
  category: 'ppe' | 'safety' | 'type_specific';
}

export interface ChecklistResponse {
  itemId: string;
  status: 'pending' | 'pass' | 'fail' | 'na';
  comment?: string;
  photos?: string[];
}

interface PTWMobileChecklistProps {
  permitType: string;
  items: ChecklistItem[];
  responses: ChecklistResponse[];
  onResponseChange: (response: ChecklistResponse) => void;
  onPhotoCapture: (itemId: string) => void;
}

const categoryIcons = {
  ppe: HardHat,
  safety: Shield,
  type_specific: Flame,
};

const categoryLabels = {
  ppe: 'ptw.inspection.ppeSection',
  safety: 'ptw.inspection.safetySection',
  type_specific: 'ptw.inspection.typeSection',
};

export function PTWMobileChecklist({
  permitType,
  items,
  responses,
  onResponseChange,
  onPhotoCapture,
}: PTWMobileChecklistProps) {
  const { t } = useTranslation();
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(['ppe', 'safety', 'type_specific']));

  const getResponse = useCallback((itemId: string) => {
    return responses.find((r) => r.itemId === itemId) || {
      itemId,
      status: 'pending' as const,
      comment: '',
      photos: [],
    };
  }, [responses]);

  const handleStatusChange = useCallback((itemId: string, status: 'pass' | 'fail' | 'na') => {
    const existing = getResponse(itemId);
    onResponseChange({
      ...existing,
      itemId,
      status,
    });
  }, [getResponse, onResponseChange]);

  const handleCommentChange = useCallback((itemId: string, comment: string) => {
    const existing = getResponse(itemId);
    onResponseChange({
      ...existing,
      itemId,
      comment,
    });
  }, [getResponse, onResponseChange]);

  const toggleSection = useCallback((section: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  }, []);

  // Calculate progress
  const totalItems = items.length;
  const completedItems = responses.filter((r) => r.status !== 'pending').length;
  const progressPercent = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  // Group items by category
  const groupedItems = items.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, ChecklistItem[]>);

  const categories = ['ppe', 'safety', 'type_specific'].filter(
    (cat) => groupedItems[cat]?.length > 0
  );

  return (
    <div className="space-y-4">
      {/* Progress Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm pb-4 pt-2 -mx-4 px-4 border-b">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-foreground">
            {t('ptw.inspection.progress', '{{completed}}/{{total}} items', {
              completed: completedItems,
              total: totalItems,
            })}
          </span>
          <span className="text-sm font-bold text-primary">{progressPercent}%</span>
        </div>
        <Progress value={progressPercent} className="h-2" />
        {progressPercent === 100 && (
          <div className="flex items-center gap-2 mt-2 text-green-600">
            <CheckCircle2 className="h-4 w-4" />
            <span className="text-sm font-medium">{t('ptw.mobile.allComplete', 'All items completed')}</span>
          </div>
        )}
      </div>

      {/* Category Sections */}
      {categories.map((category) => {
        const Icon = categoryIcons[category as keyof typeof categoryIcons];
        const categoryItems = groupedItems[category] || [];
        const categoryCompleted = categoryItems.filter(
          (item) => getResponse(item.id).status !== 'pending'
        ).length;

        return (
          <Collapsible
            key={category}
            open={openSections.has(category)}
            onOpenChange={() => toggleSection(category)}
          >
            <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg bg-muted/50 p-4 hover:bg-muted transition-colors">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div className="text-start">
                  <h3 className="font-semibold text-foreground">
                    {category === 'type_specific'
                      ? t(categoryLabels[category], { type: permitType })
                      : t(categoryLabels[category as keyof typeof categoryLabels])}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {categoryCompleted}/{categoryItems.length} {t('common.completed', 'completed')}
                  </p>
                </div>
              </div>
              {openSections.has(category) ? (
                <ChevronUp className="h-5 w-5 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              )}
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3 space-y-3">
              {categoryItems.map((item) => {
                const response = getResponse(item.id);
                return (
                  <MobileChecklistItem
                    key={item.id}
                    id={item.id}
                    title={item.title}
                    description={item.description}
                    isRequired={item.isRequired}
                    status={response.status}
                    comment={response.comment}
                    photoCount={response.photos?.length || 0}
                    onStatusChange={(status) => handleStatusChange(item.id, status)}
                    onCommentChange={(comment) => handleCommentChange(item.id, comment)}
                    onPhotoCapture={() => onPhotoCapture(item.id)}
                  />
                );
              })}
            </CollapsibleContent>
          </Collapsible>
        );
      })}
    </div>
  );
}
