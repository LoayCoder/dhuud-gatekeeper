import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import {
  LayoutDashboard,
  FileSearch,
  Users,
  Search,
  ListChecks,
  HeartPulse,
  Wrench,
  Scale,
  Leaf
} from "lucide-react";
import {
  EvidenceManager,
  WitnessPanel,
  RCAPanel,
  ActionsPanel,
  OverviewPanel,
  SubmitInvestigationCard,
  CauseCoverageIndicator,
  InvestigatorViolationIdentificationCard,
  InvestigatorViolationSubmissionCard
} from '@/features/investigation';
import { InjuryPanel } from '@/features/investigation';
import { ClinicUserAssignmentCard } from '@/features/investigation';
import { PropertyDamagePanel } from '@/features/investigation';
import { TechEvaluatorAssignmentCard } from '@/features/investigation';
import { EnvironmentalImpactPanel } from '@/features/investigation';
import { EnvironmentalExpertAssignmentCard } from '@/features/investigation';
import { SpecialistDataReviewCard } from '@/features/investigation';

interface InvestigationTabsContentProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isTabLocked: (tab: string) => boolean;
  selectedIncidentId: string;
  selectedIncident: any;
  investigation: any;
  handleRefresh: () => void;
  canApprove: boolean;
  startInvestigation: () => void;
  unlockedTabs: string[];
  completedTabs: string[];
  investigationAllowed: boolean | undefined;
  editAccess: any;
  showActionDialog: boolean;
  setShowActionDialog: (show: boolean) => void;
  incidentData: any;
  isAssignedClinicUser: boolean;
  canReviewSpecialistData: boolean;
  isAssignedTechEvaluator: boolean;
  isAssignedEnvironmentalExpert: boolean;
  canAccessGovernance: boolean;
  status: string | undefined;
}

export function InvestigationTabsContent({
  activeTab,
  setActiveTab,
  isTabLocked,
  selectedIncidentId,
  selectedIncident,
  investigation,
  handleRefresh,
  canApprove,
  startInvestigation,
  unlockedTabs,
  completedTabs,
  investigationAllowed,
  editAccess,
  showActionDialog,
  setShowActionDialog,
  incidentData,
  isAssignedClinicUser,
  canReviewSpecialistData,
  isAssignedTechEvaluator,
  isAssignedEnvironmentalExpert,
  canAccessGovernance,
  status
}: InvestigationTabsContentProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-6">
      {/* Sticky Jump Navigation */}
      <div className="sticky top-[4.5rem] z-30 bg-background/95 backdrop-blur-md border rounded-xl shadow-sm px-2 py-2 overflow-x-auto shadow-sm">
        <nav className="flex space-x-1 rtl:space-x-reverse min-w-max">
          <button
            onClick={() => {
              const el = document.getElementById('overview');
              const y = (el?.getBoundingClientRect().top || 0) + window.scrollY - 100;
              window.scrollTo({ top: y, behavior: 'smooth' });
              setActiveTab('overview');
            }}
            className={cn("px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2", activeTab === 'overview' ? "bg-primary text-primary-foreground shadow-sm" : "hover:bg-muted text-muted-foreground")}
          >
            <LayoutDashboard className="h-4 w-4" />
            <span className="hidden sm:inline font-medium">{t('investigation.tabs.overview', 'Overview')}</span>
          </button>

          {isTabLocked('evidence') && (
            <button onClick={() => { const el = document.getElementById('evidence'); const y = (el?.getBoundingClientRect().top || 0) + window.scrollY - 100; window.scrollTo({ top: y, behavior: 'smooth' }); setActiveTab('evidence'); }} className={cn("px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2", activeTab === 'evidence' ? "bg-primary text-primary-foreground shadow-sm" : "hover:bg-muted text-muted-foreground")}>
              <FileSearch className="h-4 w-4" /> Evidence
            </button>
          )}
          {isTabLocked('witnesses') && (
            <button onClick={() => { const el = document.getElementById('witnesses'); const y = (el?.getBoundingClientRect().top || 0) + window.scrollY - 100; window.scrollTo({ top: y, behavior: 'smooth' }); setActiveTab('witnesses'); }} className={cn("px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2", activeTab === 'witnesses' ? "bg-primary text-primary-foreground shadow-sm" : "hover:bg-muted text-muted-foreground")}>
              <Users className="h-4 w-4" /> Witnesses
            </button>
          )}
          {isTabLocked('rca') && (
            <button onClick={() => { const el = document.getElementById('rca'); const y = (el?.getBoundingClientRect().top || 0) + window.scrollY - 100; window.scrollTo({ top: y, behavior: 'smooth' }); setActiveTab('rca'); }} className={cn("px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2", activeTab === 'rca' ? "bg-primary text-primary-foreground shadow-sm" : "hover:bg-muted text-muted-foreground")}>
              <Search className="h-4 w-4" /> RCA
            </button>
          )}
          {isTabLocked('actions') && (
            <button onClick={() => { const el = document.getElementById('actions'); const y = (el?.getBoundingClientRect().top || 0) + window.scrollY - 100; window.scrollTo({ top: y, behavior: 'smooth' }); setActiveTab('actions'); }} className={cn("px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2", activeTab === 'actions' ? "bg-primary text-primary-foreground shadow-sm" : "hover:bg-muted text-muted-foreground")}>
              <ListChecks className="h-4 w-4" /> Actions
            </button>
          )}
          {selectedIncident?.has_injury && isTabLocked('injuries') && (
            <button onClick={() => { const el = document.getElementById('injuries'); const y = (el?.getBoundingClientRect().top || 0) + window.scrollY - 100; window.scrollTo({ top: y, behavior: 'smooth' }); setActiveTab('injuries'); }} className={cn("px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2", activeTab === 'injuries' ? "bg-primary text-primary-foreground shadow-sm" : "hover:bg-muted text-muted-foreground")}>
              <HeartPulse className="h-4 w-4" /> Injuries
            </button>
          )}
          {selectedIncident?.has_damage && isTabLocked('property-damage') && (
            <button onClick={() => { const el = document.getElementById('property-damage'); const y = (el?.getBoundingClientRect().top || 0) + window.scrollY - 100; window.scrollTo({ top: y, behavior: 'smooth' }); setActiveTab('property-damage'); }} className={cn("px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2", activeTab === 'property-damage' ? "bg-primary text-primary-foreground shadow-sm" : "hover:bg-muted text-muted-foreground")}>
              <Wrench className="h-4 w-4" /> Property Damage
            </button>
          )}
          {canAccessGovernance && isTabLocked('governance') && (
            <button onClick={() => { const el = document.getElementById('governance'); const y = (el?.getBoundingClientRect().top || 0) + window.scrollY - 100; window.scrollTo({ top: y, behavior: 'smooth' }); setActiveTab('governance'); }} className={cn("px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2", activeTab === 'governance' ? "bg-primary text-primary-foreground shadow-sm" : "hover:bg-muted text-muted-foreground")}>
              <Scale className="h-4 w-4" /> Governance
            </button>
          )}
        </nav>
      </div>

      <div className="space-y-12 pb-12 pt-4">
        <section id="overview" className="scroll-mt-32">
          <OverviewPanel
            incident={selectedIncident as any}
            investigation={investigation as any ?? null}
            onRefresh={handleRefresh}
            canApprove={canApprove}
            onStartInvestigation={startInvestigation}
            isStarted={unlockedTabs.length > 1}
            unlockedTabs={unlockedTabs}
            completedTabs={completedTabs}
          />
        </section>

        {investigationAllowed && isTabLocked('evidence') && (
          <section id="evidence" className="scroll-mt-32 pt-6 border-t border-border/40">
            <h3 className="text-xl font-semibold mb-6 flex items-center gap-2"><FileSearch className="h-5 w-5 text-primary" /> {t('investigation.tabs.evidence', 'Evidence')}</h3>
            <EvidenceManager
              incidentId={selectedIncidentId}
              incidentStatus={selectedIncident?.status as any}
              canEdit={editAccess?.canEdit as any}
            />
          </section>
        )}

        {investigationAllowed && isTabLocked('witnesses') && (
          <section id="witnesses" className="scroll-mt-32 pt-6 border-t border-border/40">
            <h3 className="text-xl font-semibold mb-6 flex items-center gap-2"><Users className="h-5 w-5 text-primary" /> {t('investigation.tabs.witnesses', 'Witnesses')}</h3>
            <WitnessPanel
              incidentId={selectedIncidentId}
              incident={selectedIncident as any}
              incidentStatus={selectedIncident?.status as any}
              canEdit={editAccess?.canEdit as any}
            />
          </section>
        )}

        {investigationAllowed && isTabLocked('rca') && (
          <section id="rca" className="scroll-mt-32 pt-6 border-t border-border/40">
            <h3 className="text-xl font-semibold mb-6 flex items-center gap-2"><Search className="h-5 w-5 text-primary" /> {t('investigation.tabs.rca', 'Root Cause Analysis')}</h3>
            <RCAPanel
              incidentId={selectedIncidentId}
              incidentStatus={selectedIncident?.status as any}
              incidentTitle={selectedIncident?.title as any}
              incidentDescription={selectedIncident?.description as any}
              incidentSeverity={selectedIncident?.severity as any}
              incidentEventType={selectedIncident?.event_type as any}
              canEdit={editAccess?.canEdit as any}
            />
          </section>
        )}

        {investigationAllowed && isTabLocked('actions') && (
          <section id="actions" className="scroll-mt-32 pt-6 border-t border-border/40 space-y-4">
            <h3 className="text-xl font-semibold mb-6 flex items-center gap-2"><ListChecks className="h-5 w-5 text-primary" /> {t('investigation.tabs.actions', 'Corrective Actions')}</h3>
            <CauseCoverageIndicator incidentId={selectedIncidentId} />
            <ActionsPanel
              incidentId={selectedIncidentId}
              incidentStatus={selectedIncident?.status as any}
              canEdit={editAccess?.canEdit as any}
              openDialogTrigger={showActionDialog}
              onDialogTriggered={() => setShowActionDialog(false)}
            />
            {editAccess?.canEdit && incidentData?.status === 'investigation_in_progress' && (
              <SubmitInvestigationCard
                incidentId={selectedIncidentId}
                onSubmitted={handleRefresh}
              />
            )}
          </section>
        )}

        {investigationAllowed && selectedIncident?.has_injury && isTabLocked('injuries') && (
          <section id="injuries" className="scroll-mt-32 pt-6 border-t border-border/40 space-y-4">
            <h3 className="text-xl font-semibold mb-6 flex items-center gap-2"><HeartPulse className="h-5 w-5 text-primary" /> {t('investigation.tabs.injuries', 'Injuries')}</h3>
            {incidentData && (
              <ClinicUserAssignmentCard
                incident={incidentData as any}
                onComplete={handleRefresh}
              />
            )}
            <InjuryPanel
              incidentId={selectedIncidentId}
              canEdit={editAccess?.canEdit as any}
            />
            <SpecialistDataReviewCard
              incidentId={selectedIncidentId}
              dataType="injury"
              canSubmit={isAssignedClinicUser}
              canReview={canReviewSpecialistData}
            />
          </section>
        )}

        {investigationAllowed && selectedIncident?.has_damage && isTabLocked('property-damage') && (
          <section id="property-damage" className="scroll-mt-32 pt-6 border-t border-border/40 space-y-4">
            <h3 className="text-xl font-semibold mb-6 flex items-center gap-2"><Wrench className="h-5 w-5 text-primary" /> {t('investigation.tabs.propertyDamage', 'Property Damage')}</h3>
            {incidentData && (
              <TechEvaluatorAssignmentCard
                incident={incidentData as any}
                onComplete={handleRefresh}
              />
            )}
            <PropertyDamagePanel
              incidentId={selectedIncidentId}
              canEdit={editAccess?.canEdit as any}
            />
            <SpecialistDataReviewCard
              incidentId={selectedIncidentId}
              dataType="property_damage"
              canSubmit={isAssignedTechEvaluator}
              canReview={canReviewSpecialistData}
            />
          </section>
        )}

        {/* Environmental Impact Tab Content */}
        {investigationAllowed && isTabLocked('environmental-impact') && (selectedIncident?.event_type === 'environmental' ||
          selectedIncident?.event_type === 'environment' ||
          ['oil_chemical_spill_land', 'spill_to_water', 'air_emission', 'soil_contamination',
            'waste_mismanagement', 'wildlife_impact', 'non_compliant_discharge'].includes(selectedIncident?.subtype || '')) && (
            <section id="environmental-impact" className="scroll-mt-32 pt-6 border-t border-border/40 space-y-4">
              <h3 className="text-xl font-semibold mb-6 flex items-center gap-2"><Leaf className="h-5 w-5 text-primary" /> {t('investigation.tabs.environmentalImpact', 'Environmental Impact')}</h3>
              {incidentData && (
                <EnvironmentalExpertAssignmentCard
                  incident={incidentData as any}
                  onComplete={handleRefresh}
                />
              )}
              <EnvironmentalImpactPanel
                incidentId={selectedIncidentId}
                canEdit={editAccess?.canEdit as any}
              />
              <SpecialistDataReviewCard
                incidentId={selectedIncidentId}
                dataType="environmental"
                canSubmit={isAssignedEnvironmentalExpert}
                canReview={canReviewSpecialistData}
              />
            </section>
          )}

        {canAccessGovernance && investigationAllowed && isTabLocked('governance') && (
          <section id="governance" className="scroll-mt-32 pt-6 border-t border-border/40 space-y-4">
            <h3 className="text-xl font-semibold mb-6 flex items-center gap-2"><Scale className="h-5 w-5 text-primary" /> {t('investigation.tabs.governance', 'Governance')}</h3>
            {status === 'investigation_in_progress' && (incidentData as any)?.related_contractor_company_id && investigation && (
              <>
                <InvestigatorViolationIdentificationCard
                  incident={incidentData as any}
                  investigation={investigation as any}
                  onComplete={handleRefresh}
                />
                <InvestigatorViolationSubmissionCard
                  incident={incidentData as any}
                  investigation={investigation as any}
                  onComplete={handleRefresh}
                />
              </>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
