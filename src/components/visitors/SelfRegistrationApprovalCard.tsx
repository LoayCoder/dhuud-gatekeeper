/**
 * Self Registration Approval Card
 * 
 * Card for reviewing and approving/rejecting self-registrations.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  useApproveSelfRegistration, 
  useRejectSelfRegistration,
  SelfRegistration 
} from '@/hooks/use-visitor-self-registration';
import { supabase } from '@/integrations/supabase/client';
import { 
  User, Building, Phone, Mail, CreditCard, Calendar, 
  Clock, Check, X, FileImage, MapPin
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface SelfRegistrationApprovalCardProps {
  registration: SelfRegistration;
  className?: string;
}

export function SelfRegistrationApprovalCard({ 
  registration, 
  className 
}: SelfRegistrationApprovalCardProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';

  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showIdDocument, setShowIdDocument] = useState(false);

  const approveRegistration = useApproveSelfRegistration();
  const rejectRegistration = useRejectSelfRegistration();

  const handleApprove = async () => {
    await approveRegistration.mutateAsync({ registrationId: registration.id });
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) return;
    await rejectRegistration.mutateAsync({ 
      registrationId: registration.id, 
      reason: rejectReason 
    });
  };

  const photoUrl = registration.photo_path 
    ? supabase.storage.from('visitor-self-registration').getPublicUrl(registration.photo_path).data.publicUrl
    : null;

  const idDocUrl = registration.id_document_path
    ? supabase.storage.from('visitor-self-registration').getPublicUrl(registration.id_document_path).data.publicUrl
    : null;

  return (
    <Card className={cn("relative overflow-hidden", className)}>
      {/* Status indicator stripe */}
      <div className={cn(
        "absolute top-0 start-0 w-1 h-full",
        registration.status === 'pending' ? "bg-yellow-500" :
        registration.status === 'approved' ? "bg-green-500" :
        registration.status === 'rejected' ? "bg-red-500" : "bg-muted"
      )} />

      <CardContent className="p-4 ps-6">
        <div className="flex gap-4">
          {/* Photo */}
          <Avatar className="w-16 h-16 rounded-lg">
            {photoUrl ? (
              <AvatarImage src={photoUrl} alt={registration.full_name} />
            ) : null}
            <AvatarFallback className="rounded-lg bg-muted">
              <User className="w-8 h-8 text-muted-foreground" />
            </AvatarFallback>
          </Avatar>

          {/* Details */}
          <div className="flex-1 space-y-3">
            {/* Name and Status */}
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-lg">{registration.full_name}</h3>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Building className="w-3.5 h-3.5" />
                  <span>{registration.company_name}</span>
                </div>
              </div>
              <Badge variant={
                registration.status === 'pending' ? 'secondary' :
                registration.status === 'approved' ? 'default' :
                'destructive'
              }>
                {t(`visitors.selfRegistration.status.${registration.status}`, registration.status)}
              </Badge>
            </div>

            {/* Contact Info */}
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="w-3.5 h-3.5" />
                <span>{registration.phone}</span>
              </div>
              {registration.email && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="w-3.5 h-3.5" />
                  <span className="truncate">{registration.email}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-muted-foreground">
                <CreditCard className="w-3.5 h-3.5" />
                <span>{registration.national_id}</span>
              </div>
              {registration.nationality && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{registration.nationality}</span>
                </div>
              )}
            </div>

            {/* Visit Details */}
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-1 text-muted-foreground">
                <Calendar className="w-3.5 h-3.5" />
                <span>{format(new Date(registration.expected_visit_date), 'PP')}</span>
              </div>
              {registration.expected_visit_time && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{registration.expected_visit_time}</span>
                </div>
              )}
            </div>

            {/* Host Info */}
            {registration.host_name && (
              <div className="text-sm">
                <span className="text-muted-foreground">{t('visitors.host', 'Host')}: </span>
                <span className="font-medium">{registration.host_name}</span>
                {registration.host_department && (
                  <span className="text-muted-foreground"> ({registration.host_department})</span>
                )}
              </div>
            )}

            {/* Purpose */}
            {registration.purpose && (
              <div className="text-sm">
                <span className="text-muted-foreground">{t('visitors.purpose', 'Purpose')}: </span>
                <span>{registration.purpose}</span>
              </div>
            )}

            {/* ID Document Toggle */}
            {idDocUrl && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowIdDocument(!showIdDocument)}
              >
                <FileImage className="w-4 h-4 me-2" />
                {showIdDocument 
                  ? t('visitors.selfRegistration.hideId', 'Hide ID')
                  : t('visitors.selfRegistration.viewId', 'View ID')
                }
              </Button>
            )}

            {/* ID Document Preview */}
            {showIdDocument && idDocUrl && (
              <div className="mt-3 p-2 bg-muted rounded-lg">
                <img
                  src={idDocUrl}
                  alt="ID Document"
                  className="max-w-full h-auto rounded"
                />
              </div>
            )}

            {/* Rejection Form */}
            {showRejectForm && (
              <div className="space-y-2 pt-2">
                <Label>{t('visitors.selfRegistration.rejectReason', 'Rejection Reason')}</Label>
                <Textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder={t('visitors.selfRegistration.rejectReasonPlaceholder', 'Enter reason for rejection...')}
                  rows={2}
                />
              </div>
            )}

            {/* Actions */}
            {registration.status === 'pending' && (
              <div className="flex justify-end gap-2 pt-2">
                {showRejectForm ? (
                  <>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setShowRejectForm(false);
                        setRejectReason('');
                      }}
                    >
                      {t('common.cancel', 'Cancel')}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleReject}
                      disabled={!rejectReason.trim() || rejectRegistration.isPending}
                    >
                      {rejectRegistration.isPending 
                        ? t('common.rejecting', 'Rejecting...')
                        : t('common.confirmReject', 'Confirm Reject')
                      }
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowRejectForm(true)}
                    >
                      <X className="w-4 h-4 me-1" />
                      {t('common.reject', 'Reject')}
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleApprove}
                      disabled={approveRegistration.isPending}
                    >
                      <Check className="w-4 h-4 me-1" />
                      {approveRegistration.isPending 
                        ? t('common.approving', 'Approving...')
                        : t('common.approve', 'Approve')
                      }
                    </Button>
                  </>
                )}
              </div>
            )}

            {/* Rejection Reason Display */}
            {registration.status === 'rejected' && registration.rejection_reason && (
              <div className="p-2 bg-destructive/10 rounded text-sm text-destructive">
                <strong>{t('visitors.selfRegistration.rejectedBecause', 'Rejected')}: </strong>
                {registration.rejection_reason}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
