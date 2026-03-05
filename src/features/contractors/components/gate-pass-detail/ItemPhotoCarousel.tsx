import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight, X, ZoomIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Photo {
  id: string;
  signedUrl: string | null;
  file_name: string;
}

interface ItemPhotoCarouselProps {
  photos: Photo[];
  className?: string;
}

export function ItemPhotoCarousel({ photos, className }: ItemPhotoCarouselProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === "rtl";
  const [currentIndex, setCurrentIndex] = useState(0);
  const [fullScreenPhoto, setFullScreenPhoto] = useState<string | null>(null);

  const validPhotos = photos.filter((p) => p.signedUrl);

  if (validPhotos.length === 0) {
    return null;
  }

  const goNext = () => {
    setCurrentIndex((prev) => (prev + 1) % validPhotos.length);
    if (navigator.vibrate) navigator.vibrate(5);
  };

  const goPrev = () => {
    setCurrentIndex((prev) => (prev - 1 + validPhotos.length) % validPhotos.length);
    if (navigator.vibrate) navigator.vibrate(5);
  };

  const handleSwipe = (e: React.TouchEvent) => {
    const touch = e.changedTouches[0];
    const startX = (e.target as HTMLElement).dataset.startX;
    if (!startX) return;

    const diff = touch.clientX - parseFloat(startX);
    if (Math.abs(diff) > 50) {
      if ((diff > 0 && !isRTL) || (diff < 0 && isRTL)) {
        goPrev();
      } else {
        goNext();
      }
    }
  };

  return (
    <>
      <div className={cn("relative group", className)}>
        {/* Main image */}
        <div
          className="relative aspect-video rounded-xl overflow-hidden bg-muted cursor-pointer"
          onClick={() => setFullScreenPhoto(validPhotos[currentIndex].signedUrl)}
          onTouchStart={(e) => {
            const touch = e.touches[0];
            (e.target as HTMLElement).dataset.startX = String(touch.clientX);
          }}
          onTouchEnd={handleSwipe}
        >
          <img
            src={validPhotos[currentIndex].signedUrl!}
            alt={validPhotos[currentIndex].file_name}
            className="w-full h-full object-cover"
          />
          
          {/* Zoom hint */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
            <div className="bg-black/60 rounded-full p-3">
              <ZoomIn className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        {/* Navigation arrows (desktop) */}
        {validPhotos.length > 1 && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="absolute start-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/50 text-white hover:bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:flex"
              onClick={(e) => {
                e.stopPropagation();
                goPrev();
              }}
            >
              <ChevronLeft className="h-5 w-5 rtl:rotate-180" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="absolute end-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/50 text-white hover:bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:flex"
              onClick={(e) => {
                e.stopPropagation();
                goNext();
              }}
            >
              <ChevronRight className="h-5 w-5 rtl:rotate-180" />
            </Button>
          </>
        )}

        {/* Dots indicator */}
        {validPhotos.length > 1 && (
          <div className="absolute bottom-3 start-1/2 -translate-x-1/2 flex gap-1.5">
            {validPhotos.map((_, index) => (
              <button
                key={index}
                className={cn(
                  "h-2 w-2 rounded-full transition-all",
                  index === currentIndex ? "bg-white w-4" : "bg-white/50"
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex(index);
                }}
              />
            ))}
          </div>
        )}

        {/* Photo count */}
        <div className="absolute top-3 end-3 px-2 py-1 rounded-full bg-black/50 text-white text-xs font-medium">
          {currentIndex + 1} / {validPhotos.length}
        </div>
      </div>

      {/* Thumbnails */}
      {validPhotos.length > 1 && (
        <div className="flex gap-2 mt-2 overflow-x-auto pb-1">
          {validPhotos.map((photo, index) => (
            <button
              key={photo.id}
              className={cn(
                "h-14 w-14 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all",
                index === currentIndex
                  ? "border-primary ring-2 ring-primary/20"
                  : "border-transparent opacity-60 hover:opacity-100"
              )}
              onClick={() => setCurrentIndex(index)}
            >
              <img
                src={photo.signedUrl!}
                alt={photo.file_name}
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}

      {/* Fullscreen view */}
      {fullScreenPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
          onClick={() => setFullScreenPhoto(null)}
        >
          <button
            className="absolute top-4 end-4 h-12 w-12 rounded-full bg-white/10 flex items-center justify-center"
            onClick={() => setFullScreenPhoto(null)}
            style={{ top: "max(1rem, env(safe-area-inset-top))" }}
          >
            <X className="h-6 w-6 text-white" />
          </button>
          <img
            src={fullScreenPhoto}
            alt=""
            className="max-h-full max-w-full object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
          
          {/* Navigation in fullscreen */}
          {validPhotos.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="absolute start-4 top-1/2 -translate-y-1/2 h-14 w-14 rounded-full bg-white/10 text-white hover:bg-white/20"
                onClick={(e) => {
                  e.stopPropagation();
                  goPrev();
                  setFullScreenPhoto(validPhotos[(currentIndex - 1 + validPhotos.length) % validPhotos.length].signedUrl);
                }}
              >
                <ChevronLeft className="h-8 w-8 rtl:rotate-180" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="absolute end-4 top-1/2 -translate-y-1/2 h-14 w-14 rounded-full bg-white/10 text-white hover:bg-white/20"
                onClick={(e) => {
                  e.stopPropagation();
                  goNext();
                  setFullScreenPhoto(validPhotos[(currentIndex + 1) % validPhotos.length].signedUrl);
                }}
              >
                <ChevronRight className="h-8 w-8 rtl:rotate-180" />
              </Button>
            </>
          )}
        </div>
      )}
    </>
  );
}
