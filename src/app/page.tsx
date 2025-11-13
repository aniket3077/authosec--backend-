import { redirect } from 'next/navigation';

export default function HomePage() {
  // Redirect to API health check
  redirect('/api/health');
}
