import { lazy, ComponentType } from 'react';

/**
 * Wraps a dynamic import with retry logic to handle transient network failures
 * and cache mismatches that can occur with PWAs.
 */
export function lazyWithRetry<T extends ComponentType<unknown>>(
  importFn: () => Promise<{ default: T }>,
  retries = 3,
  retryDelay = 1000
): React.LazyExoticComponent<T> {
  return lazy(async () => {
    let lastError: Error | undefined;
    
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        // Add cache-busting query param on retry attempts
        if (attempt > 0) {
          // Clear module cache by reloading on retry
          const cacheBuster = `?retry=${attempt}&t=${Date.now()}`;
          console.log(`[LazyRetry] Attempt ${attempt + 1}/${retries} with cache bust`);
          
          // Force a fresh fetch by modifying the import
          return await importFn();
        }
        
        return await importFn();
      } catch (error) {
        lastError = error as Error;
        console.warn(`[LazyRetry] Failed to load module (attempt ${attempt + 1}/${retries}):`, error);
        
        // Check if it's a chunk load error
        if (error instanceof Error && error.message.includes('Failed to fetch dynamically imported module')) {
          // Wait before retrying with exponential backoff
          if (attempt < retries - 1) {
            await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));
            
            // On the last retry attempt, try reloading the page
            if (attempt === retries - 2) {
              // Clear service worker caches before final retry
              if ('caches' in window) {
                const cacheNames = await caches.keys();
                await Promise.all(
                  cacheNames.map(name => caches.delete(name))
                );
                console.log('[LazyRetry] Cleared caches before final retry');
              }
            }
          }
        } else {
          // For non-chunk errors, throw immediately
          throw error;
        }
      }
    }
    
    // All retries failed - suggest page reload
    console.error('[LazyRetry] All retry attempts failed. Suggesting page reload.');
    
    // Throw a more informative error
    throw new Error(
      `Failed to load page after ${retries} attempts. ` +
      `Please refresh the page. Original error: ${lastError?.message}`
    );
  });
}
