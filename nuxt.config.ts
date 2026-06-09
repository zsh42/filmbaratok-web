import { resolve } from 'node:path'
import Aura from '@primeuix/themes/aura'

export default defineNuxtConfig({
  compatibilityDate: '2025-06-01',
  devtools: { enabled: true },

  site: {
    url: 'https://filmbaratok.hu',
    name: 'filmbarátok',
    description: 'Magyar filmes podcast — epizódok, ajánlók, szavazások.',
    locale: 'hu_HU',
  },

  runtimeConfig: {
    apiInternalUrl: '',
    revalidateSecret: '',
    public: {
      apiBaseUrl: '',
    },
  },

  modules: [
    '@pinia/nuxt',
    '@primevue/nuxt-module',
    '@nuxtjs/tailwindcss',
    '@nuxtjs/sitemap',
    '@nuxtjs/robots',
    '@nuxt/image',
  ],

  image: {
    quality: 80,
    format: ['webp'],
    domains: ['i.ytimg.com', 'img.youtube.com', 'm.media-amazon.com'],
    screens: {
      xs: 320,
      sm: 480,
      md: 768,
      lg: 1024,
      xl: 1280,
      xxl: 1536,
    },
  },

  primevue: {
    options: {
      theme: {
        preset: Aura,
        options: {
          darkModeSelector: '.app-dark',
        },
      },
      locale: {
        accept: 'Igen',
        reject: 'Nem',
        choose: 'Választás',
        upload: 'Feltöltés',
        cancel: 'Mégse',
        clear: 'Törlés',
        apply: 'Alkalmaz',
        matchAll: 'Minden találat',
        matchAny: 'Bármely találat',
        addRule: 'Szabály hozzáadása',
        removeRule: 'Szabály eltávolítása',
        today: 'Ma',
        weekHeader: 'Hét',
        firstDayOfWeek: 1,
        dateFormat: 'yy.mm.dd',
        emptyMessage: 'Nincs találat',
        emptyFilterMessage: 'Nincs találat',
        emptySearchMessage: 'Nincs találat',
        emptySelectionMessage: 'Nincs kiválasztott elem',
        dayNames: ['vasárnap', 'hétfő', 'kedd', 'szerda', 'csütörtök', 'péntek', 'szombat'],
        dayNamesShort: ['vas', 'hét', 'kedd', 'sze', 'csüt', 'pén', 'szo'],
        dayNamesMin: ['V', 'H', 'K', 'Sze', 'Cs', 'P', 'Szo'],
        monthNames: [
          'január',
          'február',
          'március',
          'április',
          'május',
          'június',
          'július',
          'augusztus',
          'szeptember',
          'október',
          'november',
          'december',
        ],
        monthNamesShort: [
          'jan',
          'feb',
          'márc',
          'ápr',
          'máj',
          'jún',
          'júl',
          'aug',
          'szept',
          'okt',
          'nov',
          'dec',
        ],
        fileSizeTypes: ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'],
      },
    },
  },

  robots: {
    disallow: ['/admin/', '/admin'],
    sitemap: '/sitemap.xml',
  },

  sitemap: {
    sources: ['/api/sitemap/episodes', '/api/sitemap/movies'],
  },

  css: ['primeicons/primeicons.css', '~/src/assets/main.css'],

  alias: {
    '@': resolve(__dirname, 'src'),
  },

  nitro: {
    devProxy: {
      '/api': {
        target: 'http://localhost:3000/api',
        changeOrigin: true,
      },
    },
  },

  routeRules: {
    '/': { swr: 60 },
    '/nep-akarata': { swr: 60 },
    '/epizodok/**': { swr: 3600 },
    '/nep-akarata/**': { swr: 3600 },
    '/admin/**': { ssr: false },
    '/_ipx/**': { headers: { 'cache-control': 'public, max-age=31536000, immutable' } },
  },

  app: {
    head: {
      htmlAttrs: { lang: 'hu', class: 'app-dark' },
      title: 'filmbarátok',
      link: [{ rel: 'icon', href: '/favicon.ico' }],
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1.0' },
        { charset: 'UTF-8' },
        { property: 'og:site_name', content: 'filmbarátok' },
        { name: 'twitter:site', content: '@filmbaratokpodcast' },
      ],
    },
  },
})
