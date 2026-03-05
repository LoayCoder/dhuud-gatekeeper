import React from "react";
import { useTranslation } from "react-i18next";
import { ar, enUS } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  LogIn,
  LogOut,
} from "lucide-react";
import {
  useGatePassDetails,
  GatePassApproverProfile,
} from "@/features/contractors/hooks/use-gate-pass-details";
import { TimelineEvent } from "../types";
import { TimelineItem } from "./TimelineItem";

interface TimelineTabProps {
  gatePassId: string;
  events: TimelineEvent[];
  isLoading?: boolean;
}

export function TimelineTab({ gatePassId, events, isLoading }: TimelineTabProps) {
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language === "ar" ? ar : enUS;

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (!events || events.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {t("gatePass.noTimeline", "No timeline events")}
      </div>
    );
  }

  return (
    <div className="relative space-y-0 p-4">
      <div className="absolute start-[19px] top-0 bottom-0 w-px bg-border" />
      {events.map((event, index) => (
        <TimelineItem
          key={event.timestamp + index}
          event={event}
          isFirst={index === 0}
          dateLocale={dateLocale}
          t={t}
        />
      ))}
    </div>
  );
}
