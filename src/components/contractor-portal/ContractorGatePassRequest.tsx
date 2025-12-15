import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateContractorGatePass } from "@/hooks/contractor-management";

const gatePassSchema = z.object({
  project_id: z.string().min(1, "Project is required"),
  pass_type: z.enum(["material_in", "material_out", "equipment_in", "equipment_out"]),
  material_description: z.string().min(1, "Material description is required"),
  quantity: z.number().optional(),
  vehicle_plate: z.string().optional(),
  driver_name: z.string().optional(),
  driver_mobile: z.string().optional(),
  pass_date: z.string().min(1, "Date is required"),
  time_window_start: z.string().optional(),
  time_window_end: z.string().optional(),
});

type GatePassFormData = z.infer<typeof gatePassSchema>;

interface ContractorGatePassRequestProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  projects: Array<{ id: string; project_name: string; project_code: string }>;
}

export default function ContractorGatePassRequest({ open, onOpenChange, companyId, projects }: ContractorGatePassRequestProps) {
  const { t } = useTranslation();
  const createGatePass = useCreateContractorGatePass();

  const form = useForm<GatePassFormData>({
    resolver: zodResolver(gatePassSchema),
    defaultValues: {
      project_id: "",
      pass_type: "material_in",
      material_description: "",
      quantity: undefined,
      vehicle_plate: "",
      driver_name: "",
      driver_mobile: "",
      pass_date: new Date().toISOString().split("T")[0],
      time_window_start: "",
      time_window_end: "",
    },
  });

  const onSubmit = async (data: GatePassFormData) => {
    await createGatePass.mutateAsync({
      company_id: companyId,
      project_id: data.project_id,
      pass_type: data.pass_type,
      material_description: data.material_description,
      quantity: data.quantity,
      vehicle_plate: data.vehicle_plate,
      driver_name: data.driver_name,
      driver_mobile: data.driver_mobile,
      pass_date: data.pass_date,
      time_window_start: data.time_window_start || undefined,
      time_window_end: data.time_window_end || undefined,
    });
    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("contractorPortal.gatePasses.requestPass", "Request Gate Pass")}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Project Selection */}
            <FormField control={form.control} name="project_id" render={({ field }) => (
              <FormItem>
                <FormLabel>{t("contractors.projects.title", "Project")} *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder={t("common.select", "Select...")} /></SelectTrigger></FormControl>
                  <SelectContent>
                    {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.project_name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            {/* Pass Type */}
            <FormField control={form.control} name="pass_type" render={({ field }) => (
              <FormItem>
                <FormLabel>{t("contractors.gatePasses.type", "Pass Type")} *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="material_in">{t("contractors.gatePasses.materialIn", "Material In")}</SelectItem>
                    <SelectItem value="material_out">{t("contractors.gatePasses.materialOut", "Material Out")}</SelectItem>
                    <SelectItem value="equipment_in">{t("contractors.gatePasses.equipmentIn", "Equipment In")}</SelectItem>
                    <SelectItem value="equipment_out">{t("contractors.gatePasses.equipmentOut", "Equipment Out")}</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            {/* Material Description */}
            <FormField control={form.control} name="material_description" render={({ field }) => (
              <FormItem>
                <FormLabel>{t("contractors.gatePasses.materialDescription", "Material/Equipment Description")} *</FormLabel>
                <FormControl>
                  <Textarea 
                    {...field} 
                    placeholder={t("contractors.gatePasses.materialDescriptionPlaceholder", "Describe the materials or equipment...")}
                    rows={3}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            {/* Pass Date */}
            <FormField control={form.control} name="pass_date" render={({ field }) => (
              <FormItem>
                <FormLabel>{t("contractors.gatePasses.date", "Date")} *</FormLabel>
                <FormControl><Input {...field} type="date" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            {/* Time Window */}
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="time_window_start" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("contractors.gatePasses.timeWindowStart", "Time Start")}</FormLabel>
                  <FormControl><Input {...field} type="time" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="time_window_end" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("contractors.gatePasses.timeWindowEnd", "Time End")}</FormLabel>
                  <FormControl><Input {...field} type="time" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            {/* Vehicle Plate */}
            <FormField control={form.control} name="vehicle_plate" render={({ field }) => (
              <FormItem>
                <FormLabel>{t("contractors.gatePasses.vehicle", "Vehicle Plate")}</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            {/* Driver Name */}
            <FormField control={form.control} name="driver_name" render={({ field }) => (
              <FormItem>
                <FormLabel>{t("contractors.gatePasses.driver", "Driver Name")}</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            {/* Driver Mobile */}
            <FormField control={form.control} name="driver_mobile" render={({ field }) => (
              <FormItem>
                <FormLabel>{t("contractors.gatePasses.driverMobile", "Driver Mobile")}</FormLabel>
                <FormControl><Input {...field} type="tel" placeholder="+966 5XX XXX XXXX" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t("common.cancel", "Cancel")}
              </Button>
              <Button type="submit" disabled={createGatePass.isPending}>
                {createGatePass.isPending ? t("common.submitting", "Submitting...") : t("common.submit", "Submit")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
