import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateContractorGatePass } from "@/hooks/contractor-management";

const gatePassSchema = z.object({
  project_id: z.string().min(1, "Project is required"),
  pass_type: z.enum(["material_in", "material_out", "equipment"]),
  quantity: z.number().optional(),
  vehicle_plate: z.string().optional(),
  driver_name: z.string().optional(),
  driver_mobile: z.string().optional(),
  pass_date: z.string().min(1, "Date is required"),
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
      quantity: undefined,
      vehicle_plate: "",
      driver_name: "",
      driver_mobile: "",
      pass_date: new Date().toISOString().split("T")[0],
    },
  });

  const onSubmit = async (data: GatePassFormData) => {
    await createGatePass.mutateAsync({
      company_id: companyId,
      project_id: data.project_id,
      pass_type: data.pass_type,
      quantity: data.quantity,
      vehicle_plate: data.vehicle_plate,
      driver_name: data.driver_name,
      driver_mobile: data.driver_mobile,
      pass_date: data.pass_date,
    });
    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{t("contractorPortal.gatePasses.requestPass", "Request Gate Pass")}</DialogTitle></DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="project_id" render={({ field }) => (
              <FormItem>
                <FormLabel>{t("contractors.projects.title", "Project")} *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder={t("common.select", "Select...")} /></SelectTrigger></FormControl>
                  <SelectContent>{projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.project_name}</SelectItem>)}</SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="pass_type" render={({ field }) => (
              <FormItem>
                <FormLabel>{t("contractors.gatePasses.type", "Pass Type")} *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="material_in">{t("contractors.gatePasses.materialIn", "Material In")}</SelectItem>
                    <SelectItem value="material_out">{t("contractors.gatePasses.materialOut", "Material Out")}</SelectItem>
                    <SelectItem value="equipment">{t("contractors.gatePasses.equipment", "Equipment")}</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="pass_date" render={({ field }) => (
              <FormItem><FormLabel>{t("contractors.gatePasses.date", "Date")} *</FormLabel><FormControl><Input {...field} type="date" /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="vehicle_plate" render={({ field }) => (
              <FormItem><FormLabel>{t("contractors.gatePasses.vehicle", "Vehicle Plate")}</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="driver_name" render={({ field }) => (
              <FormItem><FormLabel>{t("contractors.gatePasses.driver", "Driver Name")}</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t("common.cancel", "Cancel")}</Button>
              <Button type="submit" disabled={createGatePass.isPending}>{createGatePass.isPending ? t("common.submitting", "Submitting...") : t("common.submit", "Submit")}</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
