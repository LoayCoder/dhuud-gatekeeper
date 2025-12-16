import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowRight, ArrowLeft, Check } from "lucide-react";
import { PermitBasicsStep } from "@/components/ptw/wizard/PermitBasicsStep";
import { PermitOperationalStep } from "@/components/ptw/wizard/PermitOperationalStep";
import { PermitSafetyStep } from "@/components/ptw/wizard/PermitSafetyStep";
import { PermitReviewStep } from "@/components/ptw/wizard/PermitReviewStep";
import { useCreatePTWPermit } from "@/hooks/ptw";
import { useSIMOPSCheck } from "@/hooks/ptw/use-simops-check";
import { SIMOPSConflictWarning } from "@/components/ptw/SIMOPSConflictWarning";

export interface PermitFormData {
  // Step 1: Basics
  project_id: string;
  type_id: string;
  site_id: string;
  building_id?: string;
  floor_zone_id?: string;
  location_details: string;
  gps_lat?: number;
  gps_lng?: number;
  planned_start_time: string;
  planned_end_time: string;
  job_description: string;
  // Step 2: Operational (dynamic based on permit type)
  operational_data: Record<string, unknown>;
  // Step 3: Safety
  safety_responses: Array<{
    requirement_id: string;
    is_checked: boolean;
    comments?: string;
  }>;
  emergency_contact_name: string;
  emergency_contact_number: string;
  risk_assessment_ref?: string;
}

const STEPS = [
  { id: 1, name: "basics", title: "Basics" },
  { id: 2, name: "operational", title: "Operational Data" },
  { id: 3, name: "safety", title: "Safety Checklist" },
  { id: 4, name: "review", title: "Review & Submit" },
];

export default function CreatePermit() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<Partial<PermitFormData>>({
    safety_responses: [],
    operational_data: {},
  });

  const createPermit = useCreatePTWPermit();

  // SIMOPS conflict checking
  const { conflicts, isChecking, checkConflicts } = useSIMOPSCheck();
  const hasCriticalConflicts = conflicts.some(c => c.is_blocking);

  // Check for SIMOPS conflicts when relevant data changes
  useEffect(() => {
    if (formData.type_id && formData.site_id && formData.planned_start_time && formData.planned_end_time) {
      checkConflicts({
        type_id: formData.type_id,
        site_id: formData.site_id,
        planned_start_time: formData.planned_start_time,
        planned_end_time: formData.planned_end_time,
        building_id: formData.building_id,
        floor_zone_id: formData.floor_zone_id,
      });
    }
  }, [formData.type_id, formData.site_id, formData.planned_start_time, formData.planned_end_time, formData.building_id, formData.floor_zone_id, checkConflicts]);

  const progress = (currentStep / STEPS.length) * 100;

  const updateFormData = (data: Partial<PermitFormData>) => {
    setFormData((prev) => ({ ...prev, ...data }));
  };

  const handleNext = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    try {
      await createPermit.mutateAsync({
        project_id: formData.project_id!,
        type_id: formData.type_id!,
        site_id: formData.site_id,
        building_id: formData.building_id,
        floor_zone_id: formData.floor_zone_id,
        location_details: formData.location_details,
        gps_lat: formData.gps_lat,
        gps_lng: formData.gps_lng,
        planned_start_time: formData.planned_start_time!,
        planned_end_time: formData.planned_end_time!,
        job_description: formData.job_description,
        emergency_contact_name: formData.emergency_contact_name,
        emergency_contact_number: formData.emergency_contact_number,
        risk_assessment_ref: formData.risk_assessment_ref,
      });
      navigate("/ptw");
    } catch (error) {
      // Error handled by mutation
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        // Block if critical SIMOPS conflicts exist
        if (hasCriticalConflicts) return false;
        return !!(
          formData.project_id &&
          formData.type_id &&
          formData.planned_start_time &&
          formData.planned_end_time &&
          formData.job_description
        );
      case 2:
        return true; // Operational data is optional based on type
      case 3:
        return !!(formData.emergency_contact_name && formData.emergency_contact_number);
      case 4:
        return !hasCriticalConflicts; // Also block submission if critical conflicts
      default:
        return false;
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {t("ptw.create.title", "Request Work Permit")}
        </h1>
        <p className="text-muted-foreground">
          {t("ptw.create.description", "Complete all steps to submit a permit request")}
        </p>
      </div>

      {/* Progress */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <Progress value={progress} className="h-2" />
            <div className="flex justify-between">
              {STEPS.map((step) => (
                <div
                  key={step.id}
                  className={`flex flex-col items-center gap-1 ${
                    step.id <= currentStep ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  <div
                    className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      step.id < currentStep
                        ? "bg-primary text-primary-foreground"
                        : step.id === currentStep
                        ? "border-2 border-primary text-primary"
                        : "border-2 border-muted text-muted-foreground"
                    }`}
                  >
                    {step.id < currentStep ? <Check className="h-4 w-4" /> : step.id}
                  </div>
                  <span className="text-xs hidden sm:block">
                    {t(`ptw.create.step.${step.name}`, step.title)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Step Content */}
      <Card>
        <CardHeader>
          <CardTitle>
            {t(`ptw.create.step.${STEPS[currentStep - 1].name}`, STEPS[currentStep - 1].title)}
          </CardTitle>
          <CardDescription>
            {t(`ptw.create.step.${STEPS[currentStep - 1].name}Desc`, `Step ${currentStep} of ${STEPS.length}`)}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* SIMOPS Conflict Warning */}
          {conflicts.length > 0 && (currentStep === 1 || currentStep === 4) && (
            <SIMOPSConflictWarning conflicts={conflicts} />
          )}
          
          {currentStep === 1 && (
            <PermitBasicsStep data={formData} onChange={updateFormData} />
          )}
          {currentStep === 2 && (
            <PermitOperationalStep 
              data={formData} 
              onChange={updateFormData}
              typeId={formData.type_id}
            />
          )}
          {currentStep === 3 && (
            <PermitSafetyStep 
              data={formData} 
              onChange={updateFormData}
              typeId={formData.type_id}
            />
          )}
          {currentStep === 4 && (
            <PermitReviewStep data={formData} />
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={currentStep === 1}
        >
          <ArrowLeft className="me-2 h-4 w-4 rtl:rotate-180" />
          {t("common.back", "Back")}
        </Button>
        
        {currentStep < STEPS.length ? (
          <Button onClick={handleNext} disabled={!canProceed()}>
            {t("common.next", "Next")}
            <ArrowRight className="ms-2 h-4 w-4 rtl:rotate-180" />
          </Button>
        ) : (
          <Button 
            onClick={handleSubmit} 
            disabled={createPermit.isPending}
          >
            {createPermit.isPending 
              ? t("common.submitting", "Submitting...") 
              : t("ptw.create.submit", "Submit Permit Request")
            }
          </Button>
        )}
      </div>
    </div>
  );
}
