import { api } from './client'
import type { MovieListResponse, MovieResponse, MovieStatus } from '@/types/movie'

export interface ListMoviesParams {
  status: MovieStatus
  page?: number
  pageSize?: number
  search?: string | null
}

export function listMovies(params: ListMoviesParams) {
  return api.get<MovieListResponse>('/api/movies', {
    query: {
      status: params.status,
      page: params.page,
      pageSize: params.pageSize,
      search: params.search || undefined,
    },
  })
}

export function listPublicMovies(params: ListMoviesParams) {
  return api.get<MovieListResponse>('/api/public/movies', {
    query: {
      status: params.status,
      page: params.page,
      pageSize: params.pageSize,
      search: params.search || undefined,
    },
  })
}

export function getPublicMovieBySlug(slug: string) {
  return api.get<MovieResponse>(`/api/public/movies/${encodeURIComponent(slug)}`)
}

export function addMovie(imdbUrl: string) {
  return api.post<MovieResponse>('/api/movies', { imdbUrl })
}

export function pickMovie() {
  return api.post<MovieResponse>('/api/movies/pick')
}

export function deleteMovie(id: string | number) {
  return api.delete<{ ok: true }>('/api/movies/' + id)
}

export interface ImportResult {
  file: string
  totalLines: number
  newlyAdded: number
  skipped: number
  enrichmentStarted: boolean
}

export function importMovies() {
  return api.post<ImportResult>('/api/movies/import')
}

export interface EnrichResult {
  total: number
  queued: number
  enrichmentStarted: boolean
}

export function enrichMissingMovies(limit?: number) {
  return api.post<EnrichResult>('/api/movies/enrich', limit ? { limit } : undefined)
}
