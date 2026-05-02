# workflow-ai

`workflow-ai` is an AI workflow builder for businesses that want to orchestrate models, data, and actions in one place.

The product is built around a simple idea: AI should be one step inside a workflow engine, not the workflow itself. A user should be able to connect data sources, run structured AI steps, branch on decisions, trigger real actions, and inspect every run from input to output.

## Product Direction

The core UX should feel intuitive for non-technical users while still being reliable enough for production workflows. The workflow model centers on six primitives:

1. Trigger
2. State
3. Steps
4. AI outputs
5. Actions
6. Observability

## Core Concepts

### Trigger

Workflows start from an event such as:

- New row in a CRM
- Webhook received
- Scheduled run
- File uploaded
- API or SDK call from application code

### State

Each workflow run has a shared state object that every step can read from and write to.

Example state fields:

- `customer`
- `documents`
- `draft_email`
- `risk_score`
- `decision`

This is the main design principle for the product: workflows should be state-first, not prompt-first.

### Steps

Each node in the workflow should map to a clear operation:

- Fetch data
- Run AI
- Branch
- Wait for approval
- Send action
- Write back

### AI Outputs

AI steps should return structured data instead of only free text.

Example output fields:

- `summary`
- `classification`
- `recommendation`
- `confidence`
- `next_action`

### Actions

Workflows should be able to produce real outcomes, such as:

- Send email
- Update Airtable or another data source
- Create PDF report
- Post Slack message
- Create support ticket

### Observability

Users need a clear execution trace for every run:

- Input received
- Prompt sent
- Model output
- Parsed structured result
- Action taken

## UX Model

A strong interface for this product is:

- Left panel: workflow canvas
- Right panel: node configuration
- Bottom panel: execution trace and state inspector

Each AI step should let the user configure:

- Prompt template
- Model
- Inputs from workflow state
- Expected output schema
- Fallback behavior
- Whether human review is required

## Programmatic Triggering

Workflows should not be limited to manual or UI-driven triggers. A business should also be able to start a workflow directly from application code.

That makes the system usable inside product flows, backend jobs, internal tools, and third-party integrations.

A programmatic trigger should support:

- Starting a workflow by ID or slug
- Passing structured input data
- Returning a run ID for tracking
- Synchronous or asynchronous execution modes
- Auth, rate limits, and idempotency controls

Example shape:

```ts
const run = await workflowClient.trigger("qualify-inbound-lead", {
  input: {
    leadId: "lead_123",
    companyId: "company_456",
    source: "signup-form",
  },
})
```

## Example Workflow

1. Trigger on a new inbound lead
2. Fetch CRM and company data
3. Run an AI step to qualify the lead
4. Run an AI step to generate outreach using the previous decision
5. Branch based on lead score
6. Send the email or create a review task
7. Write results back to the CRM
8. Generate a weekly report

Instead of chaining raw text outputs between prompts, the recommended model is:

- Step 1 writes `lead_analysis`
- Step 2 reads `lead_analysis.decision`
- Step 2 also reads `lead_analysis.pain_points`

That makes the system easier to debug, test, and extend.

## MVP Scope

The initial version should stay narrow:

- Linear workflows with simple branching
- Three connector types: database or table, email, webhook
- One AI step type with structured JSON output
- Programmatic trigger endpoint or SDK
- Execution logs and replay
- Human approval node
- Versioned workflows

## Development

Install dependencies and run the app locally:

```bash
npm install
npm run dev
```

Useful scripts:

```bash
npm run build
npm run lint
```

## Goal

The goal of `workflow-ai` is to let a business define repeatable AI-assisted operations that can:

- Use internal or external data
- Apply custom prompts and model logic
- Reuse previous step outputs and decisions
- Be triggered directly from application code
- Trigger actions in the real world
- Produce clear, inspectable results
