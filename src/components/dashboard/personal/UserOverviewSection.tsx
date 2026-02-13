import { ReactNode } from 'react';
import { SectionHeader } from '@/components/ui/section-header';

interface UserOverviewSectionProps {
    title: string;
    children: ReactNode;
    className?: string;
}

export function UserOverviewSection({ title, children, className }: UserOverviewSectionProps) {
    return (
        <section className={`space-y-4 ${className || ''}`}>
            <SectionHeader title={title} />
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {children}
            </div>
        </section>
    );
}
