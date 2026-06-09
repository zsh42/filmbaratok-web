export interface Tag {
  id: number
  name: string
  normalizedName: string
  createdAt?: string
  updatedAt?: string
}

export interface TagListResponse {
  tags: Tag[]
  total: number
  page: number
  pageSize: number
}

export interface TagResponse {
  tag: Tag
}
