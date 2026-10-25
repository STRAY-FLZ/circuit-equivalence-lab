// Synthetic software-acceptance inputs only; never official contest test outcomes.
import fs from 'node:fs'
import { createServer } from 'vite'
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' })
try {
  const { createCompetitionProject } = await server.ssrLoadModule('/src/competition/index.ts')
  const { serializeProject } = await server.ssrLoadModule('/src/project-format/index.ts')
  fs.mkdirSync('output/playwright', { recursive: true })
  const doc = await createCompetitionProject('guangdong-2026-g', { name: 'Synthetic browser fixture', version: '2.5.0' }), invalid = JSON.parse(await serializeProject(doc))
  invalid.project.extensions['org.stray.competition.workspace'].requirements[0].title = '伪造的官方要求'
  fs.writeFileSync('output/playwright/competition-invalid-source.json', JSON.stringify(invalid))
  const csv = ['time_s,input_mV', ...Array.from({ length: 4096 }, (_, i) => `${i / 256000},${100 * Math.sin(2 * Math.PI * 20000 * i / 256000)}`)].join('\n')
  fs.writeFileSync('output/playwright/competition-synthetic.csv', csv)
  console.log({ syntheticCsv: '20kHz, 100mV peak, 256kHz sample rate, 4096 samples', invalidFixture: 'official attribution deliberately tampered; must reject without replacing user project' })
} finally { await server.close() }
