## ADMIN
| # | File | Purpose | Fields | Uploads | Dynamic | Supabase | Cascading |
|---|------|---------|--------|---------|---------|----------|-----------|
| 1 | `components/support/AdminTicketDetail.tsx` | Manages AdminTicketDetail data | 4 | No | No | Yes | Yes |
| 2 | `features/admin/components/AddInspectionCategoryDialog.tsx` | Manages AddInspectionCategoryDialog data | 7 | No | No | No | No |
| 3 | `features/admin/components/AdminEditObservationDialog.tsx` | Manages AdminEditObservationDialog data | 5 | No | Yes | Yes | Yes |
| 4 | `features/admin/components/AssetHierarchyValidationEditor.tsx` | Manages AssetHierarchyValidationEditor data | 4 | No | No | No | Yes |
| 5 | `features/admin/components/EditCategoryDialog.tsx` | Manages EditCategoryDialog data | 4 | No | No | No | No |
| 6 | `features/admin/components/EditInspectionCategoryDialog.tsx` | Manages EditInspectionCategoryDialog data | 7 | No | No | No | No |
| 7 | `features/admin/components/id-cards/settings/DuplicateSettingsDialog.tsx` | Manages DuplicateSettingsDialog data | 5 | No | No | No | No |
| 8 | `features/admin/components/MajorEventsTab.tsx` | Manages MajorEventsTab data | 5 | No | No | No | No |
| 9 | `features/admin/components/SiteDetailDialog.tsx` | Manages SiteDetailDialog data | 4 | No | Yes | No | Yes |
| 10 | `pages/admin/InspectionTemplates.tsx` | Manages InspectionTemplates data | 4 | No | No | No | No |
| 11 | `pages/admin/InvestigationSLASettings.tsx` | Manages InvestigationSLASettings data | 4 | No | No | No | No |
| 12 | `pages/admin/ModuleManagement.tsx` | Manages ModuleManagement data | 6 | No | No | No | No |
| 13 | `pages/admin/PlatformSettings.tsx` | Manages PlatformSettings data | 5 | No | No | Yes | No |
| 14 | `pages/admin/ViolationSettings.tsx` | Manages ViolationSettings data | 6 | No | No | No | Yes |

## CONTRACTORS
| # | File | Purpose | Fields | Uploads | Dynamic | Supabase | Cascading |
|---|------|---------|--------|---------|---------|----------|-----------|
| 1 | `features/contractors/components/gate-pass-create/GatePassItemCard.tsx` | Manages GatePassItemCard data | 4 | Yes | Yes | No | No |
| 2 | `features/contractors/components/gate-pass-verification/ItemVerificationCard.tsx` | Manages ItemVerificationCard data | 4 | No | Yes | No | No |
| 3 | `features/contractors/components/GatePassResubmitDialog.tsx` | Manages GatePassResubmitDialog data | 4 | No | No | No | No |
| 4 | `features/contractors/components/SafetyOfficerCards.tsx` | Manages SafetyOfficerCards data | 5 | Yes | No | No | No |
| 5 | `features/contractors/components/SiteRepLockedCard.tsx` | Manages SiteRepLockedCard data | 6 | Yes | No | No | No |
| 6 | `features/contractors/components/WorkerFormDialog.tsx` | Manages WorkerFormDialog data | 5 | Yes | No | No | Yes |

## SECURITY
| # | File | Purpose | Fields | Uploads | Dynamic | Supabase | Cascading |
|---|------|---------|--------|---------|---------|----------|-----------|
| 1 | `features/security/components/EmergencySLAConfig.tsx` | Manages EmergencySLAConfig data | 4 | No | No | No | No |
| 2 | `features/security/components/GateLogTable.tsx` | Manages GateLogTable data | 4 | No | No | No | Yes |
| 3 | `features/security/components/GeofenceEscalationSettings.tsx` | Manages GeofenceEscalationSettings data | 7 | No | No | No | Yes |
| 4 | `features/security/components/GuardSiteAssignments.tsx` | Manages GuardSiteAssignments data | 5 | No | No | Yes | No |
| 5 | `features/security/components/SecurityReportExportDialog.tsx` | Manages SecurityReportExportDialog data | 5 | No | No | No | No |
| 6 | `features/security/components/ShiftHandoverForm.tsx` | Manages ShiftHandoverForm data | 7 | No | No | No | Yes |
| 7 | `features/security/components/VacationHandoverForm.tsx` | Manages VacationHandoverForm data | 6 | No | No | No | Yes |
| 8 | `pages/security/PatrolRoutes.tsx` | Manages PatrolRoutes data | 4 | No | No | No | No |
| 9 | `pages/security/SecurityShifts.tsx` | Manages SecurityShifts data | 6 | No | Yes | No | No |

## ASSETS
| # | File | Purpose | Fields | Uploads | Dynamic | Supabase | Cascading |
|---|------|---------|--------|---------|---------|----------|-----------|
| 1 | `features/assets/components/AssetPurchaseRequestDialog.tsx` | Manages AssetPurchaseRequestDialog data | 8 | No | Yes | No | No |
| 2 | `features/assets/components/depreciation/GenerateScheduleDialog.tsx` | Manages GenerateScheduleDialog data | 7 | No | No | No | Yes |
| 3 | `features/assets/components/LabelSettingsDialog.tsx` | Manages LabelSettingsDialog data | 4 | No | No | No | No |
| 4 | `features/assets/components/parts/PurchaseOrderDialog.tsx` | Manages PurchaseOrderDialog data | 8 | No | No | No | No |
| 5 | `features/assets/components/parts/StockAdjustmentDialog.tsx` | Manages StockAdjustmentDialog data | 4 | No | No | No | No |
| 6 | `pages/assets/AssetList.tsx` | Manages AssetList data | 6 | Yes | Yes | No | Yes |

## OTHER
| # | File | Purpose | Fields | Uploads | Dynamic | Supabase | Cascading |
|---|------|---------|--------|---------|---------|----------|-----------|
| 1 | `components/ai/settings/ObservationAISettingsTab.tsx` | Manages ObservationAISettingsTab data | 5 | No | No | No | No |
| 2 | `components/profile/ProfileForm.tsx` | Manages ProfileForm data | 6 | Yes | Yes | Yes | No |
| 3 | `components/tenants/TenantPublicFeaturesControl.tsx` | Manages TenantPublicFeaturesControl data | 4 | No | No | No | No |
| 4 | `features/incidents/components/inspections/sessions/CreateAreaSessionDialog.tsx` | Manages CreateAreaSessionDialog data | 9 | No | Yes | Yes | Yes |
| 5 | `features/incidents/components/inspections/sessions/CreateAuditSessionDialog.tsx` | Manages CreateAuditSessionDialog data | 8 | No | Yes | Yes | Yes |
| 6 | `features/incidents/components/inspections/sessions/CreateSessionDialog.tsx` | Manages CreateSessionDialog data | 5 | No | Yes | Yes | No |
| 7 | `features/incidents/components/inspections/sessions/FindingsPanel.tsx` | Manages FindingsPanel data | 4 | No | Yes | No | Yes |
| 8 | `features/incidents/components/inspections/TemplateItemBuilder.tsx` | Manages TemplateItemBuilder data | 10 | No | Yes | No | Yes |
| 9 | `features/incidents/components/listing/IncidentFilterPanel.tsx` | Manages IncidentFilterPanel data | 5 | No | Yes | No | Yes |
| 10 | `features/investigation/components/ConfidentialitySelector.tsx` | Manages ConfidentialitySelector data | 5 | No | No | No | Yes |
| 11 | `features/investigation/components/evidence/CCTVEntryForm.tsx` | Manages CCTVEntryForm data | 5 | No | No | No | No |
| 12 | `features/investigation/components/evidence/EvidenceUploadDialog.tsx` | Manages EvidenceUploadDialog data | 5 | Yes | No | No | No |
| 13 | `features/investigation/components/governance/ViolationManager.tsx` | Manages ViolationManager data | 5 | No | Yes | No | No |
| 14 | `features/investigation/components/IncidentClosureRequestDialog.tsx` | Manages IncidentClosureRequestDialog data | 5 | No | Yes | No | No |
| 15 | `features/investigation/components/InvestigatorAssignmentCard.tsx` | Manages InvestigatorAssignmentCard data | 4 | No | Yes | Yes | Yes |
| 16 | `features/investigation/components/TeamInvestigationAssignmentStep.tsx` | Manages TeamInvestigationAssignmentStep data | 5 | No | No | No | Yes |
| 17 | `features/investigation/components/TeamTaskAssignmentPanel.tsx` | Manages TeamTaskAssignmentPanel data | 4 | No | No | No | Yes |
| 18 | `features/investigation/components/WitnessDirectEntry.tsx` | Manages WitnessDirectEntry data | 4 | No | Yes | No | No |
| 19 | `features/investigation/components/WitnessDocumentUpload.tsx` | Manages WitnessDocumentUpload data | 4 | Yes | Yes | Yes | No |
| 20 | `features/investigation/components/WitnessTaskAssignment.tsx` | Manages WitnessTaskAssignment data | 4 | No | No | No | No |
| 21 | `features/investigation/components/WitnessVoiceRecording.tsx` | Manages WitnessVoiceRecording data | 4 | Yes | Yes | Yes | No |
| 22 | `pages/Support.tsx` | Manages Support data | 4 | No | Yes | Yes | Yes |

Summary at end:
  Total MEDIUM forms: 57
  Simple (no uploads, no dynamic, no Supabase): 29
  Complex (has any of the above): 28