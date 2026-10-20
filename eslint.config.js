import js from '@eslint/js'
import { defineConfig, globalIgnores } from 'eslint/config'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

const layers = ['domain', 'topology', 'solver', 'transforms', 'visualization', 'education', 'components', 'engineering', 'project-format', 'compatibility', 'analysis', 'editing', 'editor']
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
  editor: ['engineering', 'editing', 'project-format'],
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
          ...(layer === 'components' || layer === 'visualization' || layer === 'editor' ? [] : [{
            group: ['react', 'react/*', 'react-dom', 'react-dom/*'],
            message: '计算与教学契约不依赖 React。',
          }]),
        ],
      }],
    },
  })),
])
