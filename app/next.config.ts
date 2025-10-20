import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import type { NextConfig } from "next"

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)))
const workspaceRoot = resolve(projectRoot, "..")

const nextConfig: NextConfig = {
  output: "export",
  distDir: "out",
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  turbopack: {
    root: workspaceRoot,
  },
}

export default nextConfig
