import type { FlowNode, FlowEdge } from '@/types/workflow'

export function buildDemoWorkflow(): { nodes: FlowNode[]; edges: FlowEdge[] } {
  const nodes: FlowNode[] = [
    // ── 1. Topic input ──────────────────────────────────────
    {
      id: 'n1',
      type: 'textInput',
      position: { x: 40, y: 210 },
      data: {
        nodeType: 'textInput',
        label: 'Blog Topic',
        defaultValue:
          'Write a technical blog post about the future of AI agents in software development. ' +
          'Target audience: senior software engineers. ' +
          'Tone: insightful and forward-thinking. Approx 800 words.',
      },
    },

    // ── 2. Outline generator (fast model) ───────────────────
    {
      id: 'n2',
      type: 'llm',
      position: { x: 340, y: 140 },
      data: {
        nodeType: 'llm',
        label: 'Outline Generator',
        model: 'claude-haiku-4-5',
        systemPrompt:
          'You are a technical content strategist. Create clear, structured blog post outlines.',
        userPrompt:
          'Create a detailed outline for the following blog post request:\n\n{{n1.output}}\n\n' +
          'Return a numbered outline with 4-6 sections. List 2-3 key points per section. Be specific and technical.',
        temperature: 0.7,
        maxTokens: 600,
      },
    },

    // ── 3. Draft writer (quality model) ─────────────────────
    {
      id: 'n3',
      type: 'llm',
      position: { x: 640, y: 140 },
      data: {
        nodeType: 'llm',
        label: 'Draft Writer',
        model: 'claude-sonnet-4-5',
        systemPrompt:
          'You are an expert technical writer specialising in AI and software engineering. ' +
          'Write engaging, accurate, and opinionated content for senior engineers.',
        userPrompt:
          'Write a complete blog post using this outline:\n\n{{n2.output}}\n\n' +
          'Original brief: {{n1.output}}\n\n' +
          'Write every section in full. Be technically precise, include concrete examples.',
        temperature: 0.8,
        maxTokens: 2000,
      },
    },

    // ── 4. Quality reviewer (returns JSON) ──────────────────
    {
      id: 'n4',
      type: 'llm',
      position: { x: 940, y: 140 },
      data: {
        nodeType: 'llm',
        label: 'Quality Reviewer',
        model: 'claude-haiku-4-5',
        systemPrompt:
          'You are a senior technical editor. Evaluate blog posts critically. ' +
          'Respond with valid JSON only — no markdown, no prose outside the JSON object.',
        userPrompt:
          'Review the blog post below and return this exact JSON shape:\n' +
          '{\n' +
          '  "score": <integer 1-10>,\n' +
          '  "verdict": "publish" | "revise",\n' +
          '  "strengths": ["...", "..."],\n' +
          '  "improvements": ["...", "..."],\n' +
          '  "feedback": "<one concise paragraph of revision guidance>"\n' +
          '}\n\n' +
          'Blog post:\n{{n3.output}}',
        temperature: 0.2,
        maxTokens: 500,
      },
    },

    // ── 5. Quality gate branch ───────────────────────────────
    {
      id: 'n5',
      type: 'branch',
      position: { x: 1240, y: 170 },
      data: {
        nodeType: 'branch',
        label: 'Quality Gate',
        condition: 'output.score >= 7',
      },
    },

    // ── 6. Published post (score ≥ 7) ────────────────────────
    {
      id: 'n6',
      type: 'textOutput',
      position: { x: 1530, y: 60 },
      data: {
        nodeType: 'textOutput',
        label: 'Published Post',
      },
    },

    // ── 7. Rewriter (score < 7, uses draft + reviewer notes) ─
    {
      id: 'n7',
      type: 'llm',
      position: { x: 1530, y: 300 },
      data: {
        nodeType: 'llm',
        label: 'Rewriter',
        model: 'claude-sonnet-4-5',
        systemPrompt:
          'You are an expert technical writer. Revise blog posts based on editor feedback. ' +
          'Preserve the original structure but improve quality, clarity, and depth.',
        userPrompt:
          'Revise the blog post below using the editor\'s feedback.\n\n' +
          'ORIGINAL DRAFT:\n{{n3.output}}\n\n' +
          'EDITOR FEEDBACK (JSON):\n{{n4.output}}\n\n' +
          'Apply every suggested improvement. Return only the revised post.',
        temperature: 0.7,
        maxTokens: 2000,
      },
    },

    // ── 8. Refined post output ───────────────────────────────
    {
      id: 'n8',
      type: 'textOutput',
      position: { x: 1820, y: 300 },
      data: {
        nodeType: 'textOutput',
        label: 'Refined Post',
      },
    },
  ]

  const edges: FlowEdge[] = [
    { id: 'e1-2', source: 'n1', target: 'n2' },
    { id: 'e2-3', source: 'n2', target: 'n3' },
    { id: 'e3-4', source: 'n3', target: 'n4' },
    { id: 'e4-5', source: 'n4', target: 'n5' },
    // true branch → publish directly
    { id: 'e5-6', source: 'n5', target: 'n6', sourceHandle: 'true' },
    // false branch → rewrite, then output
    { id: 'e5-7', source: 'n5', target: 'n7', sourceHandle: 'false' },
    { id: 'e7-8', source: 'n7', target: 'n8' },
  ]

  // Note: n7's prompt references {{n3.output}} and {{n4.output}} via template
  // substitution from the outputs map — no direct edges needed for those references
  // because n3 and n4 always execute before n7 in topological order.

  return { nodes, edges }
}
