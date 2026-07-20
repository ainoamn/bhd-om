/**
 * بوابة المالك — إعادة توجيه إلى v2
 */
import { redirect } from 'next/navigation';

export default async function OwnerPortalPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}/portal/owner/v2`);
}
