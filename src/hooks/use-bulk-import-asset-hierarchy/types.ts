/**
 * Types for bulk importing asset hierarchy (categories, types, subtypes, parts)
 */

import type { ParseResult, ImportMode } from '@/lib/asset-hierarchy-import-utils';

export interface ImportResult {
    success: boolean;
    categoriesCreated: number;
    categoriesUpdated: number;
    typesCreated: number;
    typesUpdated: number;
    subtypesCreated: number;
    subtypesUpdated: number;
    partsCreated: number;
    partsUpdated: number;
    skippedCount: number;
    errors: string[];
}

export interface ImportProgress {
    phase: 'idle' | 'categories' | 'types' | 'subtypes' | 'parts' | 'complete';
    categories: { current: number; total: number };
    types: { current: number; total: number };
    subtypes: { current: number; total: number };
    parts: { current: number; total: number };
}

export interface CodeIdMap {
    [code: string]: string;
}

export interface NameIdMap {
    [name: string]: string;
}

export interface ParentMaps {
    categoryCodeMap: CodeIdMap;
    categoryNameMap: NameIdMap;
    typeCodeMap: CodeIdMap;
    typeNameMap: NameIdMap;
    subtypeCodeMap: CodeIdMap;
    subtypeNameMap: NameIdMap;
}

export interface SkippedItem {
    code: string;
    name: string;
    level: string;
    reason: string;
}

export interface ImportOptions {
    parseResult: ParseResult;
    mode: ImportMode;
    fileName?: string;
}

export type ProgressCallback = (phase: ImportProgress['phase'], current: number, total: number) => void;
