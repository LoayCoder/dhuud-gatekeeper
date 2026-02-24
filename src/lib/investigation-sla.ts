import { differenceInDays, differenceInHours, parseISO } from 'date-fns';
import { SeverityLevelV2 } from './hsse-severity-levels';

export type SLAStatus = 'green' | 'yellow' | 'red';

export interface SLAResult {
    totalDays: number;
    daysUsed: number;
    daysRemaining: number;
    hoursRemaining: number;
    status: SLAStatus;
    deadlineDate: Date;
    isOverdue: boolean;
    label: string;
}

export function calculateInvestigationSLA(
    createdAt: string,
    severityLevel?: SeverityLevelV2 | string | null
): SLAResult {
    const createdDate = typeof createdAt === 'string' ? parseISO(createdAt) : new Date(createdAt);
    const now = new Date();

    // Determine SLA rules
    // Level 4 & 5 have a 14-day SLA, others have 30 days. Fallback to 30.
    let isHighSeverity = false;
    if (severityLevel) {
        const levelStr = severityLevel.toString().toLowerCase();
        isHighSeverity = levelStr.includes('4') || levelStr.includes('5') || levelStr.includes('fatal') || levelStr.includes('major');
    }

    const totalDays = isHighSeverity ? 14 : 30;
    const label = isHighSeverity ? `Level 4-5 SLA: 14 days` : `Investigation SLA: 30 days`;

    const deadlineDate = new Date(createdDate.getTime() + totalDays * 24 * 60 * 60 * 1000);

    const daysUsed = differenceInDays(now, createdDate);
    const totalHoursDifference = differenceInHours(deadlineDate, now);
    const daysRemaining = Math.floor(totalHoursDifference / 24);
    const hoursRemaining = totalHoursDifference % 24;

    const isOverdue = totalHoursDifference < 0;

    let status: SLAStatus = 'green';
    if (isOverdue || daysRemaining < 3) {
        status = 'red';
    } else if (daysRemaining <= 7) {
        status = 'yellow';
    }

    return {
        totalDays,
        daysUsed: Math.max(0, daysUsed),
        daysRemaining,
        hoursRemaining,
        status,
        deadlineDate,
        isOverdue,
        label
    };
}
