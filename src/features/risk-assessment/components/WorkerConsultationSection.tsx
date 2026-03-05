import { useTranslation } from "react-i18next";
import { Users, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface WorkerConsultationSectionProps {
  consultationDate: string;
  onConsultationDateChange: (value: string) => void;
  consultationNotes: string;
  onConsultationNotesChange: (value: string) => void;
  unionRepConsulted: boolean;
  onUnionRepConsultedChange: (value: boolean) => void;
}

export function WorkerConsultationSection({
  consultationDate,
  onConsultationDateChange,
  consultationNotes,
  onConsultationNotesChange,
  unionRepConsulted,
  onUnionRepConsultedChange,
}: WorkerConsultationSectionProps) {
  const { t } = useTranslation();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="h-5 w-5" />
          {t("risk.consultation.title", "Worker Consultation (ISO 45001 7.4)")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertDescription>
            {t("risk.consultation.requirement", "ISO 45001 requires consultation with workers on OH&S matters. Document evidence of worker participation.")}
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {t("risk.consultation.date", "Consultation Date")}
            </Label>
            <Input
              type="date"
              value={consultationDate}
              onChange={(e) => onConsultationDateChange(e.target.value)}
              max={new Date().toISOString().split("T")[0]}
              className="mt-1"
            />
          </div>

          <div className="flex items-center space-x-2 pt-6">
            <Checkbox
              id="union-rep"
              checked={unionRepConsulted}
              onCheckedChange={(checked) => onUnionRepConsultedChange(checked as boolean)}
            />
            <label htmlFor="union-rep" className="text-sm cursor-pointer">
              {t("risk.consultation.unionRep", "Union/Worker Representative Consulted")}
            </label>
          </div>
        </div>

        <div>
          <Label>{t("risk.consultation.notes", "Consultation Notes")}</Label>
          <Textarea
            value={consultationNotes}
            onChange={(e) => onConsultationNotesChange(e.target.value)}
            placeholder={t("risk.consultation.notesPlaceholder", "Document the consultation process, key concerns raised by workers, and how they were addressed...")}
            className="mt-1 min-h-[100px]"
          />
        </div>

        <p className="text-xs text-muted-foreground">
          {t("risk.consultation.help", "Include details of toolbox talks, safety meetings, or individual consultations. Record worker suggestions and how they were incorporated.")}
        </p>
      </CardContent>
    </Card>
  );
}
