# workflow-ai — Full Implementation Plan

## Analysis: Current State vs README Goals

### What exists
- Visual workflow editor (drag-drop, React Flow)
- Node types: textInput, imageInput, llm, branch, loop, textOutput
- Workflow CRUD (PostgreSQL via Go backend)
- LLM execution (Anthropic + OpenAI via backend)
- SSE streaming for live execution events
- Branch conditions (regex-based evaluator)
- Tab management, import/export

### README MVP Requirements Gap
| Feature | Status |
|---|---|
| Linear workflows + branching | ✅ Done |
| State-first model (shared state per run) | ❌ Missing |
| HTTP fetch / data connector node | ❌ Missing |
| Email action node | ❌ Missing |
| Webhook trigger node | ❌ Missing |
| Structured JSON output from AI steps | ❌ Missing |
| Programmatic trigger endpoint + SDK | ❌ Missing |
| Execution logs + replay | ❌ Partial (logs stream but no history) |
| Human approval node | ❌ Missing |
| Versioned workflows | ❌ Missing |
| Run history (list past runs) | ❌ Missing |
| API key auth for programmatic access | ❌ Missing |

---

## New Node Types Contract

### Shared TypeScript/Go type additions
```
httpRequest  — HTTP fetch (GET/POST/PUT/PATCH/DELETE)
emailSend    — Send email (SendGrid or SMTP)
humanApproval — Pause for human approve/reject
```

### New FlowNodeData fields
```typescript
// httpRequest
url?: string
method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
requestHeaders?: string   // JSON string key:value
requestBody?: string      // template body

// emailSend
emailTo?: string          // template allowed
emailSubject?: string     // template allowed
emailBody?: string        // template body

// humanApproval
approvalMessage?: string  // message shown to reviewer
approvalTimeout?: number  // seconds before auto-reject (0 = no timeout)

// LLM structured output (add to existing LLM config)
outputSchema?: string     // JSON Schema string for expected output
```

---

## New API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | /api/workflows/:id/runs | List past runs for a workflow |
| GET | /api/runs/:id | Get a run by ID (with stored events) |
| POST | /api/runs/:id/approve | Approve a pending humanApproval |
| POST | /api/runs/:id/reject | Reject a pending humanApproval |
| POST | /api/trigger/:workflowId | Programmatic trigger (API key required) |
| GET | /api/apikeys | List API keys |
| POST | /api/apikeys | Create API key |
| DELETE | /api/apikeys/:id | Delete API key |

---

## Implementation Tracks

### Track A — Backend (workflow-ai-server)
Files to add/modify:
- `internal/executor/executor.go` — add httpRequest, emailSend, humanApproval node execution
- `internal/executor/types.go` — add new NodeType constants
- `internal/api/handlers/runs.go` — NEW: run history, approval handlers
- `internal/api/handlers/trigger.go` — NEW: programmatic trigger
- `internal/api/handlers/apikeys.go` — NEW: API key CRUD
- `internal/api/routes.go` — register new routes
- `internal/database/models/workflow.go` — add event storage to WorkflowRun, add ApiKey model
- `internal/auth/apikey.go` — NEW: API key middleware

### Track B — Frontend New Nodes
Files to add/modify:
- `src/types/workflow.ts` — add new NodeType values + FlowNodeData fields
- `src/lib/nodeColors.ts` — colors/icons for new nodes
- `src/lib/nodeDefaults.ts` — default data for new nodes
- `src/components/nodes/HttpRequestNode.tsx` — NEW
- `src/components/nodes/EmailSendNode.tsx` — NEW
- `src/components/nodes/HumanApprovalNode.tsx` — NEW
- `src/components/nodes/index.ts` — register new nodes
- `src/components/panels/NodePalette.tsx` — add to palette
- `src/components/panels/ConfigPanel.tsx` — config forms for new nodes + LLM schema
- `src/lib/executor.ts` — ensure new nodes serialize to AST

### Track C — Frontend Features
Files to add/modify:
- `src/lib/workflowApi.ts` — add run history + approval API calls
- `src/store/workflowStore.ts` — add runHistory state, approval state
- `src/components/ExecutionPanel.tsx` — add State Inspector tab + approval UI
- `src/components/RunHistoryPanel.tsx` — NEW: past runs list
- `src/pages/WorkflowEditorPage.tsx` — integrate RunHistoryPanel

---

## Human Approval Architecture (key design)

**Backend:**
1. When `humanApproval` node is reached, emit `node_waiting` event with `runId`
2. Create `chan bool` keyed by `runId` in a global map (mutex-protected)
3. Block goroutine on channel with optional timeout
4. `POST /api/runs/:id/approve` → sends `true` to channel
5. `POST /api/runs/:id/reject` → sends `false` to channel
6. Channel result determines node output ("approved" or "rejected")

**Frontend:**
1. SSE handler watches for `node_waiting` event type
2. Dispatch to store: set `pendingApproval = { runId, nodeId, message }`
3. ExecutionPanel shows an "Approval Required" banner with Approve/Reject buttons
4. Buttons call `/api/runs/:id/approve` or `/api/runs/:id/reject`
5. Clear pending approval state after response

---

## Run History Architecture

**Backend:**
- Add `Events JSONB` column to `WorkflowRun` model
- During execution, buffer all events; on completion, save them to the run record
- `GET /api/workflows/:id/runs` returns list of runs with metadata
- `GET /api/runs/:id` returns run + stored events

**Frontend:**
- Add "History" tab to ExecutionPanel (alongside current log)
- Shows past runs (date, status, duration)
- Clicking a run loads its stored events into the log view

---

## Programmatic Trigger

**Backend:**
- `POST /api/trigger/:workflowId` — accepts `{ input: {...} }` body
- Validates Bearer token against ApiKey table
- Runs workflow synchronously (returns result) or async (returns runId)
- Default: async, returns `{ runId: "..." }`

**Frontend:**
- API Keys section in "More" menu or Settings page
- Shows generated keys (masked after creation)
- Copy-to-clipboard for new keys

---

## Structured AI Output

**Backend:**
- If `outputSchema` is set on an LLM node, append to system prompt:
  `"Respond ONLY with valid JSON matching this schema: {schema}"`
- Parse response as JSON, pretty-print for output

**Frontend:**
- Add textarea in ConfigPanel LLM section: "Expected output schema (JSON)"
- Show parsed JSON preview in node card

---

## Status Tracking

See PROGRESS.md
