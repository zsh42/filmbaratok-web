import { api } from './client'
import type {
  ParticipantListResponse,
  ParticipantResponse,
  ParticipantUpdatePayload,
} from '@/types/participant'

export interface ParticipantListParams {
  page?: number
  pageSize?: number
  search?: string | null
  sortField?: 'name' | 'episodeCount'
  sortOrder?: 'asc' | 'desc'
}

export function listParticipants(params: ParticipantListParams = {}) {
  return api.get<ParticipantListResponse>('/api/participants', {
    query: {
      page: params.page,
      pageSize: params.pageSize,
      search: params.search,
      sortField: params.sortField,
      sortOrder: params.sortOrder,
    },
  })
}

export function createParticipant(payload: ParticipantUpdatePayload) {
  return api.post<ParticipantResponse>('/api/participants', payload)
}

export function updateParticipant(id: number, payload: ParticipantUpdatePayload) {
  return api.put<ParticipantResponse>(`/api/participants/${id}`, payload)
}

export function deleteParticipant(id: number) {
  return api.delete<{ ok: true }>(`/api/participants/${id}`)
}

export function mergeParticipant(sourceId: number, targetId: number) {
  return api.post<{ ok: true; mergedInto: number }>(
    `/api/participants/${sourceId}/merge`,
    { targetId },
  )
}
