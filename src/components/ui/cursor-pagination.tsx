import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ChevronsLeft, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

interface CursorPaginationProps {
  currentPage: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  isLoading: boolean;
  onNextPage: () => void;
  onPreviousPage: () => void;
  onFirstPage: () => void;
  totalEstimate?: number | null;
  pageSize?: number;
  className?: string;
}

export function CursorPagination({
  currentPage,
  hasNextPage,
  hasPreviousPage,
  isLoading,
  onNextPage,
  onPreviousPage,
  onFirstPage,
  totalEstimate,
  pageSize = 25,
  className = "",
}: CursorPaginationProps) {
  const { t } = useTranslation();

  const estimatedTotalPages = totalEstimate 
    ? Math.ceil(totalEstimate / pageSize) 
    : null;

  return (
    <div className={`flex items-center justify-between px-4 py-3 border-t ${className}`}>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {totalEstimate !== null && (
          <span>
            {t("pagination.showing", "Page")} {currentPage}
            {estimatedTotalPages && (
              <span> {t("pagination.of", "of")} ~{estimatedTotalPages}</span>
            )}
            <span className="mx-2">•</span>
            <span>~{totalEstimate.toLocaleString()} {t("pagination.total", "total")}</span>
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        {isLoading && (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={onFirstPage}
          disabled={!hasPreviousPage || isLoading}
          className="gap-1"
        >
          <ChevronsLeft className="h-4 w-4" />
          {t("pagination.first", "First")}
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={onPreviousPage}
          disabled={!hasPreviousPage || isLoading}
          className="gap-1"
        >
          <ChevronLeft className="h-4 w-4" />
          {t("pagination.previous", "Previous")}
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={onNextPage}
          disabled={!hasNextPage || isLoading}
          className="gap-1"
        >
          {t("pagination.next", "Next")}
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
