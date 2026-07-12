'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Root Landing Redirection Page.
 * 
 * AML Security Context:
 * Bypasses direct landing view. Instantly forwards users to the authorized `/dashboard` path.
 */
export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard');
  }, [router]);

  return null;
}
