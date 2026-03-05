import { supabase } from '@/integrations/supabase/client';

export async function getGateEntries(tenantId: string, filters?: any) {
  let query = supabase.from('gate_entry_logs').select('*').eq('tenant_id', tenantId).is('deleted_at', null).order('entry_time', { ascending: false });
  if (filters?.onlyActive) query = query.is('exit_time', null);
  if (filters?.entryType) query = query.eq('entry_type', filters.entryType);
  if (filters?.siteId) query = query.eq('site_id', filters.siteId);
  if (filters?.search) query = query.or(`person_name.ilike.%${filters.search}%,car_plate.ilike.%${filters.search}%,mobile_number.ilike.%${filters.search}%`);
  const { data, error } = await query.limit(100);
  if (error) throw error;
  return data || [];
}

export async function createGateEntry(entry: any, tenantId: string, userId?: string) {
  const { data, error } = await supabase.from('gate_entry_logs').insert({ ...entry, tenant_id: tenantId, logged_by: userId }).select().single();
  if (error) throw error;
  return data;
}

export async function recordExit(entryId: string) {
  const { data, error } = await supabase.from('gate_entry_logs').update({ exit_time: new Date().toISOString() }).eq('id', entryId).select().single();
  if (error) throw error;
  return data;
}

export async function sendGateWhatsAppNotification(_params: any) {
  // Stub - implement via edge function
  return { success: true };
}
