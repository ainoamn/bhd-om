import { redirect } from 'next/navigation';

type Props = { params: Promise<{ locale: string }> };

/** Redirect legacy standalone journal page → unified accounting hub */
export default async function JournalRedirectPage({ params }: Props) {
  const { locale } = await params;
  redirect(`/${locale}/admin/accounting?tab=journal`);
}
