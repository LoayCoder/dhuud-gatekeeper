import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  BookOpen, 
  HelpCircle, 
  TrendingUp, 
  AlertTriangle,
  LucideIcon 
} from "lucide-react";
import { ExecutiveNarratives } from "@/hooks/use-executive-ai-insights";
import { cn } from "@/lib/utils";

interface StorytellingCardProps {
  narratives: ExecutiveNarratives | null;
  isLoading?: boolean;
}

interface NarrativeSection {
  key: keyof ExecutiveNarratives;
  icon: LucideIcon;
  titleKey: string;
  colorClass: string;
  bgClass: string;
}

const sections: NarrativeSection[] = [
  {
    key: 'what_happened',
    icon: BookOpen,
    titleKey: 'executiveReport.ai.whatHappened',
    colorClass: 'text-primary',
    bgClass: 'bg-primary/5',
  },
  {
    key: 'why_it_happened',
    icon: HelpCircle,
    titleKey: 'executiveReport.ai.whyItHappened',
    colorClass: 'text-orange-500',
    bgClass: 'bg-orange-500/5',
  },
  {
    key: 'what_improved',
    icon: TrendingUp,
    titleKey: 'executiveReport.ai.whatImproved',
    colorClass: 'text-green-500',
    bgClass: 'bg-green-500/5',
  },
  {
    key: 'what_needs_action',
    icon: AlertTriangle,
    titleKey: 'executiveReport.ai.whatNeedsAction',
    colorClass: 'text-destructive',
    bgClass: 'bg-destructive/5',
  },
];

export function StorytellingCard({ narratives, isLoading }: StorytellingCardProps) {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('executiveReport.ai.executiveNarrative')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-muted rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!narratives) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('executiveReport.ai.executiveNarrative')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sections.map((section) => {
            const Icon = section.icon;
            const content = narratives[section.key];
            
            return (
              <div 
                key={section.key}
                className={cn("p-4 rounded-lg", section.bgClass)}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={cn("h-5 w-5", section.colorClass)} />
                  <h4 className="font-semibold">{t(section.titleKey)}</h4>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {content}
                </p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
