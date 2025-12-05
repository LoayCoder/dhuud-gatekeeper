import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

interface PaginationControlsProps {
  page: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  isLoading?: boolean;
  onNextPage: () => void;
  onPreviousPage: () => void;
  onFirstPage: () => void;
  onLastPage?: () => void;
  onPageSizeChange?: (size: number) => void;
  showPageSizeSelector?: boolean;
  className?: string;
}

export function PaginationControls({
  page,
  totalPages,
  totalCount,
  pageSize,
  hasNextPage,
  hasPreviousPage,
  isLoading,
  onNextPage,
  onPreviousPage,
  onFirstPage,
  onLastPage,
  onPageSizeChange,
  showPageSizeSelector = false,
  className = "",
}: PaginationControlsProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalCount);

  return (
    <div className={`flex items-center justify-between px-4 py-3 border-t ${className}`} dir={direction}>
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span>
          {t("pagination.showing", "Showing")} {from}-{to} {t("pagination.of", "of")} {totalCount.toLocaleString(i18n.language)}
        </span>
        {showPageSizeSelector && onPageSizeChange && (
          <div className="flex items-center gap-2">
            <span>{t("pagination.rowsPerPage", "Rows per page")}:</span>
            <Select value={pageSize.toString()} onValueChange={(v) => onPageSizeChange(parseInt(v))} dir={direction}>
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent dir={direction}>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        {isLoading && (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        )}

        <span className="text-sm text-muted-foreground">
          {t("pagination.page", "Page")} {page} {t("pagination.of", "of")} {totalPages}
        </span>

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={onFirstPage}
            disabled={!hasPreviousPage || isLoading}
          >
            <ChevronsLeft className="h-4 w-4 rtl:rotate-180" />
          </Button>

          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={onPreviousPage}
            disabled={!hasPreviousPage || isLoading}
          >
            <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
          </Button>

          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={onNextPage}
            disabled={!hasNextPage || isLoading}
          >
            <ChevronRight className="h-4 w-4 rtl:rotate-180" />
          </Button>

          {onLastPage && (
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={onLastPage}
              disabled={!hasNextPage || isLoading}
            >
              <ChevronsRight className="h-4 w-4 rtl:rotate-180" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
