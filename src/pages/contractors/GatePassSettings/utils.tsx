import React from "react";
import { Badge } from "@/components/ui/badge";
import { Building2, Users, Globe } from "lucide-react";
import { ApproverScope } from "./types";

export const getInitials = (name: string | null | undefined) => {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

export const getScopeBadge = (scope: ApproverScope, t: (key: string, fallback: string) => string) => {
  switch (scope) {
    case "external":
      return (
        <Badge variant="outline" className="gap-1 border-orange-500/50 text-orange-600 dark:text-orange-400">
          <Building2 className="h-3 w-3" />
          {t("contractors.gatePasses.scopeExternal", "External")}
        </Badge>
      );
    case "internal":
      return (
        <Badge variant="outline" className="gap-1 border-blue-500/50 text-blue-600 dark:text-blue-400">
          <Users className="h-3 w-3" />
          {t("contractors.gatePasses.scopeInternal", "Internal")}
        </Badge>
      );
    case "both":
    default:
      return (
        <Badge variant="outline" className="gap-1 border-green-500/50 text-green-600 dark:text-green-400">
          <Globe className="h-3 w-3" />
          {t("contractors.gatePasses.scopeBoth", "Both")}
        </Badge>
      );
  }
};
