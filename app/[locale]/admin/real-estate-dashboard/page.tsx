import { redirect } from 'next/navigation';

type PageProps = { params: Promise<{ locale: string }> };

/** Thin Next.js entry — loads split legacy shell in dashboard mode (SPA migration path). */
export default async function RealEstateDashboardPage({ params }: PageProps) {
  const { locale } = await params;
  redirect(`/api/admin/legacy-real-estate/bhd-real-estate.html?mode=dashboard&locale=${locale}`);
}
