/**
 * Automated hook splitter script
 * Reads each oversized hook file and splits it into a folder structure:
 *   types.ts — all interfaces/types (lines before first export function)
 *   use-*-queries.ts — all query hooks (useQuery-based)
 *   use-*-mutations.ts — all mutation hooks (useMutation-based)
 *   index.ts — barrel re-exporting everything
 * 
 * Usage: node split-hooks.mjs <file-path>
 */

import { readFileSync, writeFileSync, mkdirSync, unlinkSync, existsSync } from 'fs';
import { dirname, basename, join } from 'path';

const filePath = process.argv[2];
if (!filePath) {
    console.error('Usage: node split-hooks.mjs <file-path>');
    process.exit(1);
}

const content = readFileSync(filePath, 'utf-8');
const lines = content.split(/\r?\n/);
const fileName = basename(filePath, '.ts');
const dirPath = join(dirname(filePath), fileName);

// Parse the file into sections
const imports = [];
const types = [];
const queryHooks = [];
const mutationHooks = [];
let currentSection = 'imports';
let currentBlock = [];
let currentBlockType = null;
let braceDepth = 0;
let inFunction = false;
let functionStartLine = -1;

// Identify exported names for barrel file
const exportedNames = [];
const exportedTypes = [];

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Track exported interfaces/types
    const typeMatch = line.match(/^export\s+(?:interface|type)\s+(\w+)/);
    if (typeMatch) {
        exportedTypes.push(typeMatch[1]);
    }

    // Track exported functions
    const funcMatch = line.match(/^export\s+(?:function|const)\s+(\w+)/);
    if (funcMatch) {
        exportedNames.push(funcMatch[1]);
    }

    // Detect top-level function boundaries
    if (!inFunction && (line.match(/^export\s+function\s/) || line.match(/^export\s+const\s+\w+\s*=/) || line.match(/^(?:async\s+)?function\s/))) {
        // We're starting a new function
        if (currentBlock.length > 0 && currentBlockType) {
            // Save previous block
            if (currentBlockType === 'import') imports.push(...currentBlock);
            else if (currentBlockType === 'type') types.push(...currentBlock);
            else if (currentBlockType === 'query') queryHooks.push(...currentBlock);
            else if (currentBlockType === 'mutation') mutationHooks.push(...currentBlock);
        }

        currentBlock = [line];
        inFunction = true;
        functionStartLine = i;
        braceDepth = (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;

        // Determine if this is a query or mutation hook
        // Look ahead to find useQuery or useMutation
        let isQuery = false;
        let isMutation = false;
        for (let j = i; j < Math.min(i + 30, lines.length); j++) {
            if (lines[j].includes('useQuery(') || lines[j].includes('useQuery<')) isQuery = true;
            if (lines[j].includes('useMutation(') || lines[j].includes('useMutation<')) isMutation = true;
            // If we find both, mutation wins (it's probably a mutation that also reads)
        }
        currentBlockType = isMutation ? 'mutation' : (isQuery ? 'query' : 'mutation');

        if (braceDepth === 0 && line.includes('{') && line.includes('}')) {
            inFunction = false;
            // One-liner function, save it
        }
        continue;
    }

    if (inFunction) {
        currentBlock.push(line);
        braceDepth += (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;

        if (braceDepth <= 0) {
            inFunction = false;
            // Function complete, save it
            if (currentBlockType === 'query') queryHooks.push(...currentBlock);
            else if (currentBlockType === 'mutation') mutationHooks.push(...currentBlock);
            currentBlock = [];
            currentBlockType = null;
        }
        continue;
    }

    // Not in a function — categorize line
    if (line.match(/^import\s/) || (currentSection === 'imports' && (line.trim() === '' || line.startsWith('//')))) {
        imports.push(line);
        currentSection = 'imports';
    } else if (line.match(/^export\s+(?:interface|type)\s/) || line.match(/^interface\s/) || line.match(/^type\s/)) {
        currentSection = 'types';
        currentBlock = [line];
        currentBlockType = 'type';
        braceDepth = (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;

        if (braceDepth <= 0 && !line.includes('{')) {
            // Single-line type alias
            types.push(line);
            currentBlock = [];
            currentBlockType = null;
        } else {
            inFunction = true; // Reuse brace tracking for types
        }
    } else if (currentSection === 'types' || (!line.match(/^export/) && line.trim() !== '' && !line.startsWith('//'))) {
        // Continuation or comments between types
        if (line.trim() === '' || line.startsWith('//') || line.startsWith('/*') || line.startsWith(' *') || line.startsWith('*')) {
            // Comment or blank line between sections
            types.push(line);
        } else {
            types.push(line);
        }
    }
}

// Save any remaining block
if (currentBlock.length > 0 && currentBlockType) {
    if (currentBlockType === 'query') queryHooks.push(...currentBlock);
    else if (currentBlockType === 'mutation') mutationHooks.push(...currentBlock);
    else if (currentBlockType === 'type') types.push(...currentBlock);
}

// Create directory
mkdirSync(dirPath, { recursive: true });

// Determine import lines needed (shared across all files)
const importLines = imports.filter(l => l.match(/^import\s/));

// Write types.ts
if (types.length > 0) {
    const typesContent = types.join('\n') + '\n';
    writeFileSync(join(dirPath, 'types.ts'), typesContent);
    console.log(`Created types.ts (${types.length} lines)`);
}

// Write queries file
if (queryHooks.length > 0) {
    const queryImports = importLines.filter(l =>
        l.includes('useQuery') || l.includes('supabase') || l.includes('useAuth') ||
        l.includes('useBranch') || l.includes('useTranslation') || l.includes('toast')
    );
    const queryContent = queryImports.join('\n') + '\n' +
        (types.length > 0 ? `import type { ${exportedTypes.join(', ')} } from './types';\n` : '') +
        '\n' + queryHooks.join('\n') + '\n';
    writeFileSync(join(dirPath, `${fileName}-queries.ts`), queryContent);
    console.log(`Created ${fileName}-queries.ts (${queryHooks.length} lines)`);
}

// Write mutations file
if (mutationHooks.length > 0) {
    const mutationImports = importLines.filter(l =>
        l.includes('useMutation') || l.includes('useQueryClient') ||
        l.includes('supabase') || l.includes('useAuth') ||
        l.includes('useBranch') || l.includes('useTranslation') ||
        l.includes('toast') || l.includes('useState') || l.includes('useCallback')
    );
    const mutationContent = mutationImports.join('\n') + '\n' +
        (types.length > 0 ? `import type { ${exportedTypes.join(', ')} } from './types';\n` : '') +
        '\n' + mutationHooks.join('\n') + '\n';
    writeFileSync(join(dirPath, `${fileName}-mutations.ts`), mutationContent);
    console.log(`Created ${fileName}-mutations.ts (${mutationHooks.length} lines)`);
}

// Write barrel index.ts
const barrelLines = [];
if (exportedTypes.length > 0) {
    barrelLines.push(`export type { ${exportedTypes.join(', ')} } from './types';`);
}
if (queryHooks.length > 0) {
    const queryExports = exportedNames.filter(name => {
        // Check if this name appears in query hooks
        return queryHooks.some(line => line.includes(`function ${name}(`) || line.includes(`const ${name}`));
    });
    if (queryExports.length > 0) {
        barrelLines.push(`export { ${queryExports.join(', ')} } from './${fileName}-queries';`);
    }
}
if (mutationHooks.length > 0) {
    const mutationExports = exportedNames.filter(name => {
        return mutationHooks.some(line => line.includes(`function ${name}(`) || line.includes(`const ${name}`));
    });
    if (mutationExports.length > 0) {
        barrelLines.push(`export { ${mutationExports.join(', ')} } from './${fileName}-mutations';`);
    }
}

writeFileSync(join(dirPath, 'index.ts'), barrelLines.join('\n') + '\n');
console.log(`Created index.ts with ${barrelLines.length} export lines`);

// Summary
console.log(`\nSplit ${fileName}.ts into ${dirPath}/`);
console.log(`  Types: ${exportedTypes.length} exported types`);
console.log(`  Query hooks: ${queryHooks.length} lines`);
console.log(`  Mutation hooks: ${mutationHooks.length} lines`);
console.log(`  Total exported functions: ${exportedNames.length}`);
