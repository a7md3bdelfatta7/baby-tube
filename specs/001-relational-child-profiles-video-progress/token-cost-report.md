# Token Cost Report — 001-relational-child-profiles-video-progress

Generated: 2026-09-04T13:05:00.000Z
Pricing catalog as of: 2026-07-13
Pricing catalog: /Users/ahmedmohamed/.agents/speckit-toolkit/config/pricing-catalog.json
Pricing override: none
Cost completeness: **partial**
Measured cost: **$0.000000**
Recorded executions: 10
Pricing unavailable: 0
Usage unavailable: 10

## Token totals

- Input: 0
- Output: 0
- Cached input read: 0
- Cached input write: 0
- Cached output: 0
- Reasoning: 0

## Phase subtotals

| Phase | Executions | Input | Output | Cache read | Cache write | Cached output | Reasoning | Measured cost | Completeness |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
| orchestrator | 1 | 0 | 0 | 0 | 0 | 0 | 0 | $0.000000 | partial |
| context-scout | 1 | 0 | 0 | 0 | 0 | 0 | 0 | $0.000000 | partial |
| brainstorm | 1 | 0 | 0 | 0 | 0 | 0 | 0 | $0.000000 | partial |
| specify | 1 | 0 | 0 | 0 | 0 | 0 | 0 | $0.000000 | partial |
| plan | 1 | 0 | 0 | 0 | 0 | 0 | 0 | $0.000000 | partial |
| tasks | 1 | 0 | 0 | 0 | 0 | 0 | 0 | $0.000000 | partial |
| implement | 2 | 0 | 0 | 0 | 0 | 0 | 0 | $0.000000 | partial |
| quality-guard | 1 | 0 | 0 | 0 | 0 | 0 | 0 | $0.000000 | partial |
| cost-report | 1 | 0 | 0 | 0 | 0 | 0 | 0 | $0.000000 | partial |

## Executions

| Phase | Wave | Agent | Task | Attempt | Status | Runtime | Requested model | Billing model | Input | Output | Cache read | Cache write | Cache write 5m | Cache write 1h | Cached output | Reasoning | Cost | Confidence |
|---|---|---|---|---:|---|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|
| orchestrator | — | app-idea-orchestrator | — | — | in_progress | cursor-local | inherit | unavailable | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | usage unavailable | unavailable |
| context-scout | — | codebase-context-scout | — | — | completed | cursor-local | inherit | unavailable | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | usage unavailable | unavailable |
| brainstorm | — | speckit-brainstorm | — | — | completed | cursor-local | inherit | Claude Sonnet 5 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | usage unavailable | unavailable |
| specify | — | speckit-specify | — | — | completed | cursor-local | inherit | Cursor Grok 4.6 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | usage unavailable | unavailable |
| plan | — | speckit-plan | — | — | completed | cursor-local | inherit | unavailable | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | usage unavailable | unavailable |
| tasks | — | speckit-tasks | — | — | completed | cursor-local | inherit | unavailable | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | usage unavailable | unavailable |
| implement | — | speckit-implement | — | — | completed | cursor-local | inherit | claude-sonnet-5-thinking | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | usage unavailable | unavailable |
| implement | all | speckit-implement-worker | T001-T022 | 1 | completed | cursor-local | inherit | unavailable | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | usage unavailable | unavailable |
| quality-guard | — | speckit-quality-guard | — | — | completed | cursor-local | inherit | unavailable | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | usage unavailable | unavailable |
| cost-report | — | speckit-cost-report | — | — | completed | cursor-local | inherit | Cursor Grok 4.6 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | usage unavailable | unavailable |

## Provenance and omissions

- `orchestrator-20260904` (app-idea-orchestrator): unavailable; evidence: `native usage null; Cursor JSONL present but cursor-local has no supported transcript parser (parseTranscript=null); do not estimate from text`; usage unavailable
- `44e81cd9-df50-4583-bd1c-d90797e37067` (codebase-context-scout): unavailable; evidence: `native usage null; Cursor JSONL present but cursor-local has no supported transcript parser (parseTranscript=null); do not estimate from text`; usage unavailable
- `8f99be9a-e74a-47cd-ac62-61bab67c1b50` (speckit-brainstorm): unavailable; evidence: `native usage null; Cursor JSONL present but cursor-local has no supported transcript parser (parseTranscript=null); do not estimate from text`; usage unavailable
- `bf6413f5-3808-4376-9c3f-12d6f9e9ec36` (speckit-specify): unavailable; evidence: `native usage null; Cursor JSONL present but cursor-local has no supported transcript parser (parseTranscript=null); do not estimate from text`; usage unavailable
- `759f52d9-9326-4384-9377-2d75e8366d34` (speckit-plan): unavailable; evidence: `native usage null; Cursor JSONL present but cursor-local has no supported transcript parser (parseTranscript=null); do not estimate from text`; usage unavailable
- `9f31b66c-0384-4352-b6d1-420dfa8f7a47` (speckit-tasks): unavailable; evidence: `native usage null; Cursor JSONL present but cursor-local has no supported transcript parser (parseTranscript=null); do not estimate from text`; usage unavailable
- `074b84a7-b33c-411c-984d-352852cef22a` (speckit-implement): unavailable; evidence: `native usage null; Cursor JSONL present but cursor-local has no supported transcript parser (parseTranscript=null); do not estimate from text`; usage unavailable
- `implement-20260904T122100Z` (speckit-implement-worker): unavailable; evidence: `native usage null; Cursor JSONL present but cursor-local has no supported transcript parser (parseTranscript=null); do not estimate from text`; usage unavailable
- `ab5f179d-ed90-4909-880f-5b415b2fee22` (speckit-quality-guard): unavailable; evidence: `native usage null; Cursor JSONL present but cursor-local has no supported transcript parser (parseTranscript=null); do not estimate from text`; usage unavailable
- `cost-report-20260904T130500Z` (speckit-cost-report): unavailable; evidence: `reporter usage not isolated from host chat; native usage null`; usage unavailable

## Calculation notes

- Costs use model-specific billable dimensions and rates per one million tokens unless the catalog states otherwise.
- Informational token categories are not billed twice when the pricing entry marks them as included in another dimension.
- A partial total retains costs for known priced dimensions and omits only unavailable usage or dimensions; it does not estimate missing cost.

## CodeBurn cross-check

Observational only. Not merged into measured total. Does not change completeness.

- Tool: `npx -y codeburn` (Node v22.19.0). Status: available.
- Window: `2026-09-04` to `2026-09-04`.
- `--project baby-tube` returned zero sessions (CodeBurn project name mismatch).
- Closest local project label: `tube` (path token `tube`).
- `tube` window: cost **$0.018546** USD; tokens input 1,422 / output 952 / cacheRead 0 / cacheWrite 0; calls 16; sessions 8; model `Cursor (auto)`; `estimatedCost` 0 on this slice.
- Machine-wide same calendar day (all local projects): cost **$2.760507** USD (`estimatedCost` **$2.741961**); tokens input 891,974 / output 6,032 / cache 0; calls 79; sessions 18. Projects: `cursor` $2.741961 (63 calls / 10 sessions), `tube` $0.018546 (16 / 8).
- Parser note: CodeBurn skipped this pipeline's Cursor JSONL as `unrecognized cursor-agent transcript format` (`83bfb750-3176-4bea-8f42-935c6ccb1352.jsonl` and related). Those SpecKit subagent transcripts are therefore outside CodeBurn's priced set.
- Per-model table below is CodeBurn's **machine-wide all-time top 10**, not the 2026-09-04 window.

| Provider | Model | Top Task | Input | Output | Cache Write | Cache Read | Total | Cost | Saved |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Cursor | `Cursor (auto)` | Conversation (94%) | 9.7M | 133.9K | 0 | 0 | 9.9M | $31.19 | - |
| Claude | `Opus 4.6` | Coding (65%) | 222 | 34.1K | 640.6K | 7.1M | 7.8M | $10.43 | - |
| Cursor | `grok-4.6` | Conversation (95%) | 3.0M | 63.7K | 0 | 0 | 3.1M | $7.67 | - |
| Claude | `Opus 5` | Feature Dev (35%) | 116 | 48.8K | 197.1K | 3.9M | 4.2M | $5.15 | - |
| Claude | `Opus 4.7` | Delegation (52%) | 109 | 14.5K | 130.4K | 5.2M | 5.4M | $4.07 | - |
| Cursor | `Grok 4.5` | Conversation (96%) | 666.3K | 10.8K | 0 | 0 | 677.1K | $1.40 | - |
| Cursor Agent | `Cursor (auto)` | Conversation (45%) | 31.6K | 59.1K | 0 | 0 | 90.7K | $0.981 | - |
| Cursor | `GPT-5.6 Sol` | Conversation (97%) | 180.8K | 1.4K | 0 | 0 | 182.1K | $0.750 | - |
| Claude | `Haiku 4.5` | Conversation (65%) | 13 | 592 | 48.7K | 62.8K | 112.1K | $0.107 | - |
| Claude | `Sonnet 5` | Conversation (100%) | 4 | 531 | 20.9K | 87.6K | 109.0K | $0.107 | - |
|  | **Total** |  | **13.6M** | **367.5K** | **1.0M** | **16.4M** | **31.4M** | **$61.86** | - |

Reconciliation: manifest measured total **$0.000000** (10/10 usage unavailable) vs CodeBurn `tube` window **$0.018546**. Gap expected: Cursor native telemetry unsupported here; CodeBurn also skipped the pipeline JSONL format, so its `tube` slice is a small recognized remainder, not full SpecKit spend. Machine-wide day total **$2.760507** includes other local `cursor` sessions outside this feature. Public catalog prices are not Cursor subscription billing.
