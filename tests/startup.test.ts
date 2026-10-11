// @vitest-environment node
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'
import { expect, it } from 'vitest'

it('真实 Vite 服务可启动，并能提供 HTML、React 入口、组件和样式', async () => {
  const server = await createServer({
    configFile: fileURLToPath(new URL('../vite.config.ts', import.meta.url)),
    server: { host: '127.0.0.1', port: 0, strictPort: true },
  })
  try {
    await server.listen()
    const address = server.httpServer?.address()
    if (!address || typeof address === 'string') throw new Error('Vite 未绑定 TCP 端口。')
    const baseUrl = `http://127.0.0.1:${address.port}`
    const html = await fetch(baseUrl)
    expect(html.status).toBe(200)
    expect(await html.text()).toContain('<title>电路等效变换实验室</title>')

    for (const path of ['/src/main.tsx', '/src/App.tsx', '/src/components/ThemeToggle.tsx', '/src/styles.css', '/favicon.svg']) {
      const response = await fetch(`${baseUrl}${path}`)
      expect(response.status, path).toBe(200)
      expect(await response.text(), path).not.toContain('Internal Server Error')
    }
  } finally {
    await server.close()
  }
}, 20_000)
