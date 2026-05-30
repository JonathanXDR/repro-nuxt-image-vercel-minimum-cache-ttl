# Repro: `@nuxt/image@2.0.0` vercel provider hard-codes `minimumCacheTTL: 300`

Minimal Nuxt 4 project showing that `@nuxt/image`'s vercel provider
writes `minimumCacheTTL: 60 * 5` (5 minutes) into
`nitro.vercel.config.images` with no module-level option to change it.
The only escape hatch is overriding `nitro.vercel.config.images.minimumCacheTTL`
directly, which bypasses the provider's `defu` merge path for the rest
of the image config.

> On a real Vercel deploy the provider is auto-detected via `std-env`
> (which reads `VERCEL=1`). Locally that env var is not set, so the
> repro opts in explicitly with `image: { vercel: {} }` to trigger the
> same provider setup hook.

## Steps to reproduce

```bash
npm install
npm run build
npm run inspect:vercel-config
# images.minimumCacheTTL = 300
```

1. `nuxi build` runs the Vercel preset and triggers the @nuxt/image
   vercel provider's setup hook.
2. `npm run inspect:vercel-config` reads `.vercel/output/config.json`
   and prints the `images.minimumCacheTTL` value.
3. Output is `300`, which matches the hard-coded `60 * 5` in the
   provider source. There is no `image.providers.vercel.options.minimumCacheTTL`
   or `image.minimumCacheTTL` on the module.

## Expected behaviour

`@nuxt/image` exposes a typed option such as
`image.providers.vercel.options.minimumCacheTTL` that flows through the
same `defu` merge as `domains`, `sizes`, `formats`.

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
          minimumCacheTTL: 60 * 5,                          // hard-coded
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
`moduleOptions` or `providerOptions.options`. `minimumCacheTTL` is the
only one that does not, so there is no way to tune it without reaching
outside the module.

## Why it matters

Vercel's image-optimizer cache TTL is the floor for remote-image cache
invalidation. 5 minutes is far too low for remote sources (for example
GitHub repo covers, music artwork) that change rarely. Every cache
miss hits upstream and counts against the image transformation quota.
Vercel
[explicitly recommends tuning](https://vercel.com/docs/image-optimization#remote-image-cache-expiration)
this per-project, and local images on the same provider default to 31
days.

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

`defu` lets the user config win on first arg, so the override sticks,
but it skips the module's merging path for `domains`, `sizes`,
`formats`. This is a regression risk for any future change to the
provider.

## Related upstream activity

No existing issue or PR addresses this gap at the time of writing. The
adjacent `awsAmplify` provider in the same module (`module.js` line
137) exposes the same `minimumCacheTTL: 60 * 5` hard-coding, so a
generalised fix would help both providers.

## Environment

- `nuxt@4.4.6`
- `@nuxt/image@2.0.0`
- `typescript@6.0.3`
- Node.js v24.16.0
