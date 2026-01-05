import { useEffect, useRef } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { DHUUD_APP_ICON } from '@/constants/branding';

/**
 * Dynamic PWA Manifest Hook
 * 
 * Generates a tenant-specific PWA manifest and updates the DOM dynamically.
 * This ensures each tenant gets their own branded PWA with:
 * - App name format: "HSSE – [Tenant Name]"
 * - Tenant-specific icons
 * - Correct branding isolation
 */
export function useDynamicManifest() {
  const { tenantName, activeAppIconUrl, activeSidebarIconUrl, activePrimaryColor } = useTheme();
  const blobUrlRef = useRef<string | null>(null);
  const metaTagsUpdatedRef = useRef(false);

  useEffect(() => {
    // Clean up previous blob URL
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }

    // Don't generate manifest if tenant data isn't loaded yet
    if (!tenantName) return;

    // Use tenant icon or fall back to default
    const iconUrl = activeAppIconUrl || activeSidebarIconUrl || DHUUD_APP_ICON;
    
    // Format: "HSSE – [Tenant Name]"
    const appName = `HSSE – ${tenantName}`;
    const shortName = tenantName.length > 12 ? `HSSE – ${tenantName.slice(0, 10)}...` : appName;

    // Generate dynamic manifest
    const manifest = {
      name: appName,
      short_name: shortName,
      description: `${tenantName} Health, Safety, Security & Environment Platform`,
      start_url: '/',
      display: 'standalone',
      orientation: 'portrait',
      background_color: '#ffffff',
      theme_color: activePrimaryColor ? `hsl(${activePrimaryColor})` : '#1a365d',
      icons: [
        {
          src: iconUrl,
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any maskable'
        },
        {
          src: iconUrl,
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any maskable'
        }
      ],
      shortcuts: [
        {
          name: 'Dashboard',
          short_name: 'Dashboard',
          description: 'Go to Dashboard',
          url: '/',
          icons: [{ src: iconUrl, sizes: '192x192' }]
        },
        {
          name: 'Report Incident',
          short_name: 'Report',
          description: 'Report a new incident',
          url: '/incidents/report',
          icons: [{ src: iconUrl, sizes: '192x192' }]
        }
      ],
      launch_handler: {
        client_mode: ['navigate-existing', 'auto']
      }
    };

    // Create blob URL for the manifest
    const blob = new Blob([JSON.stringify(manifest)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    blobUrlRef.current = url;

    // Update manifest link in head
    let link = document.querySelector('link[rel="manifest"]') as HTMLLinkElement | null;
    if (link) {
      link.href = url;
    } else {
      link = document.createElement('link');
      link.rel = 'manifest';
      link.href = url;
      document.head.appendChild(link);
    }

    // Update iOS and other meta tags for PWA
    updateMetaTag('apple-mobile-web-app-title', appName);
    updateMetaTag('application-name', appName);
    
    // Update apple-touch-icon
    updateAppleTouchIcon(iconUrl);

    metaTagsUpdatedRef.current = true;

    return () => {
      // Cleanup blob URL on unmount
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, [tenantName, activeAppIconUrl, activeSidebarIconUrl, activePrimaryColor]);
}

/**
 * Updates or creates a meta tag with the given name and content
 */
function updateMetaTag(name: string, content: string) {
  let meta = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
  if (meta) {
    meta.content = content;
  } else {
    meta = document.createElement('meta');
    meta.name = name;
    meta.content = content;
    document.head.appendChild(meta);
  }
}

/**
 * Updates the apple-touch-icon link with the tenant icon
 */
function updateAppleTouchIcon(iconUrl: string) {
  // Update all apple-touch-icon links
  const touchIcons = document.querySelectorAll('link[rel="apple-touch-icon"]');
  
  if (touchIcons.length > 0) {
    touchIcons.forEach((icon) => {
      (icon as HTMLLinkElement).href = iconUrl;
    });
  } else {
    // Create one if it doesn't exist
    const link = document.createElement('link');
    link.rel = 'apple-touch-icon';
    link.href = iconUrl;
    document.head.appendChild(link);
  }
}
