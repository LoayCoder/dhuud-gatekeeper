const fs = require('fs');

function getGitFile(path) {
    return fs.readFileSync(path, 'utf8').replace(/^\uFEFF/, '');
}

const origGateQR = getGitFile('original_gate_qr.tsx');
const helpersMatch = origGateQR.match(/\/\/ Audio feedback utility([\s\S]*?)export function GateQRScanner/);
if (helpersMatch) {
    const helpersContent = `import { CheckCircle2, XCircle, AlertTriangle, Clock } from 'lucide-react';
import { QRScanResult } from './types';
import { logger } from '@/lib/logger';

// Audio feedback utility` + helpersMatch[1] + `
export const getStatusConfig = (status: QRScanResult['status'], isOnSite?: boolean, t?: any) => {
  if (isOnSite) {
    return { 
      icon: AlertTriangle, 
      color: 'text-amber-600', 
      bg: 'bg-amber-50 dark:bg-amber-950/30', 
      border: 'border-amber-500', 
      label: t ? t('security.qrScanner.alreadyOnSite', 'ALREADY ON SITE') : 'ALREADY ON SITE' 
    };
  }
  
  switch (status) {
    case 'valid':
      return { icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-950/30', border: 'border-green-600', label: t ? t('security.qrScanner.valid', 'VALID') : 'VALID' };
    case 'expired':
      return { icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/30', border: 'border-amber-600', label: t ? t('security.qrScanner.expired', 'EXPIRED') : 'EXPIRED' };
    case 'revoked':
      return { icon: XCircle, color: 'text-destructive', bg: 'bg-destructive/10', border: 'border-destructive', label: t ? t('security.qrScanner.revoked', 'REVOKED') : 'REVOKED' };
    case 'used':
      return { icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/30', border: 'border-amber-600', label: t ? t('security.qrScanner.used', 'USED') : 'USED' };
    default:
      return { icon: XCircle, color: 'text-destructive', bg: 'bg-destructive/10', border: 'border-destructive', label: t ? t('security.qrScanner.invalid', 'INVALID') : 'INVALID' };
  }
};
`;
    fs.writeFileSync('src/features/security/components/GateQRScanner/hooks/helpers.ts', helpersContent);
    console.log('Fixed helpers.ts');
}

const jsxMatch = origGateQR.match(/(<Dialog open=\{open\} onOpenChange=\{handleClose\}>[\s\S]*?<\/Dialog>)/);
if (jsxMatch) {
    let existingShell = fs.readFileSync('src/features/security/components/GateQRScanner/GateQRScanner.tsx', 'utf8');
    existingShell = existingShell.replace(/<Dialog open=\{open\} onOpenChange=\{handleClose\}>\r?\n\s*\);\r?\n?/, jsxMatch[1] + '\n  );\n');
    existingShell = existingShell.replace(/getStatusConfig\(scanResult\.status, scanResult\.data\?\.isOnSite\)/g, "getStatusConfig(scanResult.status, scanResult.data?.isOnSite, t)");
    fs.writeFileSync('src/features/security/components/GateQRScanner/GateQRScanner.tsx', existingShell);
    console.log('Fixed GateQRScanner.tsx');
}

const origUserForm = getGitFile('original_user_form.tsx');
const dtMatch = origUserForm.match(/(<TabsContent value="details" className="space-y-4 mt-0">[\s\S]*?)<\/TabsContent>/);
if (dtMatch) {
    let dtShell = fs.readFileSync('src/features/users/components/UserFormDialog/components/DetailsTab.tsx', 'utf8');
    dtShell = dtShell.replace(/<TabsContent value="details" className="space-y-4 mt-0">[\s\S]*?<\/TabsContent>/, dtMatch[1] + '</TabsContent>');
    if (!dtShell.includes('</TabsContent>')) {
        dtShell = dtShell.replace(/<TabsContent value="details"[^>]+>[\s\S]*$/, dtMatch[1] + '\n</TabsContent>\n    </>\n  );\n}\n');
    }
    fs.writeFileSync('src/features/users/components/UserFormDialog/components/DetailsTab.tsx', dtShell);
    console.log('Fixed DetailsTab.tsx');
}
