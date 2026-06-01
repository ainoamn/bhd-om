import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeArabicOcrText } from '../../lib/accounting/ai/arabicOcrNormalize';

describe('normalizeArabicOcrText', () => {
  it('converts Eastern Arabic numerals to Western digits', () => {
    assert.equal(normalizeArabicOcrText('المبلغ ١٢٣٫٤٥ ر.ع'), 'المبلغ 123.45 ر.ع');
  });

  it('converts Persian numerals', () => {
    assert.equal(normalizeArabicOcrText('Total ۱۲۳'), 'Total 123');
  });

  it('normalizes Arabic decimal comma', () => {
    assert.equal(normalizeArabicOcrText('100،50'), '100.50');
  });
});
