import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  ShadingType,
  convertInchesToTwip,
} from 'docx';

interface TestCase {
  id: string;
  scenario: string;
  preconditions: string;
  steps: string[];
  expectedResult: string;
  status?: 'pass' | 'fail' | 'pending';
}

interface TestPhase {
  name: string;
  nameAr: string;
  testCases: TestCase[];
}

const createHeaderCell = (text: string, width?: number): TableCell => {
  return new TableCell({
    children: [
      new Paragraph({
        children: [new TextRun({ text, bold: true, size: 20, color: 'FFFFFF' })],
        alignment: AlignmentType.CENTER,
      }),
    ],
    shading: { fill: '2563EB', type: ShadingType.SOLID, color: '2563EB' },
    width: width ? { size: width, type: WidthType.PERCENTAGE } : undefined,
  });
};

const createCell = (text: string, width?: number): TableCell => {
  return new TableCell({
    children: [
      new Paragraph({
        children: [new TextRun({ text, size: 20 })],
      }),
    ],
    width: width ? { size: width, type: WidthType.PERCENTAGE } : undefined,
  });
};

const createStepsCell = (steps: string[]): TableCell => {
  return new TableCell({
    children: steps.map(
      (step, index) =>
        new Paragraph({
          children: [new TextRun({ text: `${index + 1}. ${step}`, size: 20 })],
        })
    ),
  });
};

const testPhases: TestPhase[] = [
  {
    name: 'Phase 1: Event Reporting',
    nameAr: 'المرحلة 1: الإبلاغ عن الحدث',
    testCases: [
      {
        id: 'TC-001',
        scenario: 'Submit new incident report',
        preconditions: 'User is logged in with reporter role',
        steps: [
          'Navigate to Incidents module',
          'Click "Report New Incident"',
          'Fill required fields (title, description, date, location)',
          'Upload supporting photos/documents',
          'Click Submit',
        ],
        expectedResult: 'Incident created with status "submitted", reference ID generated',
      },
      {
        id: 'TC-002',
        scenario: 'Submit incident during active event',
        preconditions: 'Active special event exists, user logged in',
        steps: [
          'Navigate to incident form',
          'Verify active event banner displays',
          'Complete incident form',
          'Submit incident',
        ],
        expectedResult: 'Incident linked to active event, event_id populated',
      },
      {
        id: 'TC-003',
        scenario: 'Submit anonymous incident',
        preconditions: 'Anonymous reporting enabled for tenant',
        steps: [
          'Navigate to public incident form',
          'Complete incident without login',
          'Submit incident',
        ],
        expectedResult: 'Incident created with is_anonymous=true, reporter_id null',
      },
    ],
  },
  {
    name: 'Phase 2: HSSE Expert Screening',
    nameAr: 'المرحلة 2: فحص خبير السلامة',
    testCases: [
      {
        id: 'TC-004',
        scenario: 'Expert recommends investigation',
        preconditions: 'Incident in "submitted" status, user has hsse_expert role',
        steps: [
          'Navigate to incident details',
          'Review incident information',
          'Add screening notes',
          'Click "Recommend Investigation"',
        ],
        expectedResult: 'Status changes to "pending_dept_rep_approval"',
      },
      {
        id: 'TC-005',
        scenario: 'Expert returns to reporter',
        preconditions: 'Incident in "submitted" status',
        steps: [
          'Open incident details',
          'Click "Return to Reporter"',
          'Enter return reason',
          'Confirm action',
        ],
        expectedResult: 'Status changes to "returned_to_reporter"',
      },
      {
        id: 'TC-006',
        scenario: 'Expert rejects report',
        preconditions: 'Incident in "submitted" status',
        steps: [
          'Open incident details',
          'Click "Reject Report"',
          'Enter rejection reason',
          'Confirm rejection',
        ],
        expectedResult: 'Status changes to "rejected"',
      },
      {
        id: 'TC-007',
        scenario: 'Expert assigns observation actions',
        preconditions: 'Observation-type incident submitted',
        steps: [
          'Open observation details',
          'Click "Assign Actions"',
          'Select department/assignee',
          'Define corrective actions',
        ],
        expectedResult: 'Status changes to "no_investigation_needed", actions created',
      },
    ],
  },
  {
    name: 'Phase 3: Reporter Response',
    nameAr: 'المرحلة 3: رد المُبلِّغ',
    testCases: [
      {
        id: 'TC-008',
        scenario: 'Reporter resubmits with corrections',
        preconditions: 'Incident in "returned_to_reporter" status',
        steps: [
          'Reporter opens returned incident',
          'Reviews return reason',
          'Updates incident details',
          'Clicks "Resubmit"',
        ],
        expectedResult: 'Status changes to "submitted", return_count incremented',
      },
      {
        id: 'TC-009',
        scenario: 'Reporter disputes rejection',
        preconditions: 'Incident in "rejected" status, within dispute window',
        steps: [
          'Reporter opens rejected incident',
          'Clicks "Dispute Rejection"',
          'Enters dispute justification',
          'Submits dispute',
        ],
        expectedResult: 'Status changes to "pending_hsse_manager_escalation"',
      },
    ],
  },
  {
    name: 'Phase 4: Department Representative Approval',
    nameAr: 'المرحلة 4: موافقة ممثل القسم',
    testCases: [
      {
        id: 'TC-010',
        scenario: 'Dept Rep approves investigation',
        preconditions: 'Incident in "pending_dept_rep_approval", user is dept rep',
        steps: [
          'Open incident requiring approval',
          'Review HSSE expert notes',
          'Click "Approve Investigation"',
        ],
        expectedResult: 'Status changes to "pending_manager_approval"',
      },
      {
        id: 'TC-011',
        scenario: 'Dept Rep returns for more info',
        preconditions: 'Incident in "pending_dept_rep_approval"',
        steps: [
          'Open incident',
          'Click "Request More Information"',
          'Enter reason',
          'Submit',
        ],
        expectedResult: 'Status changes to "returned_to_reporter"',
      },
    ],
  },
  {
    name: 'Phase 5: Manager Approval',
    nameAr: 'المرحلة 5: موافقة المدير',
    testCases: [
      {
        id: 'TC-012',
        scenario: 'Manager approves investigation',
        preconditions: 'Incident in "pending_manager_approval", user is manager',
        steps: [
          'Open pending incident',
          'Review all approval chain notes',
          'Click "Approve for Investigation"',
        ],
        expectedResult: 'Status changes to "approved_for_investigation"',
      },
      {
        id: 'TC-013',
        scenario: 'Manager rejects investigation',
        preconditions: 'Incident in "pending_manager_approval"',
        steps: [
          'Open incident',
          'Click "Reject Investigation"',
          'Enter rejection reason',
          'Confirm',
        ],
        expectedResult: 'Status changes to "manager_rejected", can be disputed',
      },
    ],
  },
  {
    name: 'Phase 6: HSSE Manager Escalation',
    nameAr: 'المرحلة 6: تصعيد مدير السلامة',
    testCases: [
      {
        id: 'TC-014',
        scenario: 'HSSE Manager overrides rejection',
        preconditions: 'Incident in "pending_hsse_manager_escalation"',
        steps: [
          'HSSE Manager opens escalated incident',
          'Reviews rejection and dispute',
          'Clicks "Override - Proceed with Investigation"',
          'Enters justification',
        ],
        expectedResult: 'Status changes to "approved_for_investigation"',
      },
      {
        id: 'TC-015',
        scenario: 'HSSE Manager maintains rejection',
        preconditions: 'Incident in "pending_hsse_manager_escalation"',
        steps: [
          'Review escalation details',
          'Click "Maintain Rejection"',
          'Enter final decision notes',
        ],
        expectedResult: 'Status changes to "closed", closure_reason set',
      },
    ],
  },
  {
    name: 'Phase 7: Investigation Assignment',
    nameAr: 'المرحلة 7: تعيين التحقيق',
    testCases: [
      {
        id: 'TC-016',
        scenario: 'Assign lead investigator',
        preconditions: 'Incident "approved_for_investigation"',
        steps: [
          'Open approved incident',
          'Click "Assign Investigation Team"',
          'Select lead investigator',
          'Add team members if needed',
          'Set investigation deadline',
        ],
        expectedResult: 'Status changes to "investigation_in_progress"',
      },
    ],
  },
  {
    name: 'Phase 8: Investigation Process',
    nameAr: 'المرحلة 8: عملية التحقيق',
    testCases: [
      {
        id: 'TC-017',
        scenario: 'Conduct RCA analysis',
        preconditions: 'Investigation in progress, user is investigator',
        steps: [
          'Open investigation tab',
          'Select RCA methodology (5-Why, Fishbone)',
          'Document root causes',
          'Link contributing factors',
          'Save analysis',
        ],
        expectedResult: 'Root causes saved to incident_root_causes table',
      },
      {
        id: 'TC-018',
        scenario: 'Add corrective actions from investigation',
        preconditions: 'RCA completed',
        steps: [
          'Navigate to Actions tab',
          'Click "Add Corrective Action"',
          'Link to root cause',
          'Set assignee, priority, due date',
          'Save action',
        ],
        expectedResult: 'Action created with status "pending"',
      },
    ],
  },
  {
    name: 'Phase 9: Investigation Closure Request',
    nameAr: 'المرحلة 9: طلب إغلاق التحقيق',
    testCases: [
      {
        id: 'TC-019',
        scenario: 'Request investigation closure',
        preconditions: 'All mandatory fields completed, at least one action created',
        steps: [
          'Verify investigation completeness',
          'Click "Request Closure"',
          'Add closure summary',
          'Submit for approval',
        ],
        expectedResult: 'Status changes to "pending_closure_approval"',
      },
      {
        id: 'TC-020',
        scenario: 'Approve investigation closure',
        preconditions: 'Closure pending, user is HSSE Manager',
        steps: [
          'Review investigation report',
          'Verify all findings documented',
          'Click "Approve Closure"',
        ],
        expectedResult: 'Status changes to "investigation_closed"',
      },
    ],
  },
  {
    name: 'Phase 10: Corrective Action Lifecycle',
    nameAr: 'المرحلة 10: دورة حياة الإجراء التصحيحي',
    testCases: [
      {
        id: 'TC-021',
        scenario: 'Assignee completes action',
        preconditions: 'Action assigned, user is assignee',
        steps: [
          'Open assigned action',
          'Upload completion evidence',
          'Add completion notes',
          'Click "Mark Complete"',
        ],
        expectedResult: 'Action status changes to "pending_verification"',
      },
      {
        id: 'TC-022',
        scenario: 'Verifier approves completion',
        preconditions: 'Action pending verification, user is verifier',
        steps: [
          'Open action for verification',
          'Review evidence',
          'Click "Verify Complete"',
        ],
        expectedResult: 'Action status changes to "verified"',
      },
      {
        id: 'TC-023',
        scenario: 'Verifier returns action',
        preconditions: 'Action pending verification',
        steps: [
          'Review submitted evidence',
          'Click "Return for Rework"',
          'Enter return reason',
        ],
        expectedResult: 'Action status changes to "returned", assignee notified',
      },
      {
        id: 'TC-024',
        scenario: 'Request due date extension',
        preconditions: 'Action assigned, not yet due',
        steps: [
          'Open action',
          'Click "Request Extension"',
          'Enter new due date and reason',
          'Submit request',
        ],
        expectedResult: 'Extension request created, pending manager approval',
      },
    ],
  },
  {
    name: 'Phase 11: Final Incident Closure',
    nameAr: 'المرحلة 11: الإغلاق النهائي للحادث',
    testCases: [
      {
        id: 'TC-025',
        scenario: 'Close incident after all actions verified',
        preconditions: 'All corrective actions verified',
        steps: [
          'System detects all actions complete',
          'HSSE Manager reviews final status',
          'Click "Close Incident"',
          'Add final closure notes',
        ],
        expectedResult: 'Incident status changes to "closed"',
      },
      {
        id: 'TC-026',
        scenario: 'Reopen closed incident',
        preconditions: 'Incident closed, user is HSSE Manager',
        steps: [
          'Open closed incident',
          'Click "Reopen Incident"',
          'Enter reopen reason',
          'Confirm action',
        ],
        expectedResult: 'Incident reopened with appropriate status',
      },
    ],
  },
  // NEW: Observation Workflow Test Phases
  {
    name: 'Phase 12: Observation Workflow - Low Risk (Levels 1-2)',
    nameAr: 'المرحلة 12: سير عمل الملاحظات - خطر منخفض (المستوى 1-2)',
    testCases: [
      {
        id: 'TC-OBS-001',
        scenario: 'Submit Level 1/2 observation with Close on Spot',
        preconditions: 'User logged in, observation form open',
        steps: [
          'Select observation type',
          'Choose severity Level 1 or Level 2',
          'Enable "Close on Spot" toggle',
          'Upload photo evidence (required)',
          'Add resolution notes (required)',
          'Submit observation',
        ],
        expectedResult: 'Observation created with status "closed", closed_on_spot=true',
      },
      {
        id: 'TC-OBS-002',
        scenario: 'Verify photo required for close-on-spot',
        preconditions: 'Level 1/2 observation, Close on Spot enabled',
        steps: [
          'Complete observation form',
          'Enable Close on Spot without uploading photo',
          'Attempt to submit',
        ],
        expectedResult: 'Validation error: Photo evidence required for close-on-spot',
      },
      {
        id: 'TC-OBS-003',
        scenario: 'Verify Level 3+ cannot use close-on-spot',
        preconditions: 'Observation form open',
        steps: [
          'Select severity Level 3, 4, or 5',
          'Check Close on Spot toggle state',
        ],
        expectedResult: 'Close on Spot toggle is disabled/hidden for Level 3+',
      },
    ],
  },
  {
    name: 'Phase 13: Observation Workflow - Serious/Major Risk (Levels 3-4)',
    nameAr: 'المرحلة 13: سير عمل الملاحظات - خطر جسيم/كبير (المستوى 3-4)',
    testCases: [
      {
        id: 'TC-OBS-004',
        scenario: 'Submit Level 3/4 observation',
        preconditions: 'User logged in with reporter role',
        steps: [
          'Create new observation',
          'Select severity Level 3 or Level 4',
          'Complete required fields',
          'Submit observation',
        ],
        expectedResult: 'Observation created, goes to action planning workflow',
      },
      {
        id: 'TC-OBS-005',
        scenario: 'HSSE Expert validates L3/L4 observation actions',
        preconditions: 'L3/L4 observation with all actions verified',
        steps: [
          'HSSE Expert opens observation',
          'Reviews all corrective actions',
          'Verifies actions are complete',
          'Clicks "Accept Risk & Actions"',
        ],
        expectedResult: 'Status changes to "closed" (auto-close after HSSE validation)',
      },
      {
        id: 'TC-OBS-006',
        scenario: 'HSSE Expert returns observation for more actions',
        preconditions: 'L3/L4 observation pending validation',
        steps: [
          'HSSE Expert reviews observation',
          'Finds actions insufficient',
          'Clicks "Return for Additional Actions"',
          'Enters return reason',
        ],
        expectedResult: 'Status changes to "observation_actions_pending"',
      },
    ],
  },
  {
    name: 'Phase 14: Observation Workflow - Catastrophic Risk (Level 5)',
    nameAr: 'المرحلة 14: سير عمل الملاحظات - خطر كارثي (المستوى 5)',
    testCases: [
      {
        id: 'TC-OBS-007',
        scenario: 'Submit Level 5 observation',
        preconditions: 'User logged in with reporter role',
        steps: [
          'Create new observation',
          'Select severity Level 5 (Catastrophic)',
          'Complete required fields',
          'Submit observation',
        ],
        expectedResult: 'Observation created, closure_requires_manager=true',
      },
      {
        id: 'TC-OBS-008',
        scenario: 'HSSE Expert validates L5 observation',
        preconditions: 'L5 observation with all actions verified',
        steps: [
          'HSSE Expert opens L5 observation',
          'Reviews and validates all actions',
          'Clicks "Accept Risk & Actions"',
        ],
        expectedResult: 'Status changes to "pending_final_closure" (not auto-closed)',
      },
      {
        id: 'TC-OBS-009',
        scenario: 'HSSE Manager final closure for L5',
        preconditions: 'L5 observation in "pending_final_closure" status',
        steps: [
          'HSSE Manager opens observation',
          'Reviews full history and actions',
          'Adds final closure notes',
          'Clicks "Finalize & Close"',
        ],
        expectedResult: 'Observation closed, audit log created with manager signature',
      },
      {
        id: 'TC-OBS-010',
        scenario: 'Verify HSSE Manager notification for L5',
        preconditions: 'L5 observation submitted',
        steps: [
          'Submit new L5 observation',
          'Check HSSE Manager notification inbox',
        ],
        expectedResult: 'HSSE Manager receives immediate WhatsApp and Email notification',
      },
    ],
  },
  {
    name: 'Phase 15: 5-Level Severity System',
    nameAr: 'المرحلة 15: نظام الخطورة من 5 مستويات',
    testCases: [
      {
        id: 'TC-SEV-001',
        scenario: 'Verify severity badge colors',
        preconditions: 'Observation list with various severities',
        steps: [
          'Navigate to observation list',
          'Verify Level 1 shows emerald/green badge',
          'Verify Level 2 shows yellow badge',
          'Verify Level 3 shows orange badge',
          'Verify Level 4 shows red badge',
          'Verify Level 5 shows dark red badge',
        ],
        expectedResult: 'All severity levels display correct colors per design spec',
      },
      {
        id: 'TC-SEV-002',
        scenario: 'Verify severity selector in form',
        preconditions: 'Observation form open',
        steps: [
          'View severity selection options',
          'Verify 5 levels displayed with descriptions',
          'Select each level and verify UI feedback',
        ],
        expectedResult: 'All 5 severity levels selectable with proper descriptions',
      },
    ],
  },
];

const statusReference = [
  { status: 'draft', description: 'Report being prepared', arabicDesc: 'التقرير قيد الإعداد' },
  { status: 'submitted', description: 'Awaiting HSSE expert screening', arabicDesc: 'في انتظار فحص خبير السلامة' },
  { status: 'pending_review', description: 'Under HSSE expert review', arabicDesc: 'تحت مراجعة خبير السلامة' },
  { status: 'returned_to_reporter', description: 'Returned for corrections', arabicDesc: 'أُعيد للتصحيح' },
  { status: 'rejected', description: 'Report rejected', arabicDesc: 'التقرير مرفوض' },
  { status: 'pending_dept_rep_approval', description: 'Awaiting dept rep approval', arabicDesc: 'في انتظار موافقة ممثل القسم' },
  { status: 'pending_manager_approval', description: 'Awaiting manager approval', arabicDesc: 'في انتظار موافقة المدير' },
  { status: 'manager_rejected', description: 'Investigation rejected by manager', arabicDesc: 'رفض المدير التحقيق' },
  { status: 'pending_hsse_manager_escalation', description: 'Escalated to HSSE Manager', arabicDesc: 'مُصعَّد لمدير السلامة' },
  { status: 'approved_for_investigation', description: 'Ready for investigation', arabicDesc: 'جاهز للتحقيق' },
  { status: 'investigation_in_progress', description: 'Investigation active', arabicDesc: 'التحقيق جارٍ' },
  { status: 'pending_closure_approval', description: 'Closure pending approval', arabicDesc: 'الإغلاق في انتظار الموافقة' },
  { status: 'investigation_closed', description: 'Investigation complete', arabicDesc: 'اكتمل التحقيق' },
  { status: 'no_investigation_needed', description: 'Observation with actions', arabicDesc: 'ملاحظة مع إجراءات' },
  { status: 'pending_hsse_validation', description: 'Awaiting HSSE Expert validation', arabicDesc: 'في انتظار تحقق خبير السلامة' },
  { status: 'pending_final_closure', description: 'Awaiting HSSE Manager final closure', arabicDesc: 'في انتظار الإغلاق النهائي من مدير السلامة' },
  { status: 'closed', description: 'Incident fully closed', arabicDesc: 'الحادث مُغلق بالكامل' },
];

const rolePermissions = [
  { role: 'Reporter', report: '✓', screen: '✗', approveDept: '✗', approveMgr: '✗', investigate: '✗', closeAction: '✓ (own)' },
  { role: 'HSSE Expert', report: '✓', screen: '✓', approveDept: '✗', approveMgr: '✗', investigate: '✓', closeAction: '✓' },
  { role: 'Dept Rep', report: '✓', screen: '✗', approveDept: '✓', approveMgr: '✗', investigate: '✗', closeAction: '✗' },
  { role: 'Manager', report: '✓', screen: '✗', approveDept: '✗', approveMgr: '✓', investigate: '✗', closeAction: '✗' },
  { role: 'HSSE Manager', report: '✓', screen: '✓', approveDept: '✓', approveMgr: '✓', investigate: '✓', closeAction: '✓' },
  { role: 'Admin', report: '✓', screen: '✓', approveDept: '✓', approveMgr: '✓', investigate: '✓', closeAction: '✓' },
];

export async function generateHSSETestDocument(): Promise<Blob> {
  const sections: (Paragraph | Table)[] = [];
  // Title
  sections.push(
    new Paragraph({
      children: [
        new TextRun({
          text: 'HSSE Event Model - Functional Test Document',
          bold: true,
          size: 48,
          color: '1E40AF',
        }),
      ],
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    })
  );

  // Arabic Title
  sections.push(
    new Paragraph({
      children: [
        new TextRun({
          text: 'وثيقة اختبار نموذج أحداث السلامة والصحة المهنية والبيئة',
          bold: true,
          size: 36,
          color: '1E40AF',
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    })
  );

  // Document Info
  sections.push(
    new Paragraph({
      children: [
        new TextRun({ text: 'Document Version: ', bold: true, size: 22 }),
        new TextRun({ text: '1.0', size: 22 }),
      ],
    })
  );
  sections.push(
    new Paragraph({
      children: [
        new TextRun({ text: 'Date: ', bold: true, size: 22 }),
        new TextRun({ text: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }), size: 22 }),
      ],
      spacing: { after: 400 },
    })
  );

  // Table of Contents heading
  sections.push(
    new Paragraph({
      children: [new TextRun({ text: 'Table of Contents', bold: true, size: 28 })],
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 300, after: 200 },
    })
  );

  // TOC items
  const tocItems = [
    '1. Workflow Overview',
    '2. Test Phases & Scenarios',
    '3. Status Reference Table',
    '4. Role Permissions Matrix',
    '5. Test Execution Checklist',
  ];
  tocItems.forEach((item) => {
    sections.push(
      new Paragraph({
        children: [new TextRun({ text: item, size: 22 })],
        spacing: { after: 100 },
      })
    );
  });

  // Section 1: Workflow Overview
  sections.push(
    new Paragraph({
      children: [new TextRun({ text: '1. Workflow Overview', bold: true, size: 28 })],
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 400, after: 200 },
      pageBreakBefore: true,
    })
  );

  sections.push(
    new Paragraph({
      children: [
        new TextRun({
          text: 'This document covers the complete HSSE incident lifecycle from initial reporting through investigation closure and corrective action completion.',
          size: 22,
        }),
      ],
      spacing: { after: 200 },
    })
  );

  const workflowSteps = [
    'Event Reporting → HSSE Expert Screening → Approval Chain → Investigation → Closure',
    'Each phase has specific roles, permissions, and validation rules',
    'Corrective actions follow their own lifecycle within the incident',
  ];
  workflowSteps.forEach((step) => {
    sections.push(
      new Paragraph({
        children: [new TextRun({ text: `• ${step}`, size: 22 })],
        spacing: { after: 100 },
      })
    );
  });

  // Section 2: Test Phases
  sections.push(
    new Paragraph({
      children: [new TextRun({ text: '2. Test Phases & Scenarios', bold: true, size: 28 })],
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 400, after: 200 },
      pageBreakBefore: true,
    })
  );

  // Generate test case tables for each phase
  for (const phase of testPhases) {
    sections.push(
      new Paragraph({
        children: [
          new TextRun({ text: phase.name, bold: true, size: 24 }),
          new TextRun({ text: ` - ${phase.nameAr}`, size: 24 }),
        ],
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 300, after: 200 },
      })
    );

    // Create table for test cases
    const tableRows: TableRow[] = [
      new TableRow({
        children: [
          createHeaderCell('Test ID', 10),
          createHeaderCell('Scenario', 20),
          createHeaderCell('Preconditions', 20),
          createHeaderCell('Steps', 25),
          createHeaderCell('Expected Result', 25),
        ],
      }),
    ];

    for (const tc of phase.testCases) {
      tableRows.push(
        new TableRow({
          children: [
            createCell(tc.id),
            createCell(tc.scenario),
            createCell(tc.preconditions),
            createStepsCell(tc.steps),
            createCell(tc.expectedResult),
          ],
        })
      );
    }

    sections.push(
      new Table({
        rows: tableRows,
        width: { size: 100, type: WidthType.PERCENTAGE },
      })
    );

    sections.push(new Paragraph({ children: [], spacing: { after: 200 } }));
  }

  // Section 3: Status Reference
  sections.push(
    new Paragraph({
      children: [new TextRun({ text: '3. Status Reference Table', bold: true, size: 28 })],
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 400, after: 200 },
      pageBreakBefore: true,
    })
  );

  const statusTableRows: TableRow[] = [
    new TableRow({
      children: [
        createHeaderCell('Status', 30),
        createHeaderCell('Description', 35),
        createHeaderCell('الوصف بالعربية', 35),
      ],
    }),
  ];

  for (const status of statusReference) {
    statusTableRows.push(
      new TableRow({
        children: [
          createCell(status.status),
          createCell(status.description),
          createCell(status.arabicDesc),
        ],
      })
    );
  }

  sections.push(
    new Table({
      rows: statusTableRows,
      width: { size: 100, type: WidthType.PERCENTAGE },
    })
  );

  // Section 4: Role Permissions
  sections.push(
    new Paragraph({
      children: [new TextRun({ text: '4. Role Permissions Matrix', bold: true, size: 28 })],
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 400, after: 200 },
      pageBreakBefore: true,
    })
  );

  const roleTableRows: TableRow[] = [
    new TableRow({
      children: [
        createHeaderCell('Role'),
        createHeaderCell('Report'),
        createHeaderCell('Screen'),
        createHeaderCell('Approve (Dept)'),
        createHeaderCell('Approve (Mgr)'),
        createHeaderCell('Investigate'),
        createHeaderCell('Close Action'),
      ],
    }),
  ];

  for (const role of rolePermissions) {
    roleTableRows.push(
      new TableRow({
        children: [
          createCell(role.role),
          createCell(role.report),
          createCell(role.screen),
          createCell(role.approveDept),
          createCell(role.approveMgr),
          createCell(role.investigate),
          createCell(role.closeAction),
        ],
      })
    );
  }

  sections.push(
    new Table({
      rows: roleTableRows,
      width: { size: 100, type: WidthType.PERCENTAGE },
    })
  );

  // Section 5: Test Execution Checklist
  sections.push(
    new Paragraph({
      children: [new TextRun({ text: '5. Test Execution Checklist', bold: true, size: 28 })],
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 400, after: 200 },
      pageBreakBefore: true,
    })
  );

  const checklistItems = [
    '☐ Create test users for each role (Reporter, HSSE Expert, Dept Rep, Manager, HSSE Manager)',
    '☐ Configure test tenant with all required settings',
    '☐ Verify notification matrix is configured',
    '☐ Test each phase sequentially with appropriate user',
    '☐ Document any deviations or issues found',
    '☐ Verify Arabic language support in all screens',
    '☐ Test RTL layout in all components',
    '☐ Verify email/SMS notifications are triggered',
    '☐ Test attachment upload and download',
    '☐ Verify audit trail entries are created',
  ];

  for (const item of checklistItems) {
    sections.push(
      new Paragraph({
        children: [new TextRun({ text: item, size: 22 })],
        spacing: { after: 100 },
      })
    );
  }

  // Footer
  sections.push(
    new Paragraph({
      children: [
        new TextRun({
          text: '--- End of Document ---',
          italics: true,
          size: 20,
          color: '666666',
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { before: 400 },
    })
  );

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1),
              right: convertInchesToTwip(1),
              bottom: convertInchesToTwip(1),
              left: convertInchesToTwip(1),
            },
          },
        },
        children: sections,
      },
    ],
  });

  return await Packer.toBlob(doc);
}

export function downloadHSSETestDocument(blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `HSSE_Event_Test_Document_${new Date().toISOString().split('T')[0]}.docx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
