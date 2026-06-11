import { describe, it, expect, vi } from 'vitest';
import axios from 'axios';
import { getAsset, getExplainability, getTraceability } from '../src/api/graph';
import { getCentrality, getInfluence, getAnalyticsSummary, getTopAssets } from '../src/api/analytics';

vi.mock('axios');

describe('API functions', () => {
  it('calls graph API', async () => {
    vi.mocked(axios.get).mockResolvedValue({ data: {} });
    await getAsset('1');
    await getExplainability('1');
    await getTraceability('1');
    expect(axios.get).toHaveBeenCalledTimes(3);
  });
  
  it('calls analytics API', async () => {
    vi.mocked(axios.get).mockResolvedValue({ data: [] });
    await getCentrality();
    await getInfluence('1');
    await getAnalyticsSummary();
    await getTopAssets();
    expect(axios.get).toHaveBeenCalledTimes(7); // 3 + 4
  });
});
