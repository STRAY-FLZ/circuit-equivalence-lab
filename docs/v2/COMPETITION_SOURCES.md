# V2.5 curated historical problem sources

Verified on **2026-10-25**. Six individually verified entries: five national
problems from 2019 and one Guangdong regional problem from 2026. This is a
small curated index, not coverage of all years or divisions. Each record has a
stable ID, event/range/year/letter/title/division, category, publisher, original
URL, publication URL, document locator, verification date, original summary,
supported partial training and limitations. Runtime catalog is
`src/competition/catalog.ts` (catalog version 1).

## National statements

Original [2019 statement collection, Shandong Agricultural University](https://jdxy.sdau.edu.cn/_upload/article/files/ec/09/46bd157144c1b4c76c3b9819d832/7b8deb3a-909e-4c60-9aac-67ca3023ffc4.pdf),
39 pages, read at each relevant statement. Year, letters and titles also match
the [Hunan organizing committee's 2019 release index](https://hnedc.hnie.edu.cn/info/1090/1105.htm).
That index's individual downloads require a CAPTCHA; verification therefore
uses the university's directly readable original collection, not a CAPTCHA bypass.
All five statements explicitly identify the undergraduate division.

| Stable key | Letter / original title | Collection pages | Narrow requirement retained |
| --- | --- | --- | --- |
| nuedc-2019-a | A / 电动小车动态无线充电系统 | 1–3 | Task section's source-current limit |
| nuedc-2019-c | C / 线路负载及故障检测装置 | 11–13 | Task section's response-time limit |
| nuedc-2019-d | D / 简易电路特性测试仪 | 14–16 | D-2/3 basic (4), cutoff-frequency relative error |
| nuedc-2019-e | E / 基于互联网的信号传输系统 | 17–19 | E-2/3 basic (2), terminal sampling-rate minimum |
| nuedc-2019-f | F / 纸张计数显示装置 | 20–22 | F-2/3 basic (3), measurement completion-time limit |

Published numbers/conditions are retained only where read from the original.
The A/C task clauses are not arbitrarily called basic/advanced. The application
retains only a short original summary and one attributed requirement per problem;
users must read the complete linked statement. It does not calculate official
scores or reproduce the rubric/PDF.

## Guangdong regional original statement

[SCUT regional committee publication, 2026-07-29](https://www2.scut.edu.cn/gduedc/2026/0729/c21363a633131/page.htm)
links the original
[电赛题目.rar](https://www2.scut.edu.cn/_upload/article/files/fa/aa/2d67fe7f403693111c333f4646a3/e80e510d-260b-4fe5-aefe-693174e34f83.rar).
The [regional event notice](https://www2.scut.edu.cn/gduedc/2026/0324/c21363a621237/page.htm)
and statement header identify the regional competition / analog-electronic
system topic selection event. It is **regional**, not a newly invented nationwide
2026 final. The file is `G题_周期信号测量分析装置.pdf`; title/letter/year and
requirements were visually read on G-1/3 and G-2/3 using bundled Poppler.

Stable key `guangdong-2026-g`. The notice allows undergraduate and vocational
students; this problem does not separately label a single division, so the
catalog says exactly that. The selected requirement is G-1/3, requirements
1(2): RMS absolute-error limit under the stated first-signal amplitude/frequency
conditions. It is not relabeled as basic/advanced and is not extrapolated to
all signals. The training sine is explicitly one software subset, not proof of
the full harmonic combinations, display hardware, interference rejection or
time-bound contest instrument.

Downloaded archive SHA-256:
`d0e6d745803ad856ae96338278ba4549d95cf31b58b1125f2d5f25c966ef7a4a`.
Selected PDF SHA-256:
`0058142ad484f92a0df2020dafa18bbe8c3e12816dccc8e4e212d4724733773f`.
Original files/rendered first two pages are ignored audit material under
`.artifacts/competition-sources/`; they are not shipped or copied into Git.

## Verification and attribution boundaries

The preferred national training site `https://www.nuedc-training.com.cn/` was
consulted but its homepage returned 502 during this verification; no title,
rubric or authenticity claim is derived from that failure or secondary GitHub
archives. University originals and organizing committee pages supply the actual
evidence above. Broken future links do not retroactively alter a dated check;
new/revised entries require independent source verification before changing the
bundled index or verification date. No runtime network fetch or active contest
assistance is required.

Original requirements, derived interpretations and custom training targets are
separate. Imported projects cannot rewrite the bundled official requirement or
promote a custom target into it; the workspace validator rejects that attribution.
Source metadata is a dated application verification record, not a digital signature
on a user's later measurements. HTML reports preserve those distinctions and
include the original links/locators. Hardware, RF, MCU, power conversion and
mechanical systems outside existing engines remain explicit limitations.
