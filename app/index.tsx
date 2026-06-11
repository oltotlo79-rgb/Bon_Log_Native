import { Redirect } from 'expo-router';
import { ROUTE_FEED } from '@/lib/constants/routes';

export default function RootIndex() {
  return <Redirect href={ROUTE_FEED} />;
}
