# V3.4 integrated capstones — working checkpoint

2026-10-30; baseline e96d831 / v3.3.0 322b9ee. Z01–Z10 7/10, in progress.
The owner authorized this implementation and release after complete acceptance.

Compose existing typed AC, transient, amplifier and op-amp providers. The source
project is immutable; each bounded one-parameter scenario retains the source
project UUID and gets a new scenario UUID/revision and fresh provider digests.
Keep raw captures and failed outcomes. Reference formulas require recognition of
actual topology; a capstone does not imply a combined nonlinear transient solver.
Persist small studies using schema-1 JSON and existing hashed JSON artifact assets,
analysis/result/experiment records. HTML reports embed that same portable project.
Reopening historical evidence never verifies it as current. Initial budget: 1–5
scenarios, 201 frequency samples/provider and existing bounded transient settings.

The product V3 milestone may close only after release; broader textbook and analog
scope stays open. No V4 work is authorized.

Z01–Z07 have focused evidence: 12 real-provider tests and one UI test. Independent
RC τ=1ms/fc≈159.154943Hz and the actual 10V transient are checked; changing R
creates independent input revisions. RLC f0 and fd are distinct. CE/CS recalculate
bias and reject invalid regions; four op-amp families preserve conditional margins.
Raw captures retain source/configuration/digest and every numeric point. Standard
experiment/analysis/result records and SHA-checked JSON/float64 assets preserve
scenario evidence. Actual waveform measurements can be opened in Signal and
explicitly associated to the same competition experiment; snapshot handoff keeps
new capstone experiment records without converting them to official scoring.
Saved files and HTML embed the same schema-1 project; imports are historical until
rerun. The publisher's 18 chapter themes were checked, not marked fully covered.
See [inventory](V3_CAPABILITY_INVENTORY.md). Z08–Z10 remain unfinished.
