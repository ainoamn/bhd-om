import { redirect } from 'next/navigation';

type Props = { params: Promise<{ locale: string }> };

/** Redirect legacy standalone accounts page → unified accounting hub */
export default async function AccountsRedirectPage({ params }: Props) {
  const { locale } = await params;
  redirect(`/${locale}/admin/accounting?tab=accounts`);
}
