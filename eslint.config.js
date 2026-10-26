import js from '@eslint/js'
import { defineConfig, globalIgnores } from 'eslint/config'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

const layers = ['domain', 'topology', 'solver', 'transforms', 'visualization', 'education', 'components', 'engineering', 'project-format', 'compatibility', 'analysis', 'editing', 'integration', 'editor', 'signal', 'signal-ui', 'atlas', 'atlas-ui', 'dc', 'dc-ui', 'ac', 'ac-ui', 'competition', 'competition-ui', 'transient', 'transient-ui']
const allowedDependencies = {
  domain: [],
  topology: ['domain'],
  solver: ['domain', 'topology'],
  transforms: ['domain', 'topology', 'solver'],
  visualization: ['domain', 'topology'],
  education: ['domain', 'topology', 'solver', 'transforms'],
  components: [],
  engineering: [],
  'project-format': ['engineering'],
  compatibility: ['engineering', 'domain'],
  analysis: ['engineering'],
  editing: ['engineering'],
  integration: ['engineering', 'compatibility', 'transforms', 'education', 'topology', 'editing'],
  editor: ['transient', 'transient-ui', 'analysis', 'ac', 'ac-ui', 'dc', 'dc-ui', 'engineering', 'editing', 'project-format', 'integration', 'education', 'visualization'],
  competition: ['engineering', 'analysis', 'project-format', 'atlas', 'ac', 'dc', 'signal'],
  'competition-ui': ['competition', 'engineering', 'project-format'],
  transient: ['engineering', 'analysis', 'dc', 'signal', 'project-format', 'editing'],
  'transient-ui': ['transient', 'engineering', 'analysis', 'project-format', 'signal', 'signal-ui'],
  ac: ['engineering', 'analysis', 'dc'],
  'ac-ui': ['ac', 'engineering', 'analysis'],
  dc: ['engineering', 'analysis'],
  'dc-ui': ['dc', 'engineering', 'analysis'],
  signal: ['engineering', 'project-format', 'analysis'],
  'signal-ui': ['signal', 'engineering', 'project-format'],
  atlas: ['engineering', 'editing'],
  'atlas-ui': ['transient', 'atlas', 'engineering', 'editor'],
}

export default defineConfig([
  globalIgnores(['node_modules/**', 'dist/**', 'coverage/**', '.npm-cache/**', '.artifacts/**']),
  { files: ['**/*.js'], extends: [js.configs.recommended], languageOptions: { globals: globals.node } },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
  },
  { files: ['src/**/*.{ts,tsx}'], languageOptions: { globals: globals.browser } },
  { files: ['tests/**/*.ts', '*.config.ts'], languageOptions: { globals: globals.node } },
  {
    files: ['src/**/*.tsx'],
    extends: [reactHooks.configs.flat.recommended, reactRefresh.configs.vite],
  },
  ...layers.map((layer) => ({
    files: [`src/${layer}/**/*.{ts,tsx}`],
    ignores: ['**/*.test.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          {
            group: layers.filter((other) => other !== layer && !allowedDependencies[layer].includes(other))
              .flatMap((other) => [`**/${other}`, `**/${other}/**`]),
            message: '此依赖违反模块方向；请通过 domain 类型或在 App 中组合模块。',
          },
          ...(['components', 'visualization', 'editor', 'signal-ui', 'atlas-ui', 'dc-ui', 'ac-ui', 'competition-ui', 'transient-ui'].includes(layer) ? [] : [{
            group: ['react', 'react/*', 'react-dom', 'react-dom/*'],
            message: '计算与教学契约不依赖 React。',
          }]),
        ],
      }],
    },
  })),
])
