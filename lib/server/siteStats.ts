import { getPublishedProperties, properties as staticCatalog } from '@/lib/data/properties';
import { prisma } from '@/lib/prisma';
import { MARKETING_STATS } from '@/lib/siteStatsConstants';

export interface SiteStats {
  properties: number;
  users: number;
  bookings: number;
  contracts: number;
}

export { MARKETING_STATS };

function pickCount(dbValue: number, catalogValue: number, marketingFallback: number): number {
  const best = Math.max(dbValue, catalogValue);
  return best > 0 ? best : marketingFallback;
}

/** إحصائيات الموقع — DB + الكatalog الثابت + fallback تسويقي */
export async function getSiteStats(): Promise<SiteStats> {
  const catalogPublished = getPublishedProperties().length;
  const catalogTotal = staticCatalog.length;

  try {
    const [dbProperties, users, bookingStorage, propertyBookings, contracts] = await Promise.all([
      prisma.property.count({ where: { isArchived: false } }).catch(() => 0),
      prisma.user.count().catch(() => 0),
      prisma.bookingStorage.count().catch(() => 0),
      prisma.propertyBooking.count().catch(() => 0),
      prisma.contractStorage.count().catch(() => 0),
    ]);

    return {
      properties: pickCount(dbProperties, Math.max(catalogPublished, catalogTotal), MARKETING_STATS.properties),
      users: pickCount(users, 0, MARKETING_STATS.users),
      bookings: pickCount(bookingStorage + propertyBookings, 0, MARKETING_STATS.bookings),
      contracts: pickCount(contracts, 0, MARKETING_STATS.contracts),
    };
  } catch (error) {
    console.error('[siteStats]', error);
    return {
      properties: pickCount(0, Math.max(catalogPublished, catalogTotal), MARKETING_STATS.properties),
      users: MARKETING_STATS.users,
      bookings: MARKETING_STATS.bookings,
      contracts: MARKETING_STATS.contracts,
    };
  }
}
