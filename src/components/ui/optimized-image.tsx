import { useState } from 'react';
import { cn } from '@/lib/utils';

interface OptimizedImageProps {
  src: string;
  webpSrc?: string;
  alt: string;
  className?: string;
  sizes?: string;
  loading?: 'lazy' | 'eager';
  fetchPriority?: 'high' | 'low' | 'auto';
}

/**
 * Optimized image component with WebP support and lazy loading
 * Falls back to original format if WebP is not supported
 */
export function OptimizedImage({
  src,
  webpSrc,
  alt,
  className,
  sizes = '100vw',
  loading = 'lazy',
  fetchPriority = 'auto',
}: OptimizedImageProps) {
  const [hasError, setHasError] = useState(false);

  // If WebP fails or isn't provided, fall back to original
  if (hasError || !webpSrc) {
    return (
      <img
        src={src}
        alt={alt}
        className={cn(className)}
        loading={loading}
        fetchPriority={fetchPriority}
        decoding="async"
      />
    );
  }

  return (
    <picture>
      <source srcSet={webpSrc} type="image/webp" />
      <img
        src={src}
        alt={alt}
        className={cn(className)}
        loading={loading}
        fetchPriority={fetchPriority}
        decoding="async"
        onError={() => setHasError(true)}
      />
    </picture>
  );
}

/**
 * Hero image component for auth pages with gradient overlay
 */
interface AuthHeroImageProps {
  className?: string;
  title?: string;
  subtitle?: string;
}

export function AuthHeroImage({ className, title, subtitle }: AuthHeroImageProps) {
  return (
    <div className={cn("relative hidden w-1/2 lg:block", className)}>
      <picture>
        {/* WebP for modern browsers */}
        <source
          srcSet="/images/industrial-safety.webp"
          type="image/webp"
        />
        {/* Fallback to JPG */}
        <img
          src="/images/industrial-safety.jpg"
          alt="Industrial Safety"
          className="h-full w-full object-cover"
          loading="lazy"
          decoding="async"
          fetchPriority="low"
        />
      </picture>
      <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-black/40" />
      {(title || subtitle) && (
        <div className="absolute bottom-8 left-8 right-8 text-white">
          {title && <h1 className="mb-2 text-4xl font-bold">{title}</h1>}
          {subtitle && <p className="text-lg text-white/90">{subtitle}</p>}
        </div>
      )}
    </div>
  );
}
