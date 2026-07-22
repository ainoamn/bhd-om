import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  cleanStaleRenewalDrafts,
  contractPayloadToManagedUnitRow,
  enrichSavedContractsMapDeposits,
  isStaleCompletedRenewalDraft,
  reconcileManagedUnitsFromSavedContracts,
} from '../../lib/server/legacyOperationalRepair';

describe('legacyOperationalRepair', () => {
  it('isStaleCompletedRenewalDraft detects completed renewal matching saved contract', () => {
    const draft = {
      payload: {
        agreementNo: 'TC-06-2026-5022',
        startDate: '2025-11-20',
        endDate: '2026-02-19',
        isRenewalDraft: false,
        contractSavedStatus: 'active',
      },
    };
    const saved = {
      lifecycleStatus: 'active',
      payload: {
        agreementNo: 'TC-06-2026-5022',
        startDate: '2025-11-20',
        endDate: '2026-02-19',
        contractSavedStatus: 'active',
      },
    };
    assert.equal(isStaleCompletedRenewalDraft(draft, saved), true);
  });

  it('enrichSavedContractsMapDeposits injects deposit from accounting registry', () => {
    const map = {
      'Bld A\t101': {
        payload: {
          buildingNo: 'Bld A',
          flatNo: '101',
          agreementNo: 'TC-1',
        },
      },
    };
    const reg = {
      deposits: [
        {
          unitKey: 'Bld A\t101',
          type: 'security',
          amount: '750',
          reference: 'DEP-750',
        },
      ],
    };
    const { map: next, enriched } = enrichSavedContractsMapDeposits(map, reg);
    assert.equal(enriched, 1);
    assert.equal(next['Bld A\t101']?.payload?.depositAmount, '750');
    assert.equal(next['Bld A\t101']?.payload?.depositReceiptRef, 'DEP-750');
  });

  it('reconcileManagedUnitsFromSavedContracts marks rented unit and adds missing row', () => {
    const savedMap = {
      'Tower 1\t88': {
        lifecycleStatus: 'active',
        payload: {
          buildingNo: 'Tower 1',
          flatNo: '88',
          tenantNameAr: 'Tenant A',
          agreementNo: 'TC-88',
          startDate: '2025-01-01',
          endDate: '2025-12-31',
          monthlyRent: '500',
        },
      },
    };
    const managedBefore = [
      {
        building: 'Tower 1',
        unit: '88',
        status: 'Vacant',
        tenant: '',
      },
    ];
    const { units, updated, added } = reconcileManagedUnitsFromSavedContracts(managedBefore, savedMap, {});
    assert.equal(updated, 1);
    assert.equal(added, 0);
    assert.equal(units[0]?.status, 'Rented');
    assert.equal(units[0]?.tenant, 'Tenant A');
    assert.equal(units[0]?.agreementNo, 'TC-88');
  });

  it('cleanStaleRenewalDrafts removes stale entries', () => {
    const renewalMap = {
      'Tower 1\t88': {
        payload: {
          agreementNo: 'TC-88',
          startDate: '2025-01-01',
          endDate: '2025-12-31',
          isRenewalDraft: false,
          contractSavedStatus: 'active',
        },
      },
    };
    const savedMap = {
      'Tower 1\t88': {
        lifecycleStatus: 'active',
        payload: {
          agreementNo: 'TC-88',
          startDate: '2025-01-01',
          endDate: '2025-12-31',
          contractSavedStatus: 'active',
        },
      },
    };
    const { map, removed } = cleanStaleRenewalDrafts(renewalMap, savedMap);
    assert.deepEqual(removed, ['Tower 1\t88']);
    assert.equal(map['Tower 1\t88'], undefined);
  });

  it('contractPayloadToManagedUnitRow builds dashboard row shape', () => {
    const row = contractPayloadToManagedUnitRow({
      buildingNo: 'Bld',
      flatNo: '5',
      tenantNameAr: 'X',
      agreementNo: 'TC-5',
      monthlyRent: '400',
      startDate: '2025-01-01',
      endDate: '2025-12-31',
    });
    assert.ok(row);
    assert.equal(row?.building, 'Bld');
    assert.equal(row?.unit, '5');
    assert.equal(row?.status, 'Rented');
    assert.equal(row?.monthlyRent, 400);
  });

  it('operationalRepairNeedsChanges detects pending work', async () => {
    const { operationalRepairNeedsChanges } = await import('../../lib/server/legacyOperationalRepair');
    assert.equal(
      operationalRepairNeedsChanges({
        dryRun: true,
        contractsLifecycle: { changed: false, groupsProcessed: 1 },
        depositsEnriched: 0,
        renewalDraftsRemoved: [],
        managedUnitsUpdated: 0,
        managedUnitsAdded: 0,
        persisted: false,
        keysWritten: [],
      }),
      false
    );
    assert.equal(
      operationalRepairNeedsChanges({
        dryRun: true,
        contractsLifecycle: { changed: false, groupsProcessed: 1 },
        depositsEnriched: 0,
        renewalDraftsRemoved: ['A\t1'],
        managedUnitsUpdated: 0,
        managedUnitsAdded: 0,
        persisted: false,
        keysWritten: [],
      }),
      true
    );
  });
});
