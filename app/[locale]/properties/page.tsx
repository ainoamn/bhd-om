import { cookies } from 'next/headers';
import PropertiesList from '@/components/properties/PropertiesList';

export default async function PropertiesPage() {
  const cookieStore = await cookies();
  const overridesCookie = cookieStore.get('bhd_property_overrides')?.value ?? null;
  return <PropertiesList overridesCookie={overridesCookie} dataCookie={null} />;
}
