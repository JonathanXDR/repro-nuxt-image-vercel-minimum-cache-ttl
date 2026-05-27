export default defineNuxtConfig({
  compatibilityDate: '2026-03-21',
  modules: ['@nuxt/image'],

  // Force Vercel as the build target so `@nuxt/image`'s vercel provider
  // takes over and writes its hard-coded `minimumCacheTTL: 300` (5 min)
  // into `nitro.vercel.config.images`. The build below pins the value at
  // an upstream level. There is no module-level config knob for it; we
  // have to override `nitro.vercel.config.images` ourselves.
  nitro: {
    preset: 'vercel',
  },

  // The whole point of this repro: there is no `image.providers.vercel.minimumCacheTTL`
  // we can set, and no top-level `image.minimumCacheTTL` either. The only
  // escape hatch is overriding the Nitro Vercel config directly.
  image: {
    providers: {
      // ↓ This is what we'd like to do, but no such option exists.
      // vercel: { options: { minimumCacheTTL: 60 * 60 * 24 * 28 } },
    },
  },

  typescript: {
    typeCheck: true,
    strict: true,
  },
})
