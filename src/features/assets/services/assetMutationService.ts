import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type AssetInsert = Database['public']['Tables']['hsse_assets']['Insert'];
type AssetUpdate = Database['public']['Tables']['hsse_assets']['Update'];

export async function getNextAssetSequence(tenantId: string, categoryCode: string): Promise<number> {
    const year = new Date().getFullYear();
    const cleanCode = categoryCode.replace(/^TEST-/i, '').toLowerCase();

    const { data, error } = await supabase
        .from('hsse_assets')
        .select('asset_code')
        .eq('tenant_id', tenantId)
        .ilike('asset_code', `${cleanCode}-%`)
        .order('asset_code', { ascending: false })
        .limit(500);

    if (error) {
        console.error('[AssetSeq] Query error:', error);
        throw error;
    }

    if (!data || data.length === 0) return 1;

    let maxSeq = 0;
    const newPatternRegex = new RegExp(`^${cleanCode}-(\\d{4})-(\\d+)$`, 'i');
    const oldPatternRegex = new RegExp(`^${cleanCode}-(\\d+)$`, 'i');

    for (const row of data) {
        const code = row.asset_code?.toLowerCase();
        if (!code) continue;

        const newMatch = code.match(newPatternRegex);
        if (newMatch) {
            const codeYear = parseInt(newMatch[1], 10);
            const seq = parseInt(newMatch[2], 10);
            if (codeYear === year && seq > maxSeq) {
                maxSeq = seq;
            }
            continue;
        }

        const oldMatch = code.match(oldPatternRegex);
        if (oldMatch) {
            const seq = parseInt(oldMatch[1], 10);
            if (seq > maxSeq) {
                maxSeq = seq;
            }
        }
    }

    return maxSeq + 1;
}

export function generateAssetCode(categoryCode: string, sequence: number): string {
    const year = new Date().getFullYear();
    const paddedSeq = String(sequence).padStart(4, '0');
    const cleanCode = categoryCode.replace(/^TEST-/i, '');
    return `${cleanCode}-${year}-${paddedSeq}`;
}

export function generateSequentialCodes(baseCode: string, quantity: number): string[] {
    if (quantity <= 0) return [];
    if (quantity === 1) return [baseCode];

    const codes: string[] = [];
    const match = baseCode.match(/(\d+)$/);

    if (match) {
        const numberPart = match[0];
        const prefix = baseCode.slice(0, -numberPart.length);
        const startNum = parseInt(numberPart, 10);
        const padLength = numberPart.length;

        for (let i = 0; i < quantity; i++) {
            const newNum = startNum + i;
            codes.push(`${prefix}${String(newNum).padStart(padLength, '0')}`);
        }
    } else {
        for (let i = 0; i < quantity; i++) {
            codes.push(`${baseCode}-${String(i + 1).padStart(3, '0')}`);
        }
    }

    return codes;
}

export async function createAsset(asset: Omit<AssetInsert, 'tenant_id' | 'created_by'>, tenantId: string, userId: string): Promise<unknown> {
    const MAX_CREATE_RETRIES = 3;
    const currentAsset = { ...asset };
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= MAX_CREATE_RETRIES; attempt++) {
        try {
            if (attempt > 1 && currentAsset.category_id) {
                const { data: category } = await supabase
                    .from('asset_categories')
                    .select('code')
                    .eq('id', currentAsset.category_id)
                    .single();

                if (category) {
                    const nextSeq = await getNextAssetSequence(tenantId, category.code);
                    currentAsset.asset_code = generateAssetCode(category.code, nextSeq);
                }
            }

            const { data: existing } = await supabase
                .from('hsse_assets')
                .select('id, deleted_at')
                .eq('tenant_id', tenantId)
                .eq('asset_code', currentAsset.asset_code)
                .maybeSingle();

            if (existing) {
                if (attempt < MAX_CREATE_RETRIES) continue;
                const err = new Error(`DuplicateCodeError: ${currentAsset.asset_code}`);
                (err as any).code = '23505';
                (err as any).assetCode = currentAsset.asset_code;
                throw err;
            }

            const { data, error } = await supabase
                .from('hsse_assets')
                .insert({
                    ...currentAsset,
                    tenant_id: tenantId,
                    created_by: userId,
                })
                .select('id, asset_code')
                .single();

            if (error) {
                if (error.code === '23505' && attempt < MAX_CREATE_RETRIES) continue;
                if (error.code === '23505') {
                    const err = new Error(`DuplicateCodeError: ${currentAsset.asset_code}`);
                    (err as any).code = '23505';
                    (err as any).assetCode = currentAsset.asset_code;
                    throw err;
                }
                throw error;
            }

            return data;
        } catch (err: unknown) {
            lastError = err instanceof Error ? err : new Error('Unknown error');
            const errorCode = (err as Record<string, unknown>)?.code;
            if (errorCode !== '23505' || attempt >= MAX_CREATE_RETRIES) {
                throw err;
            }
        }
    }
    throw lastError || new Error('Failed to create asset after retries');
}

export async function updateAsset(id: string, updates: AssetUpdate, tenantId: string, userId: string) {
    const { data, error } = await supabase
        .from('hsse_assets')
        .update({
            ...updates,
            updated_by: userId,
            updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .select('id, asset_code')
        .single();

    if (error) throw error;
    return data;
}

export async function softDeleteAsset(assetId: string) {
    const { error } = await supabase.rpc('soft_delete_hsse_asset', { p_asset_id: assetId });
    if (error) throw error;
}

export async function createBulkAssets(baseAsset: Omit<AssetInsert, 'tenant_id' | 'created_by' | 'asset_code'>, quantity: number, startCode: string, tenantId: string, userId: string) {
    const codes = generateSequentialCodes(startCode, quantity);

    const { data: existingAssets } = await supabase
        .from('hsse_assets')
        .select('asset_code, deleted_at')
        .eq('tenant_id', tenantId)
        .in('asset_code', codes);

    if (existingAssets && existingAssets.length > 0) {
        const duplicates = existingAssets.map(a =>
            `${a.asset_code}${a.deleted_at ? ' (deleted)' : ''}`
        ).join(', ');
        throw new Error(`Asset codes already exist: ${duplicates}. Please use a different starting code.`);
    }

    const assetsToInsert = codes.map(code => ({
        ...baseAsset,
        asset_code: code,
        tenant_id: tenantId,
        created_by: userId,
    }));

    const { data, error } = await supabase
        .from('hsse_assets')
        .insert(assetsToInsert)
        .select('id, asset_code');

    if (error) {
        if (error.code === '23505') {
            const err = new Error('ConstraintError');
            (err as any).code = '23505';
            throw err;
        }
        throw error;
    }

    return data;
}
