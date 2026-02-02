import { useState, useEffect } from 'react';

interface VersionInfo {
  version: string;
  buildDate: string;
  publishedAt?: string;
  releaseNotes: string[];
  priority: 'normal' | 'important' | 'critical';
}

const PENDING_RELEASE_NOTES_KEY = 'app-pending-release-notes';

/**
 * Hook to fetch version info directly from version.json
 * Independent of update detection - used for "What's New" dialog
 */
export function useVersionInfo() {
  const [version, setVersion] = useState<string>('');
  const [releaseNotes, setReleaseNotes] = useState<string[]>([]);
  const [buildDate, setBuildDate] = useState<string>('');
  const [publishedAt, setPublishedAt] = useState<string>('');
  const [priority, setPriority] = useState<'normal' | 'important' | 'critical'>('normal');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchVersionInfo = async () => {
      try {
        // First check if there are pending release notes from a recent update
        const pendingNotes = localStorage.getItem(PENDING_RELEASE_NOTES_KEY);
        if (pendingNotes) {
          try {
            const parsed = JSON.parse(pendingNotes);
            if (parsed.releaseNotes && parsed.version) {
              setVersion(parsed.version);
              setReleaseNotes(parsed.releaseNotes);
              setBuildDate(parsed.buildDate || '');
              setPublishedAt(parsed.publishedAt || '');
              setPriority(parsed.priority || 'normal');
              // Clear pending notes after reading
              localStorage.removeItem(PENDING_RELEASE_NOTES_KEY);
              setIsLoading(false);
              return;
            }
          } catch (e) {
            // Ignore parse errors
          }
        }

        // Fetch current version info
        const response = await fetch(`/version.json?_=${Date.now()}`, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' }
        });

        if (response.ok) {
          const versionInfo: VersionInfo = await response.json();
          setVersion(versionInfo.version);
          setReleaseNotes(versionInfo.releaseNotes || []);
          setBuildDate(versionInfo.buildDate || '');
          setPublishedAt(versionInfo.publishedAt || '');
          setPriority(versionInfo.priority || 'normal');
        }
      } catch (error) {
        console.error('[VersionInfo] Failed to fetch:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchVersionInfo();
  }, []);

  return {
    version,
    releaseNotes,
    buildDate,
    publishedAt,
    priority,
    isLoading,
  };
}
