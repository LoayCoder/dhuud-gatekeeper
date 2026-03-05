import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Plus, Search, LayoutGrid, List, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

interface IncidentListHeaderProps {
  totalCount: number;
  filteredCount: number;
  hasHSSEAccess: boolean;
  viewMode: 'cards' | 'table';
  onViewModeChange: (mode: 'cards' | 'table') => void;
  onExport?: (format: 'pdf' | 'excel') => void;
}

export function IncidentListHeader({
  totalCount,
  filteredCount,
  hasHSSEAccess,
  viewMode,
  onViewModeChange,
  onExport,
}: IncidentListHeaderProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            {t('pages.hsseEvents.title')}
          </h1>
          <Badge variant="secondary" className="text-sm">
            {filteredCount !== totalCount 
              ? `${filteredCount} / ${totalCount}` 
              : totalCount}
          </Badge>
        </div>
        <p className="text-muted-foreground text-sm mt-1">
          {t('pages.hsseEvents.description')}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {/* View Mode Toggle */}
        <ToggleGroup 
          type="single" 
          value={viewMode} 
          onValueChange={(v) => v && onViewModeChange(v as 'cards' | 'table')}
          className="hidden sm:flex"
        >
          <ToggleGroupItem value="cards" aria-label="Card view" className="px-3">
            <LayoutGrid className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="table" aria-label="Table view" className="px-3">
            <List className="h-4 w-4" />
          </ToggleGroupItem>
        </ToggleGroup>

        {/* Export Dropdown */}
        {hasHSSEAccess && onExport && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="hidden sm:flex">
                <Download className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onExport('excel')}>
                {t('common.exportExcel', 'Export to Excel')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onExport('pdf')}>
                {t('common.exportPDF', 'Export to PDF')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Investigation Workspace */}
        {hasHSSEAccess && (
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link to="/incidents/investigate" className="gap-2">
              <Search className="h-4 w-4" />
              <span className="hidden sm:inline">{t('navigation.investigationWorkspace')}</span>
              <span className="sm:hidden">{t('navigation.investigate', 'Investigate')}</span>
            </Link>
          </Button>
        )}

        {/* Report New */}
        <Button asChild className="w-full sm:w-auto">
          <Link to="/incidents/report" className="gap-2">
            <Plus className="h-4 w-4" />
            {t('incidents.reportIncident')}
          </Link>
        </Button>
      </div>
    </div>
  );
}
