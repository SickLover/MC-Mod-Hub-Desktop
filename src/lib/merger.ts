import { ResourceItem, ResourceType } from '@/types';

export function mergeResults(
  curseforgeResults: ResourceItem[],
  modrinthResults: ResourceItem[],
  type?: ResourceType,
): ResourceItem[] {
  let combined: ResourceItem[] = [...curseforgeResults, ...modrinthResults];

  if (type) {
    combined = combined.filter((item) => item.type === type);
  }

  combined.sort((a, b) => b.downloadCount - a.downloadCount);

  const seen = new Set<string>();
  return combined.filter((item) => {
    const key = `${item.source}-${item.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
