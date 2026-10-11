/** 教学展示契约，不参与数值求解。 */
export interface DerivationStep {
  readonly id: string
  readonly explanation: string
  readonly formula?: string
}

export interface LessonContent {
  readonly id: string
  readonly title: string
  readonly steps: readonly DerivationStep[]
}
