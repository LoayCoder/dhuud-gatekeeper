import fs from 'fs';
import path from 'path';

const srcDir = path.join(process.cwd(), 'src');

const report = {
    check1: {
        A: [], // .tsx > 800
        B: [], // .ts hook > 300
        C: [], // .ts service > 300
    },
    check2: {
        A: [], // domain folders in components
        B: [], // domain files/folders in hooks
        C: [], // anything other than supabaseClient.ts in services
        D: [], // missing domains in features
    },
    check3: {
        staleImports: []
    },
    check6: {
        totalSuppressions: 0,
        filesWithManySuppressions: []
    }
};

function walkSync(currentDirPath, callback) {
    fs.readdirSync(currentDirPath).forEach((name) => {
        const filePath = path.join(currentDirPath, name);
        const stat = fs.statSync(filePath);
        if (stat.isFile()) {
            callback(filePath, stat);
        } else if (stat.isDirectory()) {
            walkSync(filePath, callback);
        }
    });
}

const domainNames = [
    'incidents', 'investigation', 'contractors', 'admin',
    'security', 'assets', 'ptw', 'risk-assessment', 'users',
    'id-cards', 'inspections', 'observations', 'actions',
    'analytics', 'billing', 'documents', 'maps', 'parts',
    'hsse', 'executive', 'my-actions'
];

const hookDomainPrefixes = [
    'use-incident', 'use-investigation', 'use-contractor',
    'use-ptw', 'use-asset', 'use-risk', 'use-security',
    'use-notification', 'use-hsse', 'use-gate', 'use-user',
    'use-inspection', 'use-observation', 'use-action'
];

const staleImportPatterns = [
    "@/components/incidents/", "@/components/investigation/", "@/components/contractors/",
    "@/components/admin/", "@/components/security/", "@/components/assets/",
    "@/components/ptw/", "@/components/risk-assessment/", "@/components/users/",
    "@/components/id-cards/", "@/hooks/use-incident", "@/hooks/use-investigation",
    "@/hooks/use-hsse", "@/hooks/use-ptw", "@/hooks/use-asset", "@/hooks/use-risk",
    "@/hooks/use-gate", "@/hooks/use-notification", "@/services/incidents/",
    "@/services/contractors/", "@/services/admin/", "@/services/assets/"
];

walkSync(srcDir, (filePath) => {
    const relPath = path.relative(process.cwd(), filePath).replace(/\\/g, '/');
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const lineCount = lines.length;

    // Check 1: File Size
    if (relPath.endsWith('.tsx') && lineCount > 800) {
        report.check1.A.push(`${relPath} (${lineCount} lines)`);
    }
    if (relPath.includes('/hooks/') && relPath.endsWith('.ts') && lineCount > 300) {
        // Exclude .test.ts or other cases if needed, but strictly .ts hooks
        if (!relPath.endsWith('.d.ts') && !relPath.endsWith('.test.ts')) {
            report.check1.B.push(`${relPath} (${lineCount} lines)`);
        }
    }
    if (relPath.includes('/services/') && relPath.endsWith('.ts') && lineCount > 300) {
        if (!relPath.endsWith('.d.ts') && !relPath.endsWith('.test.ts')) {
            report.check1.C.push(`${relPath} (${lineCount} lines)`);
        }
    }

    // Check 3: Stale Imports
    staleImportPatterns.forEach(pattern => {
        if (content.includes(pattern)) {
            report.check3.staleImports.push(`${relPath} contains ${pattern}`);
        }
    });

    // Check 6: suppressions
    const suppressions = (content.match(/eslint-disable/g) || []).length;
    report.check6.totalSuppressions += suppressions;
    if (suppressions > 3) {
        report.check6.filesWithManySuppressions.push(`${relPath} (${suppressions})`);
    }
});

// Check 2A: domain folders in src/components
try {
    const compDirs = fs.readdirSync(path.join(srcDir, 'components'));
    compDirs.forEach(dir => {
        if (fs.statSync(path.join(srcDir, 'components', dir)).isDirectory()) {
            if (domainNames.includes(dir)) report.check2.A.push(`src/components/${dir}`);
        }
    });
} catch (e) { }

// Check 2B: domain files/folders in src/hooks
try {
    const hookItems = fs.readdirSync(path.join(srcDir, 'hooks'));
    hookItems.forEach(item => {
        if (hookDomainPrefixes.some(prefix => item.startsWith(prefix))) {
            report.check2.B.push(`src/hooks/${item}`);
        }
    });
} catch (e) { }

// Check 2C: src/services
try {
    const serviceItems = fs.readdirSync(path.join(srcDir, 'services'));
    serviceItems.forEach(item => {
        if (item !== 'supabaseClient.ts') {
            report.check2.C.push(`src/services/${item}`);
        }
    });
} catch (e) { }

// Check 2D: src/features domains complete
const requiredFeatures = [
    'incidents', 'investigation', 'contractors', 'admin',
    'security', 'assets', 'ptw', 'risk-assessment', 'notifications', 'users'
];
try {
    const presentFeatures = fs.readdirSync(path.join(srcDir, 'features'));
    requiredFeatures.forEach(feat => {
        if (!presentFeatures.includes(feat)) {
            report.check2.D.push(`Missing feature: ${feat}`);
        } else {
            ['components', 'hooks', 'services', 'index.ts'].forEach(sub => {
                try {
                    fs.statSync(path.join(srcDir, 'features', feat, sub));
                } catch (e) {
                    report.check2.D.push(`Feature ${feat} missing ${sub}`);
                }
            });
        }
    });
} catch (e) {
    report.check2.D.push(`src/features does not exist`);
}

console.log(JSON.stringify(report, null, 2));
