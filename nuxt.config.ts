export default defineNuxtConfig({
  compatibilityDate: '2026-03-21',
  modules: ['@nuxt/image'],

  nitro: {
    preset: 'vercel',
  },

  // `image.vercel: {}` triggers the vercel provider's setup hook in
  // `node_modules/@nuxt/image/dist/module.js` (since `vercel` is in
  // `BuiltInProviders`, `resolveProviders` picks it up from `options.vercel`).
  // In production Vercel deploys this is auto-detected via `std-env`'s
  // `provider` (which reads `VERCEL=1`). Locally we have to opt in
  // explicitly. Once the setup hook runs, it writes the hard-coded
  // `minimumCacheTTL: 60 * 5` into `nitro.vercel.config.images`.
  //
  // There is no `image.providers.vercel.options.minimumCacheTTL` (or any
  // other module-level knob) to change it. The only user-side escape hatch
  // is overriding `nitro.vercel.config.images.minimumCacheTTL` directly,
  // which bypasses the provider's merge for `domains`, `sizes`, `formats`.
  image: {
    vercel: {},
  },
})
