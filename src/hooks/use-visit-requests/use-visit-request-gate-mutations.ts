import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';

// Check in visitor with gate log creation
export function useCheckInVisitorWithGateLog() {
    const { toast } = useToast();
    const { t } = useTranslation();
    const { profile, user } = useAuth();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            visitRequestId,
            visitorId,
            visitorName,
            hostPhone,
            siteId,
            notifyHost = true,
        }: {
            visitRequestId: string;
            visitorId: string;
            visitorName: string;
            hostPhone?: string;
            siteId?: string;
            notifyHost?: boolean;
        }) => {
            if (!profile?.tenant_id) throw new Error('No tenant');

            const now = new Date().toISOString();

            // 1. Update visit_request status
            const { data: visitRequest, error: vrError } = await supabase
                .from('visit_requests')
                .update({
                    status: 'checked_in',
                    entry_logged_at: now,
                })
                .eq('id', visitRequestId)
                .select()
                .single();

            if (vrError) throw vrError;

            // 2. Create gate_entry_log
            const { data: gateEntry, error: geError } = await supabase
                .from('gate_entry_logs')
                .insert({
                    tenant_id: profile.tenant_id,
                    person_name: visitorName,
                    entry_type: 'visitor',
                    entry_time: now,
                    site_id: siteId,
                    visitor_id: visitorId,
                    visit_request_id: visitRequestId,
                    guard_id: user?.id,
                })
                .select()
                .single();

            if (geError) throw geError;

            // 3. Update visitor's last_visit_at
            await supabase
                .from('visitors')
                .update({
                    last_visit_at: now,
                    qr_used_at: now,
                })
                .eq('id', visitorId);

            // 4. Send host arrival notification if enabled
            if (notifyHost && hostPhone) {
                try {
                    await supabase.functions.invoke('send-gate-whatsapp', {
                        body: {
                            notification_type: 'host_arrival',
                            mobile_number: hostPhone,
                            visitor_name: visitorName,
                            visit_reference: visitRequestId.slice(0, 8).toUpperCase(),
                            entry_time: now,
                            entry_id: gateEntry.id,
                            tenant_id: profile.tenant_id,
                        },
                    });

                    // Update host_notified_at
                    await supabase
                        .from('visit_requests')
                        .update({ host_notified_at: now })
                        .eq('id', visitRequestId);
                } catch (error) {
                    console.error('[CheckIn] Failed to notify host:', error);
                }
            }

            return { visitRequest, gateEntry };
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['visit-requests'] });
            queryClient.invalidateQueries({ queryKey: ['gate-entries'] });
            queryClient.invalidateQueries({ queryKey: ['visitors'] });
            toast({ title: t('security.gate.entryRecorded', 'Entry recorded successfully') });
        },
        onError: (error) => {
            toast({
                title: t('security.gate.entryFailed', 'Check-in failed'),
                description: error.message,
                variant: 'destructive'
            });
        },
    });
}

// Check out visitor with gate log update
export function useCheckOutVisitorWithGateLog() {
    const { toast } = useToast();
    const { t } = useTranslation();
    const { profile } = useAuth();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            visitRequestId,
            gateEntryId,
            hostPhone,
            visitorName,
            notifyHost = true,
        }: {
            visitRequestId: string;
            gateEntryId: string;
            hostPhone?: string;
            visitorName?: string;
            notifyHost?: boolean;
        }) => {
            const now = new Date().toISOString();

            // 1. Update visit_request status
            const { data: visitRequest, error: vrError } = await supabase
                .from('visit_requests')
                .update({
                    status: 'checked_out',
                    exit_logged_at: now,
                })
                .eq('id', visitRequestId)
                .select()
                .single();

            if (vrError) throw vrError;

            // 2. Update gate_entry_log exit time
            const { data: gateEntry, error: geError } = await supabase
                .from('gate_entry_logs')
                .update({ exit_time: now })
                .eq('id', gateEntryId)
                .select()
                .single();

            if (geError) throw geError;

            // 3. Send host departure notification if enabled
            if (notifyHost && hostPhone && profile?.tenant_id) {
                try {
                    await supabase.functions.invoke('send-gate-whatsapp', {
                        body: {
                            notification_type: 'host_departure',
                            mobile_number: hostPhone,
                            visitor_name: visitorName || 'Visitor',
                            exit_time: now,
                            tenant_id: profile.tenant_id,
                        },
                    });

                    // Update host_exit_notified_at
                    await supabase
                        .from('visit_requests')
                        .update({ host_exit_notified_at: now })
                        .eq('id', visitRequestId);
                } catch (error) {
                    console.error('[CheckOut] Failed to notify host:', error);
                }
            }

            return { visitRequest, gateEntry };
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['visit-requests'] });
            queryClient.invalidateQueries({ queryKey: ['gate-entries'] });
            toast({ title: t('security.gate.exitRecorded', 'Exit recorded successfully') });
        },
        onError: (error) => {
            toast({
                title: t('security.gate.exitFailed', 'Check-out failed'),
                description: error.message,
                variant: 'destructive'
            });
        },
    });
}

export function useResendVisitorInvitation() {
    const { toast } = useToast();
    const { profile } = useAuth();

    return useMutation({
        mutationFn: async ({ visitorId }: { visitorId: string }) => {
            if (!profile?.tenant_id) throw new Error('No tenant');

            // Fetch visitor details with latest approved visit request
            const { data: visitor, error: visitorError } = await supabase
                .from('visitors')
                .select(`
          id, full_name, phone, qr_code_token,
          visit_requests!inner(id, status, site_id, site:sites(id, name))
        `)
                .eq('id', visitorId)
                .eq('visit_requests.status', 'approved')
                .order('created_at', { referencedTable: 'visit_requests', ascending: false })
                .limit(1, { referencedTable: 'visit_requests' })
                .single();

            if (visitorError) throw visitorError;

            if (!visitor?.phone) {
                throw new Error('Visitor has no phone number');
            }

            if (!visitor?.qr_code_token) {
                throw new Error('Visitor has no QR code token');
            }

            // Get destination name from the latest visit request
            const visitRequest = Array.isArray(visitor.visit_requests)
                ? visitor.visit_requests[0]
                : visitor.visit_requests;
            const siteName = visitRequest?.site?.name || 'Reception';

            // Send WhatsApp notification
            const { error: invokeError } = await supabase.functions.invoke('send-gate-whatsapp', {
                body: {
                    notification_type: 'visitor_badge_link',
                    mobile_number: visitor.phone,
                    visitor_name: visitor.full_name || 'Visitor',
                    badge_url: visitor.qr_code_token,
                    destination_name: siteName,
                    tenant_id: profile.tenant_id,
                },
            });

            if (invokeError) throw invokeError;

            return { success: true };
        },
        onSuccess: () => {
            toast({ title: 'Invitation resent successfully' });
        },
        onError: (error) => {
            toast({ title: 'Failed to resend invitation', description: error.message, variant: 'destructive' });
        },
    });
}

export function useDeleteVisitRequest() {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (requestId: string) => {
            // Use SECURITY DEFINER function to bypass RLS issues
            const { error } = await supabase
                .rpc('soft_delete_visit_request', { p_request_id: requestId });

            if (error) throw error;
            return requestId;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['visit-requests'] });
            toast({ title: 'Visit request deleted' });
        },
        onError: (error) => {
            toast({ title: 'Failed to delete visit request', description: error.message, variant: 'destructive' });
        },
    });
}
