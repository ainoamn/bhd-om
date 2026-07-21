import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mergeContractPayloads } from '../../lib/server/legacyKvMerge';

describe('mergeContractPayloads renewal replace', () => {
  it('prefers incoming agreement/dates/schedules when agreementNo changes', () => {
    const existing = {
      agreementNo: 'TC-07-2026-5019',
      startDate: '2025-08-20',
      endDate: '2025-11-19',
      monthlyRent: '400',
      paymentSchedule: [
        { chequeNo: '1', amount: 400, dueDate: '2025-08-20' },
        { chequeNo: '2', amount: 400, dueDate: '2025-09-20' },
        { chequeNo: '3', amount: 400, dueDate: '2025-10-20' },
      ],
      propertyDocumentsBundle: [{ category: 'id', name: 'old-id', fileId: 'f1' }],
      propertyDocumentsComplete: true,
    };
    const incoming = {
      agreementNo: 'TC-07-2026-5028',
      previousAgreementNo: 'TC-07-2026-5019',
      startDate: '2025-11-20',
      endDate: '2026-02-19',
      monthlyRent: '420',
      isRenewalContract: true,
      paymentSchedule: [
        { chequeNo: 'A', amount: 420, dueDate: '2025-11-20' },
        { chequeNo: 'B', amount: 420, dueDate: '2025-12-20' },
        { chequeNo: 'C', amount: 420, dueDate: '2026-01-20' },
      ],
    };

    const merged = mergeContractPayloads(existing, incoming);

    assert.equal(merged.agreementNo, 'TC-07-2026-5028');
    assert.equal(merged.startDate, '2025-11-20');
    assert.equal(merged.endDate, '2026-02-19');
    assert.equal(merged.monthlyRent, '420');
    assert.equal(merged.previousAgreementNo, 'TC-07-2026-5019');
    const schedule = Array.isArray(merged.paymentSchedule) ? merged.paymentSchedule : [];
    assert.equal(schedule.length, 3);
    assert.equal((schedule[0] as { chequeNo?: string }).chequeNo, 'A');
    const docs = Array.isArray(merged.propertyDocumentsBundle) ? merged.propertyDocumentsBundle : [];
    assert.equal(docs.length, 1);
  });

  it('still prefers richer payload when agreement stays the same', () => {
    const existing = {
      agreementNo: 'TC-07-2026-5019',
      startDate: '2025-08-20',
      endDate: '2025-11-19',
      paymentMethod: 'cheque',
      municipalFormNo: 'MF-1',
      paymentSchedule: [{ chequeNo: '1', amount: 400 }],
      propertyDocumentsComplete: true,
    };
    const incoming = {
      agreementNo: 'TC-07-2026-5019',
      startDate: '2025-08-20',
      endDate: '2025-11-19',
      paymentSchedule: [],
    };

    const merged = mergeContractPayloads(existing, incoming);
    assert.equal(merged.agreementNo, 'TC-07-2026-5019');
    assert.equal(merged.paymentMethod, 'cheque');
    assert.equal(merged.municipalFormNo, 'MF-1');
    const schedule = Array.isArray(merged.paymentSchedule) ? merged.paymentSchedule : [];
    assert.equal(schedule.length, 1);
  });
});
