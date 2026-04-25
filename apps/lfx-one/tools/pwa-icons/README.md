<!-- Copyright The Linux Foundation and each contributor to LFX. -->
<!-- SPDX-License-Identifier: MIT -->

# PWA icon sources

Source SVGs for the Progressive Web App icons in `apps/lfx-one/public/icons/`.

## Regenerate PNGs

From the repo root:

```bash
npx --yes --package=sharp-cli@5.2.0 -- sharp \
  -i apps/lfx-one/tools/pwa-icons/icon-source.svg \
  -o apps/lfx-one/public/icons/icon-192.png \
  resize 192 192

npx --yes --package=sharp-cli@5.2.0 -- sharp \
  -i apps/lfx-one/tools/pwa-icons/icon-source.svg \
  -o apps/lfx-one/public/icons/icon-512.png \
  resize 512 512

npx --yes --package=sharp-cli@5.2.0 -- sharp \
  -i apps/lfx-one/tools/pwa-icons/icon-maskable-source.svg \
  -o apps/lfx-one/public/icons/icon-maskable-512.png \
  resize 512 512
```

`icon-source.svg` is rendered with `purpose: any` — the LFX mark on a white
background. `icon-maskable-source.svg` is rendered with `purpose: maskable` —
the LFX mark on the brand blue with a 20% safe-zone inset so Android adaptive
icon masks don't crop the glyph.
