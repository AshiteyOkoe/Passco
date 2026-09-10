import { useCallback, useEffect, useState } from 'react';
import { getBeceEligibility, type BeceEligibility, type BeceUsage } from '../services/api';

export function useBeceEligibility(enabled = true) {
  const [eligible, setEligible] = useState<boolean | null>(null);
  const [requirements, setRequirements] = useState<BeceEligibility['requirements']>([]);
  const [usage, setUsage] = useState<BeceUsage | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getBeceEligibility();
      setEligible(data.eligible);
      setRequirements(data.requirements);
      setUsage(data.usage ?? null);
    } catch {
      setEligible(null);
      setRequirements([]);
      setUsage(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    refresh();
  }, [enabled, refresh]);

  const usageLocked = usage !== null && usage.limit > 0 && usage.used >= usage.limit;

  return { eligible, requirements, usage, usageLocked, loading, refresh };
}