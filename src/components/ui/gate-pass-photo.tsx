import { useState, useCallback } from "react";
import { ImageIcon, Loader2, RefreshCw, Expand } from "lucide-react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface GatePassPhotoProps {
  signedUrl: string | null | undefined;
  alt: string;
  className?: string;
  /** Enable click-to-enlarge lightbox */
  lightbox?: boolean;
  /** Called when image fails and user clicks retry */
  onRetry?: () => void;
}

/**
 * Reusable photo display component for gate pass photos.
 * Shows skeleton while loading, placeholder on error, and optional lightbox.
 */
export function GatePassPhoto({
  signedUrl,
  alt,
  className,
  lightbox = true,
  onRetry,
}: GatePassPhotoProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retried, setRetried] = useState(false);

  const handleLoad = useCallback(() => {
    setLoading(false);
    setError(false);
  }, []);

  const handleError = useCallback(() => {
    setLoading(false);
    setError(true);
    // Auto-retry once on 403/expired
    if (!retried && onRetry) {
      setRetried(true);
      onRetry();
    }
  }, [retried, onRetry]);

  if (!signedUrl) {
    return (
      <div className={cn("bg-muted flex items-center justify-center rounded-lg", className)}>
        <ImageIcon className="h-5 w-5 text-muted-foreground" />
      </div>
    );
  }

  const imageContent = (
    <div className={cn("relative overflow-hidden rounded-lg bg-muted group", className)}>
      {loading && (
        <Skeleton className="absolute inset-0 rounded-lg" />
      )}
      {error ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
          <ImageIcon className="h-5 w-5 text-muted-foreground" />
          {onRetry && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setError(false);
                setLoading(true);
                onRetry();
              }}
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              <RefreshCw className="h-3 w-3" />
              Retry
            </button>
          )}
        </div>
      ) : (
        <>
          <img
            src={signedUrl}
            alt={alt}
            className={cn(
              "w-full h-full object-cover transition-opacity",
              loading ? "opacity-0" : "opacity-100"
            )}
            onLoad={handleLoad}
            onError={handleError}
          />
          {lightbox && !loading && (
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
              <Expand className="text-white drop-shadow-md h-5 w-5" />
            </div>
          )}
        </>
      )}
    </div>
  );

  if (!lightbox || error) {
    return imageContent;
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="cursor-pointer text-start w-full h-full">
          {imageContent}
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl p-0 overflow-hidden bg-black/90 border-none sm:rounded-lg">
        <div className="relative w-full h-full flex items-center justify-center p-2 sm:p-4">
          <img
            src={signedUrl}
            alt={alt}
            className="max-w-full max-h-[85vh] object-contain rounded-md"
          />
          <div className="absolute bottom-4 left-0 right-0 text-center pointer-events-none">
            <span className="inline-block bg-black/50 text-white px-3 py-1 rounded-full text-sm backdrop-blur-sm">
              {alt}
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
