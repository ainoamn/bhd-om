/**
 * بوابة المستأجر — إعادة توجيه إلى v2
 */
import { redirect } from 'next/navigation';

export default async function TenantPortalPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}/portal/tenant/v2`);
}
