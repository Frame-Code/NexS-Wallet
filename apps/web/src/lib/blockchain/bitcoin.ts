import { useEffect, useState } from 'react';

export function useBtcBalance(address?: string) {
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!address) {
      setBalance(null);
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3005'}/v1/balances/${address}?chain=bitcoin`,
          {
            method: 'GET',
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          },
        );

        if (!response.ok) {
          throw new Error('Failed to fetch BTC balance');
        }

        const data = await response.json();
        if (!cancelled) {
          setBalance(data.balance ?? null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unknown error');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [address]);

  return { balance, loading, error };
}
