import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";
import { Calendar, User, UserCheck, Shield, Users } from "lucide-react";
import { format } from "date-fns";
import { ResponsibleUserBadge } from "@/components/incidents/workflow/ResponsibleUserBadge";

interface IncidentReporterInfoProps {
    incident: any;
    currentOwner?: { role: string; name: string | null } | null;
}

export function IncidentReporterInfo({ incident, currentOwner }: IncidentReporterInfoProps) {
    const { t } = useTranslation();

    return (
        <Card>
            <CardHeader className="border-b bg-muted/20">
                <CardTitle className="text-base flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    {t('incidents.reporterAndAssignmentInfo', 'Reporter & Assignment Details')}
                </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Reporter Information */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Reported By</h3>
                        </div>

                        <div className="bg-muted/30 rounded-lg p-4 border border-border/50">
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-muted-foreground">Name:</span>
                                    <span className="font-medium">{incident.reporter?.full_name || 'Unknown User'}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-muted-foreground">Department:</span>
                                    <span className="font-medium">{incident.reporter?.department || '-'}</span>
                                </div>
                                <div className="flex justify-between items-center pt-3 border-t border-border/50">
                                    <span className="text-sm text-muted-foreground flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> Date Reported:</span>
                                    <span className="font-medium">{incident.occurred_at ? format(new Date(incident.occurred_at), 'PP p') : '-'}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Assignment Information */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <UserCheck className="h-4 w-4 text-muted-foreground" />
                            <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Current Assignment</h3>
                        </div>

                        <div className="bg-muted/30 rounded-lg p-4 border border-border/50">
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-muted-foreground">Workflow Stage:</span>
                                    <span className="font-medium capitalize">{incident.status?.replace(/_/g, ' ') || '-'}</span>
                                </div>

                                <div className="flex items-center justify-between pt-3 border-t border-border/50">
                                    <span className="text-sm text-muted-foreground flex items-center gap-1.5"><Shield className="h-3.5 w-3.5" /> Pending With:</span>
                                    <div className="flex flex-col items-end">
                                        <ResponsibleUserBadge incident={incident as any} showTitle={false} />
                                    </div>
                                </div>

                                {currentOwner?.name && (
                                    <div className="flex justify-between items-center pt-2">
                                        <span className="text-sm text-muted-foreground">{currentOwner.role}:</span>
                                        <span className="font-medium">{currentOwner.name}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
