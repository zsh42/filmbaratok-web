import type { Tag } from './tag'
import type { Participant } from './participant'

export interface EpisodeTopic {
  title: string
  startTime?: string | null
  url?: string | null
}

export interface Episode {
  id: string | number
  videoId: string
  slug: string
  title: string
  description?: string | null
  publishedAt?: string | null
  image?: string | null
  downloadUrl?: string | null
  soundcloudUrl?: string | null
  topics?: EpisodeTopic[]
  tags?: Tag[]
  participants?: Participant[]
}

export interface EpisodeListResponse {
  episodes: Episode[]
  page: number
  pageSize: number
  total: number
}

export interface EpisodeResponse {
  episode: Episode
}

export type EpisodeUpdatePayload = Partial<Omit<Episode, 'id' | 'videoId' | 'slug'>> & {
  tagIds?: number[]
  participantIds?: number[]
}
