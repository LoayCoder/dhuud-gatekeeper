
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Badge {
    id: string;
    name: string;
    description: string;
    icon: string; // Emoji or Lucide icon name
    unlocked: boolean;
    progress: number;
    totalRequired: number;
    category: 'reporter' | 'action' | 'guardian';
    points: number;
    unlockedAt?: string;
}

export interface GamificationStats {
    level: number;
    totalPoints: number;
    nextLevelPoints: number;
    badges: Badge[];
    recentHistory: {
        action: string;
        points: number;
        date: string;
    }[];
    rank: {
        company: number | string;
        department: number | string;
    };
}

export function useGamification() {
    const { user, profile } = useAuth();
    const tenantId = profile?.tenant_id;

    return useQuery({
        queryKey: ['gamification-stats', tenantId, user?.id],
        queryFn: async (): Promise<GamificationStats> => {
            if (!tenantId || !user?.id) throw new Error('User not authenticated');

            // 1. Fetch User Activity Counts
            // Incidents Reported
            const { count: incidentsCount } = await supabase
                .from('incidents')
                .select('*', { count: 'exact', head: true })
                .eq('tenant_id', tenantId)
                .eq('reporter_id', user.id);

            // Actions Closed/Verified
            const { count: actionsCount } = await supabase
                .from('corrective_actions')
                .select('*', { count: 'exact', head: true })
                .eq('tenant_id', tenantId)
                .eq('assigned_to', user.id)
                .eq('status', 'closed');

            // Observations Reported (Assuming they are incidents with type 'observation' OR separate table)
            // Checking 'observations' table first as per previous context
            const { count: observationsCount } = await (supabase as unknown)
                .from('observations')
                .select('*', { count: 'exact', head: true })
                .eq('tenant_id', tenantId)
                .eq('created_by', user.id);

            // 2. Calculate Points
            // Weightage: Incident=50, Action=20, Observation=10
            const points = (incidentsCount || 0) * 50 + (actionsCount || 0) * 20 + (observationsCount || 0) * 10;

            // 3. Determine Level
            // Level 1: 0-200, Level 2: 200-500, Level 3: 500-1000...
            let level = 1;
            let nextLevelPoints = 200;
            if (points >= 1000) { level = 5; nextLevelPoints = 2000; }
            else if (points >= 500) { level = 4; nextLevelPoints = 1000; }
            else if (points >= 300) { level = 3; nextLevelPoints = 500; }
            else if (points >= 100) { level = 2; nextLevelPoints = 300; }

            // 4. Badges Logic
            const totalReports = (incidentsCount || 0) + (observationsCount || 0);

            const badges: Badge[] = [
                {
                    id: 'vigilant_recruit',
                    name: 'Vigilant Recruit',
                    description: 'Your first step into the line of defense.',
                    icon: '🛡️',
                    category: 'reporter',
                    points: 10,
                    unlocked: totalReports > 0,
                    progress: totalReports,
                    totalRequired: 1
                },
                {
                    id: 'eagle_eye_scout',
                    name: 'Eagle Eye Scout',
                    description: 'Nothing escapes your watch. 5 hazards neutralized.',
                    icon: '🦅',
                    category: 'guardian',
                    points: 50,
                    unlocked: (observationsCount || 0) >= 5,
                    progress: observationsCount || 0,
                    totalRequired: 5
                },
                {
                    id: 'task_force_hero',
                    name: 'Task Force Hero',
                    description: 'Taking decisive action to eliminate threats.',
                    icon: '⚔️',
                    category: 'action',
                    points: 100,
                    unlocked: (actionsCount || 0) >= 3,
                    progress: actionsCount || 0,
                    totalRequired: 3
                },
                {
                    id: 'sentinel_commander',
                    name: 'Sentinel Commander',
                    description: 'The highest honor for unwavering protection.',
                    icon: '🎖️',
                    category: 'guardian',
                    points: 500,
                    unlocked: (incidentsCount || 0) >= 10,
                    progress: incidentsCount || 0,
                    totalRequired: 10
                },
                {
                    id: 'storm_unit',
                    name: 'Storm Unit',
                    description: 'Strike fast, strike hard. Efficiency personified.',
                    icon: '🌩️',
                    category: 'action',
                    points: 200,
                    unlocked: (actionsCount || 0) >= 10,
                    progress: actionsCount || 0,
                    totalRequired: 10
                },
                {
                    id: 'iron_shield',
                    name: 'Iron Shield',
                    description: 'An impenetrable defense against hazards.',
                    icon: '🛡️',
                    category: 'guardian',
                    points: 300,
                    unlocked: (observationsCount || 0) >= 20,
                    progress: observationsCount || 0,
                    totalRequired: 20
                },
                {
                    id: 'war_veteran',
                    name: 'War Veteran',
                    description: 'Battle-hardened dedication to safety.',
                    icon: '🎗️',
                    category: 'reporter',
                    points: 500,
                    unlocked: totalReports >= 50,
                    progress: totalReports,
                    totalRequired: 50
                },
                {
                    id: 'elite_commando',
                    name: 'Elite Commando',
                    description: 'Special forces level of problem solving.',
                    icon: '🔫',
                    category: 'action',
                    points: 1000,
                    unlocked: (actionsCount || 0) >= 25,
                    progress: actionsCount || 0,
                    totalRequired: 25
                },
                {
                    id: 'legendary_guardian',
                    name: 'Legendary Guardian',
                    description: 'A living legend in the safety corps.',
                    icon: '🦁',
                    category: 'guardian',
                    points: 1500,
                    unlocked: points >= 1000,
                    progress: points,
                    totalRequired: 1000
                },
                {
                    id: 'the_gatekeeper',
                    name: 'The Gatekeeper',
                    description: 'The ultimate protector of the realm.',
                    icon: '🏰',
                    category: 'guardian',
                    points: 2000,
                    unlocked: points >= 2000,
                    progress: points,
                    totalRequired: 2000
                }
            ];

            // 5. Recent History (Mocked for now, or could fetch recent created_at items)
            // Fetching distinct recent items could be complex, keeping simpler for now
            const recentHistory = [
                { action: 'Daily Login', points: 5, date: new Date().toISOString() }
            ];
            if ((observationsCount || 0) > 0) {
                recentHistory.push({ action: 'Reported Observation', points: 10, date: new Date().toISOString() });
            }

            return {
                level,
                totalPoints: points,
                nextLevelPoints,
                badges,
                recentHistory,
                rank: {
                    company: Math.max(1, 15 - Math.floor(points / 100)), // Mock rank
                    department: Math.max(1, 5 - Math.floor(points / 200)) // Mock rank
                }
            };
        },
        enabled: !!tenantId && !!user?.id,
        staleTime: 60000 // 1 minute
    });
}
