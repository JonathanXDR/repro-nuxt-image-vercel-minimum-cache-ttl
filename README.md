# Repro: `@nuxt/image@2.0.0` vercel provider hard-codes `minimumCacheTTL: 300`

Minimal Nuxt 4 project showing that `@nuxt/image`'s vercel provider writes
`minimumCacheTTL: 60 * 5` (5 minutes) into `nitro.vercel.config.images` with
no module-level option to change it. The only escape hatch is overriding
`nitro.vercel.config.images.minimumCacheTTL` directly, which bypasses the
provider's `defu` merge path for the rest of the image config.

## Steps to reproduce

```bash
npm install
npm run build
```

1. `nuxi build` runs the Vercel preset, which invokes the @nuxt/image vercel
   provider setup.
2. Inspect the generated `.vercel/output/config.json`:

   ```bash
   cat .vercel/output/config.json
   ```

   The `images` block contains:

   ```jsonc
   {
     "images": {
       "domains": [],
       "minimumCacheTTL": 300,
       "sizes": [320, 640, 768, 1024, 1280, 1536],
       "formats": ["image/webp", "image/avif"]
     }
   }
   ```

3. There is no `image.providers.vercel.options.minimumCacheTTL` (or
   `image.minimumCacheTTL`) on the module — confirm by attempting to set
   one and observing it is ignored.

## Expected behaviour

`@nuxt/image` exposes a typed option (e.g.
`image.providers.vercel.options.minimumCacheTTL`) that flows through the
same `defu` merge as `domains` / `sizes` / `formats`.

## Actual behaviour

`minimumCacheTTL` is hard-coded to `60 * 5` (5 minutes) in the provider
setup. Consumers must either accept the 5-minute floor or reach into
`nitro.vercel.config.images` directly.

## Root cause

`node_modules/@nuxt/image/dist/module.js` (v2.0.0), around line 112:

```js
// https://vercel.com/docs/build-output-api/v3/configuration#images
vercel(providerOptions, moduleOptions, nuxt) {
  nuxt.options.nitro = defu(nuxt.options.nitro, {
    vercel: {
      config: {
        images: {
          domains: moduleOptions.domains,
          minimumCacheTTL: 60 * 5,                          // ← hard-coded
          sizes: Array.from(new Set(Object.values(moduleOptions.screens || {}))),
          formats: providerOptions.options?.formats
            ?? ['image/webp', 'image/avif'],
        },
      },
    },
  })
},
```

The other Vercel-image fields (`domains`, `sizes`, `formats`) read from
`moduleOptions` / `providerOptions.options`. `minimumCacheTTL` is the only
one that does not, so there is no way to tune it without reaching outside
the module.

## Why it matters

Vercel's image-optimizer cache TTL is the floor for remote-image cache
invalidation. 5 minutes is far too low for remote sources (e.g. GitHub
repo covers, Apple Music artwork) that change rarely — every cache miss
hits upstream and counts against the image transformation quota. Vercel
[explicitly recommends tuning it per project](https://vercel.com/docs/image-optimization#remote-image-cache-expiration);
local images on the same provider default to 31 days.

## User-side workaround

```ts
// nuxt.config.ts
nitro: {
  vercel: {
    config: {
      images: {
        minimumCacheTTL: 60 * 60 * 24 * 28, // 28 days
      },
    },
  },
},
```

`defu` lets the user config win on first arg, so the override sticks, but
it skips the module's merging path for `domains` / `sizes` / `formats` —
a regression risk for any future change to the provider.

## Related upstream activity

No existing issue or PR addresses this gap at the time of writing. The
adjacent `awsAmplify` provider in the same module (`module.js:137`)
exposes the same `minimumCacheTTL: 60 * 5` hard-coding, so a generalised
fix would help both providers.

## Environment

- `nuxt@4.4.6`
- `@nuxt/image@2.0.0`
- `typescript@6.0.3`
- Node.js ≥ 20.19
