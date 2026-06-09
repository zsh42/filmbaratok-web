import { api } from './client'
import type { TagListResponse, TagResponse } from '@/types/tag'

export interface TagListParams {
  page?: number
  pageSize?: number
  search?: string | null
}

export function listTags(params: TagListParams = {}) {
  return api.get<TagListResponse>('/api/tags', {
    query: {
      page: params.page,
      pageSize: params.pageSize,
      search: params.search,
    },
  })
}

export function createTag(name: string) {
  return api.post<TagResponse>('/api/tags', { name })
}

export function updateTag(id: number, name: string) {
  return api.put<TagResponse>(`/api/tags/${id}`, { name })
}

export function deleteTag(id: number) {
  return api.delete<{ ok: true }>(`/api/tags/${id}`)
}

export function mergeTag(sourceId: number, targetId: number) {
  return api.post<{ ok: true; mergedInto: number }>(`/api/tags/${sourceId}/merge`, { targetId })
}
