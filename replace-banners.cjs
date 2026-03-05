const fs = require('fs');

const file = 'src/pages/incidents/InvestigationWorkspace.tsx';
let content = fs.readFileSync(file, 'utf8');

// Normalize line endings to avoid \r
content = content.replace(/\\r\\n/g, '\\n');

const target = `          {/* Warning if investigation not yet allowed */}
          {!investigationAllowed && (
            <Card className="border-warning/30 bg-warning/5">
              <CardContent className="py-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-warning/10">
                    <AlertCircle className="h-5 w-5 text-warning" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">
                      {t('investigation.workflow.pendingApproval', 'Pending Approval')}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {t('investigation.workflow.completeWorkflowFirst', 'Complete the approval workflow above before accessing investigation tools.')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Read-only oversight banner */}
          {investigationAllowed && editAccess.isReadOnly && !editAccess.isClosed && (
            <Alert className="border-info/30 bg-info/5">
              <Eye className="h-4 w-4 text-info" />
              <AlertDescription className="text-foreground">
                {editAccess.isOversightRole
                  ? t('investigation.readOnly.oversightBanner', 'You have read-only access to monitor this investigation. Only the assigned investigator can make changes.')
                  : t('investigation.readOnly.notAssigned', 'You are not the assigned investigator. Investigation data is read-only.')}
              </AlertDescription>
            </Alert>
          )}

          {/* Closed incident banner with reopen option */}
          {editAccess.isClosed && (
            <Alert className="border-success/30 bg-success/5">
              <Lock className="h-4 w-4 text-success" />
              <AlertDescription className="flex items-center justify-between text-foreground">
                <span>{t('investigation.readOnly.closedBanner', 'This incident is closed and all data is locked.')}</span>
                {editAccess.canReopen && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowReopenDialog(true)}
                    className="ms-4 border-success/30 hover:bg-success/10"
                  >
                    <RotateCcw className="h-4 w-4 me-2" />
                    {t('investigation.reopen.button', 'Reopen Investigation')}
                  </Button>
                )}
              </AlertDescription>
            </Alert>
          )}`;

const replacement = `          <InvestigationWorkspaceBanners
            investigationAllowed={investigationAllowed}
            editAccess={editAccess}
            setShowReopenDialog={setShowReopenDialog}
          />`;

if (content.includes(target)) {
  content = content.replace(target, replacement);

  // Add import
  const lastImportIdx = content.lastIndexOf('import');
  const nextNewline = content.indexOf('\\n', lastImportIdx);
  content = content.substring(0, nextNewline + 1) + 'import { InvestigationWorkspaceBanners } from "./InvestigationWorkspace/components/InvestigationWorkspaceBanners";\\n' + content.substring(nextNewline + 1);

  fs.writeFileSync(file, content);
  console.log('Replaced successfully');
} else {
  console.log('Target not found within content!');
}
