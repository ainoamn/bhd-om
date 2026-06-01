'use client';

export default function AccountingSettingsTab(props: {
  ar: boolean;
  fiscalForm: { startMonth: number; startDay: number; currency: string; vatRate: number };
  setFiscalForm: (v: { startMonth: number; startDay: number; currency: string; vatRate: number }) => void;
  onSave: () => void;
}) {
  const { ar, fiscalForm, setFiscalForm, onSave } = props;

  return (
    <div className="admin-card p-6 max-w-xl" data-testid="accounting-tab-settings">
      <h4 className="font-bold text-gray-900 mb-6">{ar ? 'إعدادات المحاسبة' : 'Accounting Settings'}</h4>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSave();
        }}
        className="space-y-4"
      >
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">{ar ? 'العملة' : 'Currency'}</label>
          <select value={fiscalForm.currency} onChange={(e) => setFiscalForm({ ...fiscalForm, currency: e.target.value })} className="admin-select w-full">
            <option value="OMR">ر.ع (OMR)</option>
            <option value="SAR">ر.س (SAR)</option>
            <option value="AED">د.إ (AED)</option>
            <option value="USD">$ (USD)</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">{ar ? 'ضريبة القيمة المضافة (%)' : 'VAT Rate (%)'}</label>
          <select value={fiscalForm.vatRate} onChange={(e) => setFiscalForm({ ...fiscalForm, vatRate: parseInt(e.target.value, 10) })} className="admin-select w-full">
            <option value={0}>0%</option>
            <option value={5}>5%</option>
            <option value={15}>15%</option>
          </select>
        </div>
        <button type="submit" className="px-4 py-2.5 admin-btn-primary">{ar ? 'حفظ الإعدادات' : 'Save Settings'}</button>
      </form>
    </div>
  );
}
