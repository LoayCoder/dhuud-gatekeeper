import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { IncidentSummarySection } from './IncidentSummarySection';
import { IncidentReporterInfo } from './IncidentReporterInfo';
import { IncidentInvestigationTab } from './IncidentInvestigationTab';
import { IncidentActionsTab } from './IncidentActionsTab';
import { AuditLogPanel } from '@/components/investigation/AuditLogPanel';

interface IncidentDetailsLayoutProps {
    incident: any;
    currentOwner?: { role: string; name: string | null } | null;
    isPrinting?: boolean;
}

export function IncidentDetailsLayout({ incident, currentOwner, isPrinting }: IncidentDetailsLayoutProps) {
    const { t, i18n } = useTranslation();
    const direction = i18n.dir();
    const [activeSection, setActiveSection] = useState('summary');

    const sections = [
        { id: 'summary', label: t('incidents.tabs.summary', 'Summary') },
        { id: 'investigation', label: t('incidents.tabs.investigationActions', 'Investigation & Actions') },
        { id: 'reporter', label: t('incidents.tabs.reporter', 'Reporter Info') },
        { id: 'audit', label: t('incidents.tabs.audit', 'Audit Trail') },
    ];

    useEffect(() => {
        if (isPrinting) return;

        const handleScroll = () => {
            const scrollPosition = window.scrollY + 200; // Offset for sticky header

            for (const section of [...sections].reverse()) {
                const element = document.getElementById(section.id);
                if (element && element.offsetTop <= scrollPosition) {
                    setActiveSection(section.id);
                    break;
                }
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [isPrinting]);

    const scrollToSection = (id: string) => {
        const element = document.getElementById(id);
        if (element) {
            const y = element.getBoundingClientRect().top + window.scrollY - 100; // Offset for sticky header
            window.scrollTo({ top: y, behavior: 'smooth' });
            setActiveSection(id);
        }
    };

    if (isPrinting) {
        return (
            <div className="space-y-8" dir={direction}>
                <IncidentSummarySection incident={incident} />
                <div className="space-y-6">
                    <h2 className="text-xl font-bold border-b pb-2">{t('investigation.details', 'Investigation Details')}</h2>
                    <IncidentInvestigationTab incidentId={incident.id} />
                    <IncidentActionsTab incidentId={incident.id} />
                </div>
                <div className="space-y-6 grid grid-cols-2 gap-6">
                    <IncidentReporterInfo incident={incident} currentOwner={currentOwner} />
                </div>
                <AuditLogPanel incidentId={incident.id} />
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6" dir={direction}>
            {/* Sticky Jump Navigation */}
            <div className="sticky top-[4.5rem] z-30 bg-background/95 backdrop-blur-md border rounded-xl shadow-sm px-2 py-2 overflow-x-auto shadow-sm">
                <nav className="flex space-x-1 rtl:space-x-reverse min-w-max">
                    {sections.map((section) => (
                        <button
                            key={section.id}
                            onClick={() => scrollToSection(section.id)}
                            className={cn(
                                "px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap",
                                activeSection === section.id
                                    ? "bg-primary text-primary-foreground shadow-sm"
                                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                            )}
                        >
                            {section.label}
                        </button>
                    ))}
                </nav>
            </div>

            <div className="space-y-12 pb-12">
                {/* Summary Section */}
                <section id="summary" className="scroll-mt-32">
                    <IncidentSummarySection incident={incident} />
                </section>

                {/* Investigation & Actions Section */}
                {incident.event_type !== 'observation' ? (
                    <section id="investigation" className="scroll-mt-32 space-y-6">
                        <div className="flex items-center gap-4">
                            <h2 className="text-2xl font-semibold tracking-tight">
                                {t('incidents.tabs.investigationActions', 'Investigation & Actions')}
                            </h2>
                            <div className="h-px flex-1 bg-border/60" />
                        </div>
                        <IncidentInvestigationTab incidentId={incident.id} />
                        <IncidentActionsTab incidentId={incident.id} />
                    </section>
                ) : (
                    <section id="investigation" className="scroll-mt-32 space-y-6">
                        <div className="flex items-center gap-4">
                            <h2 className="text-2xl font-semibold tracking-tight">
                                {t('incidents.tabs.actions', 'Corrective Actions')}
                            </h2>
                            <div className="h-px flex-1 bg-border/60" />
                        </div>
                        <IncidentActionsTab incidentId={incident.id} />
                    </section>
                )}

                {/* Reporter & Assignment Section */}
                <section id="reporter" className="scroll-mt-32 space-y-6">
                    <div className="flex items-center gap-4">
                        <h2 className="text-2xl font-semibold tracking-tight">
                            {t('incidents.tabs.reporter', 'Reporter & Assignment Info')}
                        </h2>
                        <div className="h-px flex-1 bg-border/60" />
                    </div>
                    <IncidentReporterInfo incident={incident} currentOwner={currentOwner} />
                </section>

                {/* Audit Trail Section */}
                <section id="audit" className="scroll-mt-32 space-y-6">
                    <div className="flex items-center gap-4">
                        <h2 className="text-2xl font-semibold tracking-tight">
                            {t('incidents.tabs.audit', 'Audit Trail')}
                        </h2>
                        <div className="h-px flex-1 bg-border/60" />
                    </div>
                    <AuditLogPanel incidentId={incident.id} defaultOpen={true} />
                </section>
            </div>
        </div>
    );
}
