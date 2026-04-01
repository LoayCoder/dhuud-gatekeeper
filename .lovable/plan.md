

# Documentation Cleanup Plan

## What We're Doing
Cleaning up the root directory by keeping 12 specific .md files, deleting the rest, and removing ~90 temporary dev scripts/logs.

## Files to KEEP in Root (12 .md files)

| File | Reason |
|------|--------|
| `README.md` | GitHub requirement |
| `AGENTS.md` | AI agent context (referenced by project-knowledge) |
| `ACCEPTANCE_CRITERIA.md` | Acceptance criteria |
| `ARCHITECTURE.md` | System architecture |
| `HSSE_INCIDENT_LIFECYCLE_WORKFLOW.md` | Workflow documentation |
| `IMPLEMENTATION_PLAN.md` | Implementation plan |
| `HSSE-Audit-Execution-Plan.md` | Audit execution plan |
| `HSSE-Audit-Report-Branch-Mainv1-OfflineMood.md` | Branch audit report |
| `HSSE-E2E-Tests-Documentation.md` | E2E test documentation |
| `HSSE-Optimized-Execution-Plan.md` | Optimized execution plan |
| `AUDIT_REPORT_UPDATED.md` | Updated audit report |

Note: User mentioned `CLEANUP_DOCS_GUIDE.md` but it doesn't exist in the project. Will skip.

## Files to DELETE — Outdated .md (14 files)

`ARCHITECTURE_COMPLIANCE_AUDIT.md`, `AUDIT_REPORT.md`, `AUDIT_REPORT_2026-02.md`, `FINAL_AUDIT_REPORT.md`, `FIX_AND_ASSURANCE_PLAN.md`, `GATE_PASS_AUDIT_REPORT.md`, `GATE_PASS_FIX_REPORT.md`, `I18N_AUDIT_REPORT.md`, `ROLE_AUDIT_REPORT.md`, `SECURITY_HEADERS.md`, `TRANSLATION_AUDIT.md`, `TRANSLATION_AUDIT_REPORT_2025.md`, `WORKFLOW_AUDIT_REPORT.md`, `WORKFLOW_AUDIT_REPORT_CONTRACTOR.md`, `ZERO_TRUST_AUDIT_REPORT.md`

## Files to DELETE — Temporary Dev Scripts (~90 files)

All `.cjs`, `.mjs`, `.py`, `.ps1`, `.sh` one-off scripts (e.g., `split-*.cjs`, `fix_*.cjs`, `refactor-*.cjs`, `replace-*.cjs`, `tally.py`, `run_stats.sh`, etc.)

All temporary output/log files: `*.txt` (tsc.txt, eslint.txt, log.txt, etc.), `*.json` reports (eslint-report.json, large_files.json, etc.), `error-context.md`, `medium_forms_report.md`

Backup source files: `original_gate_qr.tsx`, `original_user_form.tsx`

One-off TypeScript debug scripts: `check_*.ts`, `debug_data.ts`, `test_*.ts`, `test_*.js`, `verify_rpc.ts`, `simple_check.ts`

## Files to KEEP in Root (non-.md, required by build)

`package.json`, `package-lock.json`, `bun.lock`, `bun.lockb`, `index.html`, `vite.config.ts`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`, `tailwind.config.ts`, `postcss.config.js`, `eslint.config.js`, `components.json`, `vitest.config.ts`, `playwright.config.ts`, `playwright-fixture.ts`, `.env`, `.gitignore`

## Files to KEEP in docs/

`docs/AI_LOGIN_PROMPT.md`, `docs/FRONTEND_PRD.md` — no changes needed.

## Summary

| Category | Before | After |
|----------|--------|-------|
| Root .md files | 27 | 12 |
| Temp scripts/logs | ~90 | 0 |
| docs/ files | 2 | 2 (unchanged) |

## Implementation

Delete all identified files in a single batch. No content merging needed since user wants to keep originals as-is.

