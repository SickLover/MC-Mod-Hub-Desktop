// 资源类型
export type ResourceType = 'mod' | 'shader' | 'resourcepack';

// 来源平台
export type Source = 'curseforge' | 'modrinth';

// 统一的资源条目（来自 API 返回）
export interface ResourceItem {
  id: string;
  source: Source;
  type: ResourceType;
  name: string;
  summary: string;
  iconUrl: string | null;
  downloadCount: number;
  author: string;
  categories: string[];
  gameVersions: string[];
  createdAt: string;
  updatedAt: string;
}

// 依赖声明
export interface Dependency {
  source: Source;
  modId: string;
  relationType: 'required' | 'optional' | 'embedded';
}

// 单个版本文件信息
export interface VersionFile {
  id: string;
  fileName: string;
  gameVersions: string[];
  loaders: string[];
  releaseType: 'release' | 'beta' | 'alpha';
  fileSize: number;
  downloadUrl: string | null;
  publishedAt: string;
  dependencies?: string[];
  incompatibilities?: string[];
}

// 资源详细信息（版本列表 + 基础信息）
export interface ResourceDetail extends ResourceItem {
  description: string;
  websiteUrl: string;
  versions: VersionFile[];
  dependencyNames?: Record<string, string>;
}

// 收藏夹
export interface Collection {
  id: string;
  name: string;
  gameVersion: string;
  releaseType: string;
  createdAt: string;
  updatedAt: string;
}

// 收藏夹中的资源条目
export interface CollectionItem {
  id: string;
  collectionId: string;
  resourceType: ResourceType;
  resourceId: string;
  resourceName: string;
  source: Source;
  iconUrl: string | null;
  selectedFileId: string | null;
  selectedFileName: string | null;
  selectedGameVersion: string | null;
  addedAt: string;
}

// 最近浏览记录
export interface RecentlyViewed {
  id: string;
  resourceType: ResourceType;
  resourceId: string;
  resourceName: string;
  source: Source;
  iconUrl: string | null;
  viewedAt: string;
}

// 搜索结果
export interface SearchResult {
  items: ResourceItem[];
  total: number;
}

// 热门内容请求参数
export interface PopularParams {
  type: ResourceType;
  limit?: number;
}

// 搜索参数
export interface SearchParams {
  q: string;
  offset?: number;
  limit?: number;
}

// API 统一响应格式
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
