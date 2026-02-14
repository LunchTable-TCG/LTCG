/// <reference types="vinxi/types/server" />
import { getWebRequest } from 'vinxi/http'
import { createStartHandler, defaultStreamHandler } from '@tanstack/start/server'
import { createRouter } from './router'

const handler = createStartHandler({
  createRouter,
  getRouterManifest: () => {
    const manifest = import.meta.env.MANIFEST
    return manifest
  },
})(defaultStreamHandler)

export default handler
