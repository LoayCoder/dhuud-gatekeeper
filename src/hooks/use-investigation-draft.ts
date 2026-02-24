import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

interface DraftConfig<T> {
    incidentId: string | null;
    tabKey: string;
    autoSaveIntervalMs?: number;
}

export function useInvestigationDraft<T>(config: DraftConfig<T>, defaultData: T) {
    const { incidentId, tabKey, autoSaveIntervalMs = 30000 } = config;
    const { t } = useTranslation();

    const [data, setData] = useState<T>(defaultData);
    const [isDirty, setIsDirty] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);

    const storageKey = `investigation_draft_${incidentId}_${tabKey}`;

    // Load from local storage on mount
    useEffect(() => {
        if (!incidentId) return;

        try {
            const stored = localStorage.getItem(storageKey);
            if (stored) {
                const parsed = JSON.parse(stored);
                if (parsed && parsed.data) {
                    setData(parsed.data);
                    if (parsed.timestamp) {
                        setLastSaved(new Date(parsed.timestamp));
                    }
                }
            }
        } catch (error) {
            console.error('Failed to load draft:', error);
        }
    }, [incidentId, storageKey]);

    // Save to local storage
    const saveDraft = useCallback((draftData: T = data, silent = false) => {
        if (!incidentId || !isDirty) return;

        try {
            const draft = {
                data: draftData,
                timestamp: new Date().toISOString(),
            };
            localStorage.setItem(storageKey, JSON.stringify(draft));
            setLastSaved(new Date());
            setIsDirty(false);

            if (!silent) {
                toast.success(t('investigation.draftSaved', 'Draft saved automatically'));
            }
        } catch (error) {
            console.error('Failed to save draft:', error);
            if (!silent) {
                toast.error(t('investigation.draftSaveError', 'Failed to save draft'));
            }
        }
    }, [incidentId, storageKey, data, isDirty, t]);

    // Setup auto-save interval
    useEffect(() => {
        if (!isDirty || !incidentId) return;

        const timer = setTimeout(() => {
            saveDraft(data, true);
        }, autoSaveIntervalMs);

        return () => clearTimeout(timer);
    }, [data, isDirty, autoSaveIntervalMs, saveDraft, incidentId]);

    // Handle beforeunload to warn user of unsaved changes
    useEffect(() => {
        if (!isDirty) return;

        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            e.preventDefault();
            e.returnValue = ''; // Required for generic browser warning
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isDirty]);

    const clearDraft = useCallback(() => {
        if (!incidentId) return;
        localStorage.removeItem(storageKey);
        setIsDirty(false);
        setLastSaved(null);
    }, [incidentId, storageKey]);

    const updateData = useCallback((newData: Partial<T> | ((prev: T) => T)) => {
        setData((prev) => {
            const updated = typeof newData === 'function' ? (newData as Function)(prev) : { ...prev, ...newData };
            return updated;
        });
        setIsDirty(true);
    }, []);

    return {
        data,
        updateData,
        isDirty,
        lastSaved,
        saveDraft,
        clearDraft,
    };
}
