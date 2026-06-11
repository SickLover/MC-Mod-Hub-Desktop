const CACHE_KEY = 'game_versions';
const CACHE_TTL = 5 * 60 * 1000;

interface CacheEntry {
  data: string[];
  timestamp: number;
}

export async function fetchGameVersions(): Promise<string[]> {
  // Try cache first
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (raw) {
      const cached: CacheEntry = JSON.parse(raw);
      if (Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.data;
      }
    }
  } catch {
    // ignore
  }

  // Fetch fresh
  try {
    const res = await fetch('/api/game-versions');
    const json = await res.json();
    if (json.success && Array.isArray(json.data) && json.data.length > 0) {
      try {
        sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data: json.data, timestamp: Date.now() }));
      } catch {
        // ignore
      }
      return json.data;
    }
  } catch (err) {
    console.error('获取游戏版本失败:', err);
  }

  return [];
}

export const FALLBACK_VERSIONS = [
  '26.1.2', '26.1.1', '26.1',
  '25.9', '25.8', '25.7',
  '1.21.4', '1.21.3', '1.21.1', '1.21',
  '1.20.6', '1.20.4', '1.20.2', '1.20.1', '1.20',
  '1.19.4', '1.19.2', '1.19',
  '1.18.2', '1.18',
];

export function getFallbackVersions(): string[] {
  return FALLBACK_VERSIONS;
}
