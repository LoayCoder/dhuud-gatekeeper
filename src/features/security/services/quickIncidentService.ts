import { supabase } from '@/integrations/supabase/client'

export interface QuickIncidentPayload {
    selectedType: 'hazard' | 'security' | 'medical' | 'other'
    notes: string
    photoBlob: Blob | null
    voiceBlob: Blob | null
    location: { lat: number; lng: number } | null
}

const mapIncidentType = (
    type: QuickIncidentPayload['selectedType']
) => {
    switch (type) {
        case 'hazard': return 'near_miss'
        case 'medical': return 'injury'
        case 'security': return 'property_damage'
        default: return 'other'
    }
}

const mapSeverity = (
    type: QuickIncidentPayload['selectedType']
) => type === 'medical' ? 'high' : 'medium'

export const uploadQuickIncidentPhoto = async (
    blob: Blob
): Promise<string> => {
    const filename = `quick-incident/${Date.now()}.jpg`
    const { error } = await supabase.storage
        .from('incident-photos')
        .upload(filename, blob)
    if (error) throw error
    return filename
}

export const uploadQuickIncidentAudio = async (
    blob: Blob
): Promise<string> => {
    const filename = `quick-incident/${Date.now()}.webm`
    const { error } = await supabase.storage
        .from('incident-audio')
        .upload(filename, blob)
    if (error) throw error
    return filename
}

export const submitQuickIncident = async (
    payload: QuickIncidentPayload
): Promise<void> => {
    // 1. Get fresh session
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user?.id) throw new Error('No active session')

    // 2. Get tenant_id
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', session.user.id)
        .single()
    if (profileError) throw profileError
    if (!profile?.tenant_id) throw new Error('No tenant found')

    // 3. Upload media
    const photoPath = payload.photoBlob
        ? await uploadQuickIncidentPhoto(payload.photoBlob)
        : null

    const voicePath = payload.voiceBlob
        ? await uploadQuickIncidentAudio(payload.voiceBlob)
        : null

    // 4. Insert incident
    const { error: insertError } = await supabase
        .from('incidents')
        .insert({
            reporter_id: session.user.id,
            tenant_id: profile.tenant_id,
            title: `Quick Report: ${payload.selectedType.charAt(0).toUpperCase() +
                payload.selectedType.slice(1)
                }`,
            description: payload.notes ||
                `Quick ${payload.selectedType} report`,
            event_type: 'incident',
            incident_type: mapIncidentType(payload.selectedType),
            severity: mapSeverity(payload.selectedType),
            status: 'submitted',
            // photo_path: photoPath,   ← uncomment when DB ready
            // voice_path: voicePath,   ← uncomment when DB ready
            // location: payload.location ← uncomment when DB ready
        })
    if (insertError) throw insertError
}
