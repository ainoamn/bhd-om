import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { ACCOUNTING_HUB_REFACTOR_MANIFEST } from '../../lib/accounting/ui/hubRefactorManifest';
import { ACCOUNTING_HUB_TAB_IDS, ACCOUNTING_HUB_MODAL_ACTION_TABS } from '../../lib/accounting/ui/hubTabIds';
import { ACCOUNTING_HUB_CONTROLLER_KEYS } from '../../lib/accounting/hooks/accountingHubControllerKeys';

const root = process.cwd();

describe('accounting hub refactor closure (Phase 20)', () => {
  it('manifest declares phase 20 complete', () => {
    assert.equal(ACCOUNTING_HUB_REFACTOR_MANIFEST.completedPhase, 20);
    assert.equal(ACCOUNTING_HUB_REFACTOR_MANIFEST.expectedTabCount, 13);
  });

  it('entry point remains thin orchestrator', () => {
    const file = join(root, ACCOUNTING_HUB_REFACTOR_MANIFEST.entryPointFile);
    assert.ok(existsSync(file), 'AccountingSection.tsx must exist');
    const lines = readFileSync(file, 'utf8').split('\n');
    assert.ok(
      lines.length <= ACCOUNTING_HUB_REFACTOR_MANIFEST.entryPointMaxLines,
      `entry point has ${lines.length} lines (max ${ACCOUNTING_HUB_REFACTOR_MANIFEST.entryPointMaxLines})`
    );
    const body = readFileSync(file, 'utf8');
    assert.match(body, /useAccountingHubController/);
    assert.match(body, /AccountingHubShell/);
  });

  it('tab and controller counts match manifest', () => {
    assert.equal(ACCOUNTING_HUB_TAB_IDS.length, ACCOUNTING_HUB_REFACTOR_MANIFEST.expectedTabCount);
    assert.equal(ACCOUNTING_HUB_CONTROLLER_KEYS.length, ACCOUNTING_HUB_REFACTOR_MANIFEST.expectedControllerKeyCount);
    assert.equal(ACCOUNTING_HUB_MODAL_ACTION_TABS.length, ACCOUNTING_HUB_REFACTOR_MANIFEST.expectedModalActionTabCount);
  });

  it('refactor documentation files exist', () => {
    for (const doc of ACCOUNTING_HUB_REFACTOR_MANIFEST.docs) {
      assert.ok(existsSync(join(root, doc)), `missing doc: ${doc}`);
    }
  });

  it('accounting hub unit and e2e test files exist', () => {
    for (const pattern of ACCOUNTING_HUB_REFACTOR_MANIFEST.unitTestPatterns) {
      assert.ok(existsSync(join(root, 'tests/unit', pattern)), `missing unit test: ${pattern}`);
    }
    for (const spec of ACCOUNTING_HUB_REFACTOR_MANIFEST.e2eSpecs) {
      assert.ok(existsSync(join(root, spec)), `missing e2e: ${spec}`);
    }
  });
});
