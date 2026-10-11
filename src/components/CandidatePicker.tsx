interface Option { readonly id: string; readonly title: string; readonly detail: string }
interface Props { readonly options: readonly Option[]; readonly selectedId: string | null; readonly onSelect: (id: string) => void }
/** Generic native buttons provide keyboard activation without graph eligibility rules. */
export function CandidatePicker({ options, selectedId, onSelect }: Props) {
  return <div className="candidate-picker" role="group" aria-label="可用变换候选">
    {options.length === 0 && <p className="no-candidates">当前电路没有可用的变换候选。</p>}
    {options.map(option => <button type="button" key={option.id} aria-pressed={selectedId === option.id} onClick={() => onSelect(option.id)}><strong>{option.title}</strong><span>{option.detail}</span></button>)}
  </div>
}
