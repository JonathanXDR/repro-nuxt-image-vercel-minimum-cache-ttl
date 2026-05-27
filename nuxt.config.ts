export default defineNuxtConfig({
  compatibilityDate: '2026-03-21',
  modules: ['@nuxt/image'],

  // Force the Vercel preset so @nuxt/image's vercel provider runs and writes
  // its hard-coded `minimumCacheTTL: 60 * 5` (5 minutes) into
  // `nitro.vercel.config.images`. The bug is the absence of a module-level
  // option to change it: `image.providers.vercel.*` exposes nothing for this.
  nitro: {
    preset: 'vercel',
  },

  image: {
    // ↓ This is what consumers would expect to write. There is no such
    //   option in @nuxt/image@2.0.0:
    //
    //   providers: {
    //     vercel: { options: { minimumCacheTTL: 60 * 60 * 24 * 28 } },
    //   },
    //
    // The only escape hatch is `nitro.vercel.config.images.minimumCacheTTL`,
    // which bypasses the module's merging path for `domains`/`sizes`/`formats`.
  },
})
