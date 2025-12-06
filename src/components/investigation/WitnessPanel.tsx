import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Plus, Loader2, User, Phone, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const witnessSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  contact: z.string().optional(),
  statement: z.string().min(10, 'Statement must be at least 10 characters'),
  relationship: z.string().optional(),
});

type WitnessFormValues = z.infer<typeof witnessSchema>;

interface WitnessPanelProps {
  incidentId: string;
}

interface WitnessStatement {
  id: string;
  incident_id: string;
  name: string;
  contact: string | null;
  statement: string;
  relationship: string | null;
  recorded_by: string | null;
  recorded_at: string;
  tenant_id: string;
}

export function WitnessPanel({ incidentId }: WitnessPanelProps) {
  const { t, i18n } = useTranslation();
  const direction = i18n.dir();
  const { profile, user } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);

  // Note: witness_statements table doesn't exist yet - using local state as placeholder
  // In production, you would create this table via migration
  const [witnesses, setWitnesses] = useState<WitnessStatement[]>([]);
  const [isLoading] = useState(false);

  const form = useForm<WitnessFormValues>({
    resolver: zodResolver(witnessSchema),
    defaultValues: {
      name: '',
      contact: '',
      statement: '',
      relationship: '',
    },
  });

  const onSubmit = async (data: WitnessFormValues) => {
    // Mock implementation - in production, this would insert to witness_statements table
    const newWitness: WitnessStatement = {
      id: crypto.randomUUID(),
      incident_id: incidentId,
      name: data.name,
      contact: data.contact || null,
      statement: data.statement,
      relationship: data.relationship || null,
      recorded_by: user?.id || null,
      recorded_at: new Date().toISOString(),
      tenant_id: profile?.tenant_id || '',
    };

    setWitnesses((prev) => [newWitness, ...prev]);
    toast.success(t('investigation.witnesses.added', 'Witness statement added'));
    form.reset();
    setDialogOpen(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4" dir={direction}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">
          {t('investigation.witnesses.title', 'Witness Statements')}
        </h3>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 me-2" />
              {t('investigation.witnesses.addWitness', 'Add Witness')}
            </Button>
          </DialogTrigger>
          <DialogContent dir={direction}>
            <DialogHeader>
              <DialogTitle>{t('investigation.witnesses.newStatement', 'New Witness Statement')}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('investigation.witnesses.name', 'Witness Name')}</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder={t('investigation.witnesses.namePlaceholder', 'Enter witness name...')} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="contact"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('investigation.witnesses.contact', 'Contact Info')}</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder={t('investigation.witnesses.contactPlaceholder', 'Phone or email...')} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="relationship"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('investigation.witnesses.relationship', 'Relationship')}</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder={t('investigation.witnesses.relationshipPlaceholder', 'e.g., Colleague, Supervisor...')} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="statement"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('investigation.witnesses.statement', 'Statement')}</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          rows={5}
                          placeholder={t('investigation.witnesses.statementPlaceholder', 'Record what the witness observed...')} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    {t('common.cancel', 'Cancel')}
                  </Button>
                  <Button type="submit">
                    {t('common.save', 'Save')}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {witnesses.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-muted-foreground">
            <User className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>{t('investigation.witnesses.noWitnesses', 'No witness statements recorded yet.')}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {witnesses.map((witness) => (
            <Card key={witness.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <User className="h-4 w-4" />
                    {witness.name}
                  </CardTitle>
                  <span className="text-sm text-muted-foreground">
                    {format(new Date(witness.recorded_at), 'MMM d, yyyy')}
                  </span>
                </div>
                {(witness.contact || witness.relationship) && (
                  <div className="flex gap-4 text-sm text-muted-foreground">
                    {witness.contact && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {witness.contact}
                      </span>
                    )}
                    {witness.relationship && (
                      <span>{witness.relationship}</span>
                    )}
                  </div>
                )}
              </CardHeader>
              <CardContent>
                <div className="flex items-start gap-2">
                  <MessageSquare className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                  <p className="text-sm">{witness.statement}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
