import { api } from './client'
import type {
  EpisodeListResponse,
  EpisodeResponse,
  EpisodeUpdatePayload,
} from '@/types/episode'

export interface EpisodeListParams {
  page?: number
  pageSize?: number
  search?: string | null
  tagId?: number | null
}

export function listEpisodes(params: EpisodeListParams = {}) {
  return api.get<EpisodeListResponse>('/api/episodes', {
    query: {
      page: params.page,
      pageSize: params.pageSize,
      search: params.search,
      tagId: params.tagId,
    },
  })
}

export function getEpisode(id: string | number) {
  return api.get<EpisodeResponse>(`/api/episodes/${id}`)
}

export function updateEpisode(id: string | number, payload: EpisodeUpdatePayload) {
  return api.put<EpisodeResponse>(`/api/episodes/${id}`, payload)
}

export function deleteEpisode(id: string | number) {
  return api.delete<{ ok: true }>(`/api/episodes/${id}`)
}

export function refreshEpisode(id: string | number) {
  return api.post<EpisodeResponse>(`/api/episodes/${id}/refresh`)
}

export interface ImportByVideoIdsResult {
  requested: number
  fetched: number
  imported: number
  notFound: string[]
}

export function importByVideoIds(videoIds: string[]) {
  return api.post<ImportByVideoIdsResult>('/api/episodes/import-by-video-ids', { videoIds })
}

export function listPublicEpisodes(params: EpisodeListParams = {}) {
  return api.get<EpisodeListResponse>('/api/public/episodes', {
    query: {
      page: params.page,
      pageSize: params.pageSize,
      search: params.search,
      tagId: params.tagId,
    },
  })
}

export function getPublicEpisodeBySlug(slug: string) {
  return api.get<EpisodeResponse>(`/api/public/episodes/${encodeURIComponent(slug)}`)
}

export interface RelatedEpisodesResponse {
  episodes: import('@/types/episode').Episode[]
}

export function getPublicRelatedEpisodes(slug: string, limit = 8) {
  return api.get<RelatedEpisodesResponse>(
    `/api/public/episodes/${encodeURIComponent(slug)}/related`,
    { query: { limit } },
  )
}

export interface YouTubeSyncResult {
  count: number
  source: 'youtube'
}

export function syncYouTube() {
  return api.post<YouTubeSyncResult>('/api/episodes/sync-youtube')
}

export function initSyncYouTube() {
  return api.post<YouTubeSyncResult>('/api/episodes/init-sync-youtube')
}
