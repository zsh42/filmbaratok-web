export type MovieStatus = 'pending' | 'picked'

export interface Movie {
  id: string | number
  imdbId: string
  imdbUrl: string
  slug: string
  title?: string | null
  year?: string | null
  plot?: string | null
  poster?: string | null
  imdbRating?: string | null
  genre?: string | null
  director?: string | null
  actors?: string | null
  runtime?: string | null
  status: MovieStatus
  pickedAt?: string | null
  createdAt?: string
}

export interface MovieListResponse {
  movies: Movie[]
  total: number
  page: number
  pageSize: number
}
export interface MovieResponse {
  movie: Movie
}
