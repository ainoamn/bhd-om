import { redirect } from 'next/navigation';

type Props = { params: Promise<{ locale: string }> };

/** Redirect legacy standalone reports page → unified accounting hub */
export default async function ReportsRedirectPage({ params }: Props) {
  const { locale } = await params;
  redirect(`/${locale}/admin/accounting?tab=reports`);
}
