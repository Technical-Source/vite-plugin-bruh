import fs from "fs/promises"
import path from "path"

const excludeEntry = (entry, directory) =>
  entry.isDirectory() && entry.name == "node_modules"

const getHtmlRenderFiles = async (directory, maxDepth = Infinity) => {
  if (maxDepth < 1)
    return []

  try {
    const entries = await fs.readdir(directory, { withFileTypes: true })
    const unflattenedFiles = await Promise.all(
      entries
        .map(async entry => {
          if (excludeEntry(entry, directory))
            return []

          const entryPath = path.join(directory, entry.name)

          if (entry.isDirectory())
            return getHtmlRenderFiles(entryPath, maxDepth - 1)
          if (entry.name.endsWith(".html.mjs"))
            return [entryPath]

          return []
        })
    )
    return unflattenedFiles.flat()
  }
  catch {
    return []
  }
}

export const bruhDev = ({ root } = {}) => {
  const urlToHtmlRenderFile = async url => {
    const pathname = path.join(root, path.normalize(url))
    const htmlRenderFiles = await getHtmlRenderFiles(path.dirname(pathname), 2)
    for (const htmlRenderFile of htmlRenderFiles) {
      const htmlRenderFileName = htmlRenderFile.replace(".html.mjs", "")
      if (htmlRenderFileName == pathname)
        return htmlRenderFile
      if (htmlRenderFileName == path.join(pathname, "index"))
        return htmlRenderFile
    }
  }

  return {
    name: "bruh-dev",
    apply: "serve",
    enforce: "pre",

    configureServer(viteDevServer) {
      viteDevServer.middlewares.use(async (req, res, next) => {
        try {
          const htmlRenderFile = await urlToHtmlRenderFile(req.url)
          if (htmlRenderFile) {
            const { default: render } = await viteDevServer.ssrLoadModule(htmlRenderFile)
            const rendered = await render()
            const transformedHTML = await viteDevServer.transformIndexHtml(req.url, rendered.toString())

            res.setHeader("Content-Type", "text/html")
            return res.end(transformedHTML)
          }
          next()
        }
        catch (error) {
          viteDevServer.ssrFixStacktrace(error)
          console.error(error)

          res.statusCode = 500
          return res.end(error.stack)
        }
      })
    }
  }
}

export const bruhBuild = ({ root } = {}) => {
  const idToHtmlRenderFile = {}

  return {
    name: "bruh-build",
    apply: "build",
    enforce: "pre",

    async resolveId(source) {
      if (source.endsWith(".html.mjs")) {
        const id = source.replace(".html.mjs", ".html")
        idToHtmlRenderFile[id] = source
        return id
      }
    },

    async load(id) {
      if (!idToHtmlRenderFile[id])
        return

      const { default: render } = await import(idToHtmlRenderFile[id])
      const rendered = await render()
      return {
        code: rendered,
        map: ""
      }
    },

    // Add all page render files to the build inputs
    async config() {
      const htmlRenderFiles = await getHtmlRenderFiles(root)

      const input = Object.fromEntries(
        htmlRenderFiles
          .map(pathname => {
            const name = path.relative(root, pathname).replace(".html.mjs", "")
            return [name, pathname]
          })
      )

      return {
        build: {
          rollupOptions: {
            input
          }
        }
      }
    }
  }
}

export const bruhJSX = () => {
  return {
    name: "bruh-jsx",

    config() {
      return {
        esbuild: {
          jsxFactory: "h",
          jsxFragment: "JSXFragment",
          jsxInject: `import { h, JSXFragment } from "bruh/dom/meta-node"`
        }
      }
    }
  }
}

export const bruh = ({ root } = {}) =>
  [
    bruhDev({ root }),
    bruhBuild({ root }),
    bruhJSX()
  ]

export default bruh
