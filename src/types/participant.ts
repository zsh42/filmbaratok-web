export interface ParticipantLink {
  label: string
  url: string
}

export interface Participant {
  id: number
  name: string
  normalizedName: string
  slug: string
  bio?: string | null
  avatarUrl?: string | null
  links: ParticipantLink[]
  episodeCount?: number
  createdAt?: string
  updatedAt?: string
}

export interface ParticipantListResponse {
  participants: Participant[]
  total: number
  page: number
  pageSize: number
}

export interface ParticipantResponse {
  participant: Participant
}

export type ParticipantUpdatePayload = Partial<
  Omit<Participant, 'id' | 'normalizedName' | 'createdAt' | 'updatedAt'>
>
