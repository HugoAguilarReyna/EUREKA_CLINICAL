import { useState, useCallback, useRef } from 'react';
import { Modification, SimulationResult, Overview } from '../types/twin-simulator';

const API = import.meta.env.VITE_API_URL || 'https://eureka-backend-vedn.onrender.com';

export const useTwinSimulator = () => {
  const [results, setResults] = useState<SimulationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Cache to prevent redundant requests
  const cacheRef = useRef<Map<string, SimulationResult>>(new Map());

  const getOverview = useCallback(async (): Promise<Overview> => {
    try {
      const res = await fetch(`${API}/knowledge/executive/overview`);
      if (!res.ok) throw new Error('Failed to fetch overview data');
      return await res.json();
    } catch (err: any) {
      throw err;
    }
  }, []);

  const simulate = useCallback(async (modifications: Modification[]): Promise<SimulationResult> => {
    // Only keep non-zero modifications
    const activeMods = modifications.filter(m => m.change_pct !== 0);
    
    // Create a predictable cache key
    const cacheKey = JSON.stringify([...activeMods].sort((a, b) => a.variable.localeCompare(b.variable)));
    
    if (cacheRef.current.has(cacheKey)) {
      const cached = cacheRef.current.get(cacheKey)!;
      setResults(cached);
      return cached;
    }

    setLoading(true);
    setError(null);
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);
      
      const res = await fetch(`${API}/knowledge/executive/twin-simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modifications: activeMods }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!res.ok) {
        throw new Error('Simulation failed');
      }
      
      const data: SimulationResult = await res.json();
      cacheRef.current.set(cacheKey, data);
      setResults(data);
      return data;
      
    } catch (err: any) {
      setError(err.message || 'An error occurred during simulation');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { results, loading, error, simulate, getOverview, setResults };
};
