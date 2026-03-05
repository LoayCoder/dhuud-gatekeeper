import React from "react";
import { useTranslation } from "react-i18next";
import { format, formatDistanceToNow } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User } from "lucide-react";
import { cn } from "@/lib/utils";
import { TimelineEvent } from "../types";

export function TimelineItem({

  event,
  isFirst,
  dateLocale,
  t,
}: {
  event: TimelineEvent;
  isFirst: boolean;
  dateLocale: typeof ar | typeof enUS;
  t: ReturnType<typeof useTranslation>["t"];
}) {
  const IconComponent = event.icon;
  const actorName = event.actor?.full_name || t("common.system", "System");
  const actorInitials = actorName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex gap-3 relative">
      {/* Icon */}
      <div
        className={cn(
          "relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-background",
          isFirst && "ring-2 ring-primary ring-offset-2 ring-offset-background"
        )}
      >
        <IconComponent className="h-4 w-4 text-muted-foreground" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pb-4">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium">{event.label}</p>
          <Badge className={cn("text-xs", event.color)}>{event.type.replace("_", " ")}</Badge>
        </div>

        <div className="flex items-center gap-2 mt-1">
          <Avatar className="h-5 w-5">
            <AvatarImage src={event.actor?.avatar_url || undefined} />
            <AvatarFallback className="text-[10px]">
              {event.actor ? actorInitials : <User className="h-3 w-3" />}
            </AvatarFallback>
          </Avatar>
          <span className="text-xs text-muted-foreground">{actorName}</span>
        </div>

        <p className="text-xs text-muted-foreground mt-1">
          {format(new Date(event.timestamp), "PPp", { locale: dateLocale })}
          <span className="mx-1">•</span>
          {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true, locale: dateLocale })}
        </p>

        {event.notes && (
          <p className="text-xs text-muted-foreground/80 mt-1 italic">"{event.notes}"</p>
        )}
      </div>
    </div>
  );
}
