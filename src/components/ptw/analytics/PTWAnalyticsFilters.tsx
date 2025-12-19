import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, Filter, X } from "lucide-react";
import { format, subDays, subMonths, startOfMonth, endOfMonth, subYears, startOfYear } from "date-fns";
import type { PTWAnalyticsFilters } from "@/hooks/ptw/use-ptw-analytics";
import { PTWProject } from "@/hooks/ptw/use-ptw-projects";
import { cn } from "@/lib/utils";

interface PTWAnalyticsFiltersProps {
  filters: PTWAnalyticsFilters;
  onFiltersChange: (filters: PTWAnalyticsFilters) => void;
  projects?: PTWProject[];
  permitTypes?: Array<{ id: string; name: string; code: string }>;
}

type DatePreset = "last30" | "lastQuarter" | "lastYear" | "ytd" | "custom";

export function PTWAnalyticsFilters({
  filters,
  onFiltersChange,
  projects = [],
  permitTypes = [],
}: PTWAnalyticsFiltersProps) {
  const { t } = useTranslation();
  const [datePreset, setDatePreset] = useState<DatePreset>("lastYear");
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const handlePresetChange = (preset: DatePreset) => {
    setDatePreset(preset);
    const now = new Date();
    let startDate: Date | undefined;
    let endDate: Date | undefined;

    switch (preset) {
      case "last30":
        startDate = subDays(now, 30);
        endDate = now;
        break;
      case "lastQuarter":
        startDate = subMonths(now, 3);
        endDate = now;
        break;
      case "lastYear":
        startDate = subYears(now, 1);
        endDate = now;
        break;
      case "ytd":
        startDate = startOfYear(now);
        endDate = now;
        break;
      case "custom":
        // Keep current dates for custom
        return;
    }

    onFiltersChange({ ...filters, startDate, endDate });
  };

  const handleDateChange = (field: "startDate" | "endDate", date: Date | undefined) => {
    setDatePreset("custom");
    onFiltersChange({ ...filters, [field]: date });
  };

  const handleProjectChange = (value: string) => {
    if (value === "all") {
      onFiltersChange({ ...filters, projectIds: undefined });
    } else {
      const projectIds = filters.projectIds || [];
      if (projectIds.includes(value)) {
        onFiltersChange({
          ...filters,
          projectIds: projectIds.filter((id) => id !== value),
        });
      } else {
        onFiltersChange({ ...filters, projectIds: [...projectIds, value] });
      }
    }
  };

  const handleTypeChange = (value: string) => {
    if (value === "all") {
      onFiltersChange({ ...filters, typeIds: undefined });
    } else {
      const typeIds = filters.typeIds || [];
      if (typeIds.includes(value)) {
        onFiltersChange({
          ...filters,
          typeIds: typeIds.filter((id) => id !== value),
        });
      } else {
        onFiltersChange({ ...filters, typeIds: [...typeIds, value] });
      }
    }
  };

  const clearFilters = () => {
    setDatePreset("lastYear");
    onFiltersChange({
      startDate: subYears(new Date(), 1),
      endDate: new Date(),
      projectIds: undefined,
      siteIds: undefined,
      typeIds: undefined,
    });
  };

  const activeFilterCount = [
    filters.projectIds?.length,
    filters.typeIds?.length,
    datePreset !== "lastYear" ? 1 : 0,
  ].filter(Boolean).length;

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Date Range Preset */}
      <Select value={datePreset} onValueChange={(v) => handlePresetChange(v as DatePreset)}>
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder={t("ptw.analytics.dateRange", "Date Range")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="last30">{t("ptw.analytics.last30Days", "Last 30 Days")}</SelectItem>
          <SelectItem value="lastQuarter">{t("ptw.analytics.lastQuarter", "Last Quarter")}</SelectItem>
          <SelectItem value="lastYear">{t("ptw.analytics.lastYear", "Last Year")}</SelectItem>
          <SelectItem value="ytd">{t("ptw.analytics.ytd", "Year to Date")}</SelectItem>
          <SelectItem value="custom">{t("ptw.analytics.custom", "Custom Range")}</SelectItem>
        </SelectContent>
      </Select>

      {/* Custom Date Range */}
      {datePreset === "custom" && (
        <>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <CalendarIcon className="h-4 w-4" />
                {filters.startDate ? format(filters.startDate, "MMM d, yyyy") : t("common.from", "From")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={filters.startDate}
                onSelect={(date) => handleDateChange("startDate", date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          <span className="text-muted-foreground">→</span>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <CalendarIcon className="h-4 w-4" />
                {filters.endDate ? format(filters.endDate, "MMM d, yyyy") : t("common.to", "To")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={filters.endDate}
                onSelect={(date) => handleDateChange("endDate", date)}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </>
      )}

      {/* Project Filter */}
      {projects.length > 0 && (
        <Select
          value={filters.projectIds?.length === 1 ? filters.projectIds[0] : "all"}
          onValueChange={handleProjectChange}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={t("ptw.analytics.allProjects", "All Projects")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("ptw.analytics.allProjects", "All Projects")}</SelectItem>
            {projects.map((project) => (
              <SelectItem key={project.id} value={project.id}>
                {project.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Type Filter */}
      {permitTypes.length > 0 && (
        <Select
          value={filters.typeIds?.length === 1 ? filters.typeIds[0] : "all"}
          onValueChange={handleTypeChange}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder={t("ptw.analytics.allTypes", "All Types")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("ptw.analytics.allTypes", "All Types")}</SelectItem>
            {permitTypes.map((type) => (
              <SelectItem key={type.id} value={type.id}>
                {type.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Active Filters Badge & Clear */}
      {activeFilterCount > 0 && (
        <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1">
          <X className="h-4 w-4" />
          {t("common.clearFilters", "Clear")}
          <Badge variant="secondary" className="ms-1">
            {activeFilterCount}
          </Badge>
        </Button>
      )}
    </div>
  );
}
