/** Manifest for accounting hub refactor (Phases 6–20) — used by closure tests. */
export const ACCOUNTING_HUB_REFACTOR_MANIFEST = {
  version: '1.0',
  completedPhase: 20,
  completedDate: '2026-07-14',
  entryPointFile: 'components/admin/AccountingSection.tsx',
  /** Max total lines in entry point (orchestrator only). */
  entryPointMaxLines: 15,
  expectedTabCount: 13,
  expectedControllerKeyCount: 15,
  expectedModalActionTabCount: 4,
  docs: [
    'docs/ACCOUNTING-HUB-UI.md',
    'docs/ACCOUNTING-HUB-MAINTENANCE.md',
    'docs/ACCOUNTING-HUB-REFACTOR-COMPLETE.md',
    'docs/ACCOUNTING_ARCHITECTURE.md',
  ],
  unitTestPatterns: [
    'accountingHubComposition.test.ts',
    'accountingHubRefactorComplete.test.ts',
    'hubTabIds.test.ts',
    'formFactories.test.ts',
    'buildAccountingHubPath.test.ts',
    'monthlyTrends.test.ts',
    'journalAccountSuggest.test.ts',
  ],
  e2eSpecs: ['tests/e2e/accounting-hub.spec.ts', 'tests/e2e/api-accounting-reports.spec.ts'],
} as const;

export type AccountingHubRefactorManifest = typeof ACCOUNTING_HUB_REFACTOR_MANIFEST;
