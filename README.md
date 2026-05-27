# Repro: `@nuxt/image@2.0.0` vercel provider has no `minimumCacheTTL` option

Minimal Nuxt 4 project showing that the only way to raise Vercel's image-optimizer cache TTL above the hard-coded `300` seconds (5 minutes) is to override `nitro.vercel.config.images` directly.

## What you should see

`npm run build` finishes with a vercel preset whose `.vercel/output/config.json` contains:

```jsonc
{
  "images": {
    "minimumCacheTTL": 300,
    ...
  }
}
```

The module emits `minimumCacheTTL: 60 * 5` and there is no `image.providers.vercel.*` option to change it.

## Why it matters

Vercel's image-optimizer cache TTL is the floor for remote-image cache invalidation. Five minutes is wildly low for remote sources (GitHub repo covers, Apple Music artwork) that change rarely — every cache miss hits the upstream and counts against the image transformation quota. The documented Vercel default is 31 days for local images, and the [Vercel docs explicitly recommend tuning it per project](https://vercel.com/docs/image-optimization#remote-image-cache-expiration).

## Workaround

Override `nitro.vercel.config.images.minimumCacheTTL` directly, because `defu` lets the user config win at module-setup time:

```ts
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

That works but bypasses the module's `domains`/`sizes`/`formats` merging path — a regression risk for any future change to the provider.

## Ask

Expose `minimumCacheTTL` (and ideally the rest of [Vercel's `images` config](https://vercel.com/docs/image-optimization)) as a typed `providers.vercel.options.*` field so user config flows through the same merge path as `domains`/`sizes`/`formats`.

## Versions

- `nuxt@4.4.6`
- `@nuxt/image@2.0.0`
