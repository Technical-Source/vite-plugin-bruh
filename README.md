# `vite-plugin-bruh` - A vite plugin to integrate with bruh

## Install

`npm i -D vite-plugin-bruh` or use `npm init bruh` with the `vite-ssr` template to quickly get started.

## Use

Example `vite.config.mjs` file:
```javascript
import { defineConfig } from "vite"
import bruh from "vite-plugin-bruh"

export default defineConfig({
  plugins: [
    bruh({
      root: new URL("./", import.meta.url).pathname
    })
  ]
})
```

This allows you to use the typical `vite` for development and `vite build` for production.
`vite-plugin-bruh` will automatically allow you to prerender html files before vite sees them.

Here is an example project structure:
```
.
├── index.css
├── index.html.mjs
├── index.mjs
├── package-lock.json
├── package.json
└── vite.config.mjs
```

## How it works

Upon a page request for `/x` in dev:
1. The `x.html.mjs` (or `x/index.html.mjs`) file is imported
2. The default export is called and `await`ed
3. The returned string is exposed to vite as if it were from `x.html` (or `x/index.html`)

At build time, all `x.html.mjs` files are automatically included as entry points (as if they were `x.html`)

If this is `index.html.mjs`:
```javascript
export default async () =>
`<!doctype html>
<html>
  <head>
    ...
  </head>

  <body>
    ...
  </body>
</html>
`
```

Vite sees this as if `index.html` existed and contained:
```html
<!doctype html>
<html>
  <head>
    ...
  </head>

  <body>
    ...
  </body>
</html>
```

During dev, vite will automatically and quickly reload the page as `index.html.mjs` and its imports are edited.

## JSX

This plugin automatically includes jsx support for bruh in all other files that vite handles as typically used.
In practice, this just means that you can use JSX and vite-specific tooling in all files except those that
touch prerendering the html.

## Current Caveats

Keep in mind that until (if) vite allows dynamic entry points, the `x.html.mjs` files must be be executable by node directly.
This means no jsx or vite-specific tooling within these files and their imports.
