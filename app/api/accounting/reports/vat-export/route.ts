import { NextRequest, NextResponse } from 'next/server';
import { getVatReportFromDb } from '@/lib/accounting/data/dbService';
import { buildVatFtaExportPayload, buildVatFtaExportXml } from '@/lib/accounting/reports/vatFtaExport';
import { requirePermission } from '@/lib/accounting/rbac/apiAuth';
import { getJsonSetting } from '@/lib/server/repositories/appSettingsRepo';

const COMPANY_KEY = 'company_data_settings';

type CompanySettings = {
  vatNumber?: string;
  nameAr?: string;
  nameEn?: string;
  crNumber?: string;
};

/**
 * Server-side FTA VAT export (JSON or XML attachment).
 * GET /api/accounting/reports/vat-export?format=json|xml&fromDate=&toDate=
 */
export async function GET(request: NextRequest) {
  const perm = await requirePermission(request, 'REPORT_VIEW');
  if (!perm.ok) {
    return NextResponse.json({ error: perm.message }, { status: perm.status });
  }
  try {
    const { searchParams } = new URL(request.url);
    const fromDate = searchParams.get('fromDate') || `${new Date().getFullYear()}-01-01`;
    const toDate = searchParams.get('toDate') || new Date().toISOString().slice(0, 10);
    const format = searchParams.get('format') || 'json';

    const vatReport = await getVatReportFromDb(fromDate, toDate);
    const company = await getJsonSetting<CompanySettings>(COMPANY_KEY, {});
    const payload = buildVatFtaExportPayload(vatReport, {
      vatNumber: company.vatNumber,
      nameAr: company.nameAr,
      nameEn: company.nameEn,
      crNumber: company.crNumber,
    });

    const filename = `VAT_FTA_${fromDate}_${toDate}`.replace(/\s+/g, '_');

    if (format === 'xml') {
      const xml = buildVatFtaExportXml(payload);
      return new NextResponse(xml, {
        headers: {
          'Content-Type': 'application/xml; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}.xml"`,
        },
      });
    }

    if (format !== 'json') {
      return NextResponse.json({ error: 'Invalid format — use json or xml' }, { status: 400 });
    }

    return new NextResponse(JSON.stringify(payload, null, 2), {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}.json"`,
      },
    });
  } catch (err) {
    console.error('VAT FTA export GET:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Export failed' },
      { status: 500 }
    );
  }
}
