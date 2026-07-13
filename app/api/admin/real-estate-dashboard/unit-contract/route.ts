import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/guard';
import { isAdminLikeRole } from '@/lib/auth/roles';
import { getLegacyKvBulk } from '@/lib/server/legacyKvStore';
import { saveUnitContractDraftToKv } from '@/lib/server/unitContractDraftWrite';
import {
  buildOperationsUnitsFromKv,
  OPERATIONS_UNITS_KV_KEYS,
} from '@/lib/real-estate/buildOperationsUnits';
import {
  buildUnitContractWorkspace,
  UNIT_CONTRACT_KV_KEYS,
  type ContractWorkspaceMode,
  type UnitContractFormValues,
} from '@/lib/real-estate/unitContractWorkspace';
import { normalizeBuildingKey, normalizeUnit } from '@/lib/real-estate/kvParse';

export const dynamic = 'force-dynamic';

const READ_KEYS = [...new Set([...UNIT_CONTRACT_KV_KEYS, ...OPERATIONS_UNITS_KV_KEYS])];

function isRoleAllowed(role: string | undefined): boolean {
  return (
    isAdminLikeRole(role) ||
    role === 'ADMIN' ||
    role === 'SUPER_ADMIN' ||
    role === 'COMPANY' ||
    role === 'ORG_MANAGER'
  );
}

function parseMode(raw: string | null): ContractWorkspaceMode {
  if (raw === 'renew' || raw === 'view') return raw;
  return 'fill';
}

function findUnitRow(
  rows: Array<{ building: string; unit: string } & Record<string, unknown>>,
  building: string,
  unit: string
) {
  const bk = normalizeBuildingKey(building);
  const uk = normalizeUnit(unit);
  return (
    rows.find(
      (r) => normalizeBuildingKey(r.building) === bk && normalizeUnit(r.unit) === uk
    ) ?? null
  );
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;
    if (!isRoleAllowed(auth.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const building = req.nextUrl.searchParams.get('building')?.trim() ?? '';
    const unit = req.nextUrl.searchParams.get('unit')?.trim() ?? '';
    const mode = parseMode(req.nextUrl.searchParams.get('mode'));
    if (!building || !unit) {
      return NextResponse.json({ error: 'building and unit are required' }, { status: 400 });
    }

    const kv = await getLegacyKvBulk('bhd_', READ_KEYS);
    const { rows } = buildOperationsUnitsFromKv(kv);
    const unitRow = findUnitRow(rows, building, unit);
    const workspace = buildUnitContractWorkspace(kv, building, unit, mode, unitRow);

    if (mode === 'renew' && !workspace.canRenew) {
      return NextResponse.json(
        {
          error: 'Renewal not available for this unit',
          code: 'RENEW_NOT_ALLOWED',
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        source: 'neon-legacy-kv',
        syncedAt: new Date().toISOString(),
        building,
        unit,
        workspace,
        unitRow: unitRow ?? null,
      },
      {
        headers: {
          'Cache-Control': 'private, max-age=15, stale-while-revalidate=60',
        },
      }
    );
  } catch (error) {
    console.error('real-estate-dashboard unit-contract GET error', error);
    return NextResponse.json({ error: 'Failed to load contract workspace' }, { status: 500 });
  }
}

type PostBody = {
  building: string;
  unit: string;
  mode: ContractWorkspaceMode;
  values: UnitContractFormValues;
};

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth instanceof NextResponse) return auth;
    if (!isRoleAllowed(auth.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (!auth.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await req.json().catch(() => null)) as PostBody | null;
    if (!body?.building?.trim() || !body?.unit?.trim() || !body?.values) {
      return NextResponse.json({ error: 'building, unit, and values are required' }, { status: 400 });
    }

    const mode = parseMode(body.mode);
    if (mode === 'view') {
      return NextResponse.json({ error: 'View mode is read-only' }, { status: 400 });
    }

    const token = auth.token as { name?: string; email?: string } | undefined;
    const actorName = token?.name?.trim() || token?.email?.trim() || auth.userId;

    const result = await saveUnitContractDraftToKv(
      body.building.trim(),
      body.unit.trim(),
      mode,
      body.values,
      { userId: auth.userId, name: actorName }
    );

    return NextResponse.json(
      {
        ok: true,
        savedKey: result.savedKey,
        mode: result.mode,
        syncedAt: new Date().toISOString(),
      },
      {
        headers: {
          'Cache-Control': 'private, no-store, must-revalidate',
        },
      }
    );
  } catch (error) {
    console.error('real-estate-dashboard unit-contract POST error', error);
    return NextResponse.json({ error: 'Failed to save contract draft' }, { status: 500 });
  }
}
