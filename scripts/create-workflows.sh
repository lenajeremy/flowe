#!/bin/bash
# Creates all 10 showcase workflows via the API

API="http://localhost:8080"

create_workflow() {
  local name="$1"
  local payload="$2"
  echo "Creating: $name"
  result=$(curl -s -X POST "$API/api/workflows" \
    -H "Content-Type: application/json" \
    -d "$payload")
  id=$(echo "$result" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
  if [ -n "$id" ]; then
    echo "  ✓ Created $name (id: $id)"
  else
    echo "  ✗ Failed: $result"
  fi
}

# ─────────────────────────────────────────────────────────────────
# 1. Competitive Intelligence Monitor
# ─────────────────────────────────────────────────────────────────
create_workflow "Competitive Intelligence Monitor" '{
  "name": "Competitive Intelligence Monitor",
  "nodes": [
    {
      "id": "sched",
      "type": "scheduledTrigger",
      "position": {"x": 0, "y": 200},
      "data": {"nodeType": "scheduledTrigger", "label": "Weekly Trigger", "interval": "24h"}
    },
    {
      "id": "search",
      "type": "llm",
      "position": {"x": 300, "y": 200},
      "data": {
        "nodeType": "llm", "label": "Search Competitor News",
        "model": "claude-sonnet-4-5",
        "systemPrompt": "You are a competitive intelligence analyst. Use web search to find recent news, product launches, pricing changes, and blog posts from top competitors in the AI workflow automation space (e.g. n8n, Zapier, Make.com, Pipedream). Search for news from the past 7 days.",
        "userPrompt": "Search for the latest competitor news and activity. Summarize the 5 most significant findings with source URLs.",
        "temperature": 0.3, "maxTokens": 2000, "enableWebSearch": true
      }
    },
    {
      "id": "analyze",
      "type": "llm",
      "position": {"x": 600, "y": 200},
      "data": {
        "nodeType": "llm", "label": "Analyze & Score Changes",
        "model": "claude-sonnet-4-5",
        "systemPrompt": "You are a strategic analyst. Evaluate competitor news for significance. Score the overall findings from 1-10 based on competitive threat level. Return ONLY valid JSON.",
        "userPrompt": "Analyze these competitor findings and score their significance:\n\n{{search.output}}\n\nReturn JSON: {\"score\": <1-10>, \"threat_level\": \"low|medium|high\", \"key_changes\": [\"change1\", \"change2\"], \"recommended_actions\": [\"action1\", \"action2\"], \"summary\": \"brief summary\"}",
        "temperature": 0.2, "maxTokens": 1000,
        "outputSchema": "{\"score\": \"number\", \"threat_level\": \"string\", \"key_changes\": \"array\", \"recommended_actions\": \"array\", \"summary\": \"string\"}"
      }
    },
    {
      "id": "gate",
      "type": "branch",
      "position": {"x": 900, "y": 200},
      "data": {"nodeType": "branch", "label": "Significant Changes?", "condition": "output.score > 5"}
    },
    {
      "id": "approval",
      "type": "humanApproval",
      "position": {"x": 1200, "y": 80},
      "data": {
        "nodeType": "humanApproval", "label": "Review Before Reporting",
        "approvalMessage": "Competitive intelligence alert: significant changes detected. Review the analysis and approve to create a Notion report and send team email.",
        "approvalTimeout": 3600, "approvalEmail": ""
      }
    },
    {
      "id": "notion-report",
      "type": "notion",
      "position": {"x": 1500, "y": 80},
      "data": {
        "nodeType": "notion", "label": "Save to Notion",
        "integrationOp": "create_page",
        "integrationToken": "", "notionDatabaseId": "",
        "notionTitle": "Competitive Intel Report - {{analyze.output}}",
        "notionContent": "## Competitive Intelligence Report\n\n### Raw Findings\n{{search.output}}\n\n### Analysis\n{{analyze.output}}"
      }
    },
    {
      "id": "email-alert",
      "type": "emailSend",
      "position": {"x": 1800, "y": 80},
      "data": {
        "nodeType": "emailSend", "label": "Email Team Alert",
        "emailTo": "team@yourcompany.com",
        "emailSubject": "🔍 Weekly Competitive Intelligence Report",
        "emailBody": "<h2>Competitive Intelligence Update</h2><h3>Key Findings</h3>{{search.output}}<h3>Strategic Analysis</h3>{{analyze.output}}"
      }
    },
    {
      "id": "no-change",
      "type": "textOutput",
      "position": {"x": 1200, "y": 380},
      "data": {"nodeType": "textOutput", "label": "No Significant Changes"}
    }
  ],
  "edges": [
    {"id": "e1", "source": "sched", "target": "search"},
    {"id": "e2", "source": "search", "target": "analyze"},
    {"id": "e3", "source": "analyze", "target": "gate"},
    {"id": "e4", "source": "gate", "target": "approval", "sourceHandle": "true"},
    {"id": "e5", "source": "gate", "target": "no-change", "sourceHandle": "false"},
    {"id": "e6", "source": "approval", "target": "notion-report", "sourceHandle": "approved"},
    {"id": "e7", "source": "notion-report", "target": "email-alert"}
  ]
}'

# ─────────────────────────────────────────────────────────────────
# 2. AI-Powered PR Code Review
# ─────────────────────────────────────────────────────────────────
create_workflow "AI-Powered PR Code Review" '{
  "name": "AI-Powered PR Code Review",
  "nodes": [
    {
      "id": "webhook",
      "type": "webhookTrigger",
      "position": {"x": 0, "y": 200},
      "data": {"nodeType": "webhookTrigger", "label": "GitHub PR Webhook"}
    },
    {
      "id": "fetch-pr",
      "type": "httpRequest",
      "position": {"x": 300, "y": 200},
      "data": {
        "nodeType": "httpRequest", "label": "Fetch PR Diff",
        "url": "{{webhook.output}}",
        "method": "GET",
        "requestHeaders": "{\"Accept\": \"application/vnd.github.diff\", \"Authorization\": \"Bearer YOUR_GITHUB_TOKEN\"}",
        "requestBody": ""
      }
    },
    {
      "id": "review",
      "type": "llm",
      "position": {"x": 600, "y": 200},
      "data": {
        "nodeType": "llm", "label": "Deep Code Review",
        "model": "claude-sonnet-4-5",
        "systemPrompt": "You are a senior software engineer performing a thorough code review. Analyze the PR diff for: security vulnerabilities (OWASP Top 10), performance issues, logic bugs, race conditions, missing error handling, and code quality. Use web search to look up best practices for any libraries or patterns you see.",
        "userPrompt": "Review this PR diff thoroughly:\n\n{{fetch-pr.output}}\n\nProvide a detailed review covering all issues found, their severity, and specific suggestions for improvement.",
        "temperature": 0.2, "maxTokens": 4000, "enableWebSearch": true
      }
    },
    {
      "id": "score",
      "type": "llm",
      "position": {"x": 900, "y": 200},
      "data": {
        "nodeType": "llm", "label": "Score Severity",
        "model": "claude-haiku-4-5",
        "systemPrompt": "Extract structured severity information from a code review. Return ONLY valid JSON.",
        "userPrompt": "Based on this code review, extract severity info:\n\n{{review.output}}\n\nReturn JSON: {\"hasCritical\": <boolean>, \"issueCount\": <number>, \"criticalIssues\": [\"issue1\"], \"highIssues\": [\"issue1\"], \"overallScore\": <1-10>, \"recommendation\": \"approve|request_changes|block\"}",
        "temperature": 0.1, "maxTokens": 500,
        "outputSchema": "{\"hasCritical\": \"boolean\", \"issueCount\": \"number\", \"criticalIssues\": \"array\", \"overallScore\": \"number\", \"recommendation\": \"string\"}"
      }
    },
    {
      "id": "critical-gate",
      "type": "branch",
      "position": {"x": 1200, "y": 200},
      "data": {"nodeType": "branch", "label": "Critical Issues Found?", "condition": "output.hasCritical === true || output.overallScore < 6"}
    },
    {
      "id": "linear-issue",
      "type": "linear",
      "position": {"x": 1500, "y": 80},
      "data": {
        "nodeType": "linear", "label": "Create Linear Bug",
        "integrationOp": "create_issue",
        "integrationToken": "", "linearTeamId": "",
        "linearTitle": "Critical PR Review Issues Found",
        "linearDescription": "## Code Review Findings\n\n{{review.output}}\n\n## Severity Analysis\n{{score.output}}",
        "linearPriority": "1"
      }
    },
    {
      "id": "notify-dev",
      "type": "emailSend",
      "position": {"x": 1800, "y": 80},
      "data": {
        "nodeType": "emailSend", "label": "Notify Developer",
        "emailTo": "dev@yourcompany.com",
        "emailSubject": "🚨 Critical Issues Found in PR Review",
        "emailBody": "<h2>PR Code Review — Critical Issues Detected</h2><h3>Review Summary</h3>{{review.output}}<h3>Severity Breakdown</h3>{{score.output}}"
      }
    },
    {
      "id": "approved-output",
      "type": "textOutput",
      "position": {"x": 1500, "y": 380},
      "data": {"nodeType": "textOutput", "label": "PR Looks Good"}
    }
  ],
  "edges": [
    {"id": "e1", "source": "webhook", "target": "fetch-pr"},
    {"id": "e2", "source": "fetch-pr", "target": "review"},
    {"id": "e3", "source": "review", "target": "score"},
    {"id": "e4", "source": "score", "target": "critical-gate"},
    {"id": "e5", "source": "critical-gate", "target": "linear-issue", "sourceHandle": "true"},
    {"id": "e6", "source": "critical-gate", "target": "approved-output", "sourceHandle": "false"},
    {"id": "e7", "source": "linear-issue", "target": "notify-dev"}
  ]
}'

# ─────────────────────────────────────────────────────────────────
# 3. Research Paper Digest Newsletter
# ─────────────────────────────────────────────────────────────────
create_workflow "Research Paper Digest Newsletter" '{
  "name": "Research Paper Digest Newsletter",
  "nodes": [
    {
      "id": "daily-sched",
      "type": "scheduledTrigger",
      "position": {"x": 0, "y": 200},
      "data": {"nodeType": "scheduledTrigger", "label": "Daily 7am Trigger", "interval": "24h"}
    },
    {
      "id": "search-papers",
      "type": "llm",
      "position": {"x": 300, "y": 200},
      "data": {
        "nodeType": "llm", "label": "Find Latest Papers",
        "model": "claude-sonnet-4-5",
        "systemPrompt": "You are a research assistant specializing in AI, machine learning, and software engineering. Search for the latest papers published today or this week on arXiv and other sources.",
        "userPrompt": "Search for the 6 most interesting AI/ML papers published in the last 24 hours. Return JSON: {\"papers\": [{\"title\": \"...\", \"url\": \"...\", \"abstract\": \"...\", \"relevance\": \"why this matters\"}]}",
        "temperature": 0.3, "maxTokens": 3000, "enableWebSearch": true,
        "outputSchema": "{\"papers\": \"array\"}"
      }
    },
    {
      "id": "paper-loop",
      "type": "loop",
      "position": {"x": 600, "y": 200},
      "data": {"nodeType": "loop", "label": "Loop Over Papers", "loopOverField": "output.papers", "mode": "concurrent"}
    },
    {
      "id": "summarize-paper",
      "type": "llm",
      "position": {"x": 900, "y": 200},
      "data": {
        "nodeType": "llm", "label": "Summarize Each Paper",
        "model": "claude-haiku-4-5",
        "systemPrompt": "You are a science communicator. Summarize academic papers in clear, engaging language for a technical but non-specialist audience.",
        "userPrompt": "Summarize this paper for a developer audience. Include: what problem it solves, the key insight, and why it matters practically.\n\nPaper: {{paper-loop.output}}",
        "temperature": 0.5, "maxTokens": 400, "enableWebSearch": false
      }
    },
    {
      "id": "synthesize-digest",
      "type": "llm",
      "position": {"x": 1200, "y": 200},
      "data": {
        "nodeType": "llm", "label": "Synthesize Into Digest",
        "model": "claude-sonnet-4-5",
        "systemPrompt": "You are a newsletter editor creating a daily research digest. Write in an engaging, slightly opinionated tone. Format in clean HTML suitable for email.",
        "userPrompt": "Create a polished daily research digest from these paper summaries:\n\n{{summarize-paper.output}}\n\nOriginal search results for context:\n{{search-papers.output}}\n\nFormat as HTML with a compelling intro, each paper as a section with title, 2-3 sentence summary, and a \"Why it matters\" insight. End with a 1-sentence synthesis of the day'\''s theme.",
        "temperature": 0.6, "maxTokens": 3000
      }
    },
    {
      "id": "send-digest",
      "type": "emailSend",
      "position": {"x": 1500, "y": 200},
      "data": {
        "nodeType": "emailSend", "label": "Send Daily Digest",
        "emailTo": "you@yourcompany.com",
        "emailSubject": "📚 Daily Research Digest",
        "emailBody": "{{synthesize-digest.output}}"
      }
    }
  ],
  "edges": [
    {"id": "e1", "source": "daily-sched", "target": "search-papers"},
    {"id": "e2", "source": "search-papers", "target": "paper-loop"},
    {"id": "e3", "source": "paper-loop", "target": "summarize-paper"},
    {"id": "e4", "source": "summarize-paper", "target": "synthesize-digest"},
    {"id": "e5", "source": "synthesize-digest", "target": "send-digest"}
  ]
}'

# ─────────────────────────────────────────────────────────────────
# 4. Customer Feedback Triage
# ─────────────────────────────────────────────────────────────────
create_workflow "Customer Feedback Triage" '{
  "name": "Customer Feedback Triage",
  "nodes": [
    {
      "id": "fb-webhook",
      "type": "webhookTrigger",
      "position": {"x": 0, "y": 200},
      "data": {"nodeType": "webhookTrigger", "label": "Feedback Webhook"}
    },
    {
      "id": "classify",
      "type": "llm",
      "position": {"x": 300, "y": 200},
      "data": {
        "nodeType": "llm", "label": "Classify Feedback",
        "model": "claude-haiku-4-5",
        "systemPrompt": "You are a customer success specialist. Analyze customer feedback and classify it accurately. Return ONLY valid JSON.",
        "userPrompt": "Analyze this customer feedback:\n\n{{fb-webhook.output}}\n\nClassify it and return JSON: {\"sentiment\": \"positive|neutral|negative\", \"urgency\": \"low|medium|high|critical\", \"category\": \"bug|feature_request|billing|support|praise|other\", \"summary\": \"one sentence\", \"suggested_response\": \"draft reply to customer\", \"needs_escalation\": <boolean>}",
        "temperature": 0.1, "maxTokens": 600,
        "outputSchema": "{\"sentiment\": \"string\", \"urgency\": \"string\", \"category\": \"string\", \"summary\": \"string\", \"needs_escalation\": \"boolean\"}"
      }
    },
    {
      "id": "urgency-gate",
      "type": "branch",
      "position": {"x": 600, "y": 200},
      "data": {"nodeType": "branch", "label": "Urgent / Needs Escalation?", "condition": "output.urgency === \"critical\" || output.urgency === \"high\" || output.needs_escalation === true"}
    },
    {
      "id": "human-review",
      "type": "humanApproval",
      "position": {"x": 900, "y": 60},
      "data": {
        "nodeType": "humanApproval", "label": "Approve Escalation",
        "approvalMessage": "High-urgency customer feedback received. Review the classification and approve to create a Linear issue and send a response email.",
        "approvalTimeout": 900, "approvalEmail": ""
      }
    },
    {
      "id": "linear-ticket",
      "type": "linear",
      "position": {"x": 1200, "y": 60},
      "data": {
        "nodeType": "linear", "label": "Create Support Ticket",
        "integrationOp": "create_issue",
        "integrationToken": "", "linearTeamId": "",
        "linearTitle": "Customer Issue: {{classify.output}}",
        "linearDescription": "## Customer Feedback\n\n{{fb-webhook.output}}\n\n## Classification\n{{classify.output}}",
        "linearPriority": "1"
      }
    },
    {
      "id": "response-email",
      "type": "emailSend",
      "position": {"x": 1500, "y": 60},
      "data": {
        "nodeType": "emailSend", "label": "Send Response Email",
        "emailTo": "customer@example.com",
        "emailSubject": "Re: Your Recent Feedback",
        "emailBody": "{{classify.output}}"
      }
    },
    {
      "id": "notion-log",
      "type": "notion",
      "position": {"x": 900, "y": 380},
      "data": {
        "nodeType": "notion", "label": "Log to Notion",
        "integrationOp": "create_page",
        "integrationToken": "", "notionDatabaseId": "",
        "notionTitle": "Feedback Log: {{classify.output}}",
        "notionContent": "## Original Feedback\n{{fb-webhook.output}}\n\n## Classification\n{{classify.output}}"
      }
    }
  ],
  "edges": [
    {"id": "e1", "source": "fb-webhook", "target": "classify"},
    {"id": "e2", "source": "classify", "target": "urgency-gate"},
    {"id": "e3", "source": "urgency-gate", "target": "human-review", "sourceHandle": "true"},
    {"id": "e4", "source": "urgency-gate", "target": "notion-log", "sourceHandle": "false"},
    {"id": "e5", "source": "human-review", "target": "linear-ticket", "sourceHandle": "approved"},
    {"id": "e6", "source": "linear-ticket", "target": "response-email"}
  ]
}'

# ─────────────────────────────────────────────────────────────────
# 5. Deep Market Research Report
# ─────────────────────────────────────────────────────────────────
create_workflow "Deep Market Research Report" '{
  "name": "Deep Market Research Report",
  "nodes": [
    {
      "id": "company-input",
      "type": "textInput",
      "position": {"x": 0, "y": 200},
      "data": {"nodeType": "textInput", "label": "Company Name", "defaultValue": "Enter company name here"}
    },
    {
      "id": "find-sources",
      "type": "llm",
      "position": {"x": 300, "y": 200},
      "data": {
        "nodeType": "llm", "label": "Find Research Sources",
        "model": "claude-sonnet-4-5",
        "systemPrompt": "You are a market research analyst. Find credible sources about a company: news articles, earnings reports, product pages, LinkedIn, Crunchbase, competitor comparisons, and industry analysis.",
        "userPrompt": "Research the company: {{company-input.output}}\n\nFind 6 high-quality sources. Return JSON: {\"company\": \"name\", \"urls\": [\"url1\", \"url2\", \"url3\", \"url4\", \"url5\", \"url6\"], \"initial_summary\": \"what you found so far\"}",
        "temperature": 0.2, "maxTokens": 1500, "enableWebSearch": true,
        "outputSchema": "{\"company\": \"string\", \"urls\": \"array\", \"initial_summary\": \"string\"}"
      }
    },
    {
      "id": "research-loop",
      "type": "loop",
      "position": {"x": 600, "y": 200},
      "data": {"nodeType": "loop", "label": "Read Each Source", "loopOverField": "output.urls", "mode": "concurrent"}
    },
    {
      "id": "extract-signals",
      "type": "llm",
      "position": {"x": 900, "y": 200},
      "data": {
        "nodeType": "llm", "label": "Extract Market Signals",
        "model": "claude-sonnet-4-5",
        "systemPrompt": "You are a market analyst. Read the provided URL and extract competitive intelligence, financial signals, product strategy, and market positioning information.",
        "userPrompt": "Read and analyze this URL for market intelligence about {{company-input.output}}:\n\n{{research-loop.output}}\n\nExtract: key facts, revenue/funding signals, product strategy, competitive positioning, and any risks or opportunities mentioned.",
        "temperature": 0.2, "maxTokens": 1000, "enableWebSearch": true
      }
    },
    {
      "id": "synthesize-report",
      "type": "llm",
      "position": {"x": 1200, "y": 200},
      "data": {
        "nodeType": "llm", "label": "Synthesize Full Report",
        "model": "claude-sonnet-4-5",
        "systemPrompt": "You are a senior market analyst writing a comprehensive company research report. Structure it professionally with clear sections. Be analytical and cite specific evidence.",
        "userPrompt": "Create a comprehensive market research report for: {{company-input.output}}\n\nBased on these research signals:\n{{extract-signals.output}}\n\nInitial context:\n{{find-sources.output}}\n\nStructure the report with: Executive Summary, Company Overview, Product & Technology, Market Position & Competition, Financial Overview, Growth Signals, Risks & Opportunities, Strategic Recommendations.",
        "temperature": 0.4, "maxTokens": 4000
      }
    },
    {
      "id": "save-notion",
      "type": "notion",
      "position": {"x": 1500, "y": 200},
      "data": {
        "nodeType": "notion", "label": "Save Report to Notion",
        "integrationOp": "create_page",
        "integrationToken": "", "notionDatabaseId": "",
        "notionTitle": "Market Research: {{company-input.output}}",
        "notionContent": "{{synthesize-report.output}}"
      }
    }
  ],
  "edges": [
    {"id": "e1", "source": "company-input", "target": "find-sources"},
    {"id": "e2", "source": "find-sources", "target": "research-loop"},
    {"id": "e3", "source": "research-loop", "target": "extract-signals"},
    {"id": "e4", "source": "extract-signals", "target": "synthesize-report"},
    {"id": "e5", "source": "synthesize-report", "target": "save-notion"}
  ]
}'

# ─────────────────────────────────────────────────────────────────
# 6. Content Repurposing Pipeline
# ─────────────────────────────────────────────────────────────────
create_workflow "Content Repurposing Pipeline" '{
  "name": "Content Repurposing Pipeline",
  "nodes": [
    {
      "id": "blog-webhook",
      "type": "webhookTrigger",
      "position": {"x": 0, "y": 250},
      "data": {"nodeType": "webhookTrigger", "label": "Blog URL Webhook"}
    },
    {
      "id": "read-content",
      "type": "llm",
      "position": {"x": 300, "y": 250},
      "data": {
        "nodeType": "llm", "label": "Read & Extract Key Ideas",
        "model": "claude-sonnet-4-5",
        "systemPrompt": "You are a content strategist. Read the provided blog post URL and extract the core ideas, key arguments, memorable quotes, and main takeaways.",
        "userPrompt": "Read this blog post and extract its essence:\n\n{{blog-webhook.output}}\n\nExtract: main thesis, 5-7 key points, best quotes, target audience, and tone. Format as structured notes.",
        "temperature": 0.3, "maxTokens": 2000, "enableWebSearch": true
      }
    },
    {
      "id": "twitter-draft",
      "type": "llm",
      "position": {"x": 650, "y": 60},
      "data": {
        "nodeType": "llm", "label": "Generate Twitter Thread",
        "model": "claude-sonnet-4-5",
        "systemPrompt": "You are a Twitter growth expert. Write viral threads that are educational, punchy, and shareable. Use numbers, contrast, and strong hooks.",
        "userPrompt": "Turn these key ideas into a 7-tweet thread:\n\n{{read-content.output}}\n\nFormat: Tweet 1 (hook), Tweets 2-6 (one key insight each, max 280 chars), Tweet 7 (CTA/summary). Number each tweet.",
        "temperature": 0.7, "maxTokens": 1000
      }
    },
    {
      "id": "linkedin-draft",
      "type": "llm",
      "position": {"x": 650, "y": 250},
      "data": {
        "nodeType": "llm", "label": "Generate LinkedIn Post",
        "model": "claude-sonnet-4-5",
        "systemPrompt": "You are a LinkedIn content expert. Write thoughtful, professional posts that spark discussion. Use line breaks for readability, personal voice, and end with a question.",
        "userPrompt": "Write a LinkedIn post based on these ideas:\n\n{{read-content.output}}\n\nTarget: 150-300 words. Include a hook first line, 3-4 insight paragraphs, and a discussion question. Professional but conversational tone.",
        "temperature": 0.7, "maxTokens": 600
      }
    },
    {
      "id": "newsletter-draft",
      "type": "llm",
      "position": {"x": 650, "y": 440},
      "data": {
        "nodeType": "llm", "label": "Generate Newsletter Section",
        "model": "claude-sonnet-4-5",
        "systemPrompt": "You are a newsletter writer. Write engaging email content that readers look forward to. Include context, your perspective, and actionable takeaways.",
        "userPrompt": "Write a newsletter section from these ideas:\n\n{{read-content.output}}\n\nFormat as HTML: compelling subject line suggestion, 200-word section with subheading, key takeaway box, and link to original article. Warm, smart tone.",
        "temperature": 0.6, "maxTokens": 800
      }
    },
    {
      "id": "review-approval",
      "type": "humanApproval",
      "position": {"x": 1000, "y": 250},
      "data": {
        "nodeType": "humanApproval", "label": "Review Content Before Publishing",
        "approvalMessage": "Content has been generated for Twitter, LinkedIn, and Newsletter. Review all three pieces and approve to publish.",
        "approvalTimeout": 86400, "approvalEmail": ""
      }
    },
    {
      "id": "publish-twitter",
      "type": "httpRequest",
      "position": {"x": 1350, "y": 60},
      "data": {
        "nodeType": "httpRequest", "label": "Post Twitter Thread",
        "url": "https://api.twitter.com/2/tweets",
        "method": "POST",
        "requestHeaders": "{\"Authorization\": \"Bearer YOUR_TWITTER_TOKEN\", \"Content-Type\": \"application/json\"}",
        "requestBody": "{\"text\": \"{{twitter-draft.output}}\"}"
      }
    },
    {
      "id": "publish-linkedin",
      "type": "httpRequest",
      "position": {"x": 1350, "y": 250},
      "data": {
        "nodeType": "httpRequest", "label": "Post to LinkedIn",
        "url": "https://api.linkedin.com/v2/ugcPosts",
        "method": "POST",
        "requestHeaders": "{\"Authorization\": \"Bearer YOUR_LINKEDIN_TOKEN\", \"Content-Type\": \"application/json\"}",
        "requestBody": "{\"author\": \"urn:li:person:YOUR_ID\", \"lifecycleState\": \"PUBLISHED\", \"specificContent\": {\"com.linkedin.ugc.ShareContent\": {\"shareCommentary\": {\"text\": \"{{linkedin-draft.output}}\"}, \"shareMediaCategory\": \"NONE\"}}, \"visibility\": {\"com.linkedin.ugc.MemberNetworkVisibility\": \"PUBLIC\"}}"
      }
    },
    {
      "id": "save-newsletter",
      "type": "notion",
      "position": {"x": 1350, "y": 440},
      "data": {
        "nodeType": "notion", "label": "Save Newsletter Draft to Notion",
        "integrationOp": "create_page",
        "integrationToken": "", "notionDatabaseId": "",
        "notionTitle": "Newsletter Draft: Repurposed Content",
        "notionContent": "## Twitter Thread\n{{twitter-draft.output}}\n\n## LinkedIn Post\n{{linkedin-draft.output}}\n\n## Newsletter Section\n{{newsletter-draft.output}}"
      }
    }
  ],
  "edges": [
    {"id": "e1", "source": "blog-webhook", "target": "read-content"},
    {"id": "e2", "source": "read-content", "target": "twitter-draft"},
    {"id": "e3", "source": "read-content", "target": "linkedin-draft"},
    {"id": "e4", "source": "read-content", "target": "newsletter-draft"},
    {"id": "e5", "source": "twitter-draft", "target": "review-approval"},
    {"id": "e6", "source": "linkedin-draft", "target": "review-approval"},
    {"id": "e7", "source": "newsletter-draft", "target": "review-approval"},
    {"id": "e8", "source": "review-approval", "target": "publish-twitter", "sourceHandle": "approved"},
    {"id": "e9", "source": "review-approval", "target": "publish-linkedin", "sourceHandle": "approved"},
    {"id": "e10", "source": "review-approval", "target": "save-newsletter", "sourceHandle": "approved"}
  ]
}'

# ─────────────────────────────────────────────────────────────────
# 7. Daily Personalized News Briefing
# ─────────────────────────────────────────────────────────────────
create_workflow "Daily Personalized News Briefing" '{
  "name": "Daily Personalized News Briefing",
  "nodes": [
    {
      "id": "morning-sched",
      "type": "scheduledTrigger",
      "position": {"x": 0, "y": 250},
      "data": {"nodeType": "scheduledTrigger", "label": "7am Daily Trigger", "interval": "24h"}
    },
    {
      "id": "tech-news",
      "type": "llm",
      "position": {"x": 300, "y": 60},
      "data": {
        "nodeType": "llm", "label": "Search Tech News",
        "model": "claude-haiku-4-5",
        "systemPrompt": "You are a tech journalist. Find the most important tech news from the past 24 hours. Focus on: product launches, funding rounds, acquisitions, and major technical developments.",
        "userPrompt": "Search for today'\''s top 3 tech stories. For each: headline, 2-sentence summary, source URL, and why it matters.",
        "temperature": 0.3, "maxTokens": 800, "enableWebSearch": true
      }
    },
    {
      "id": "ai-news",
      "type": "llm",
      "position": {"x": 300, "y": 250},
      "data": {
        "nodeType": "llm", "label": "Search AI/ML News",
        "model": "claude-haiku-4-5",
        "systemPrompt": "You are an AI researcher and journalist. Find the most significant AI/ML developments from the past 24 hours: new models, research breakthroughs, company moves, and policy news.",
        "userPrompt": "Search for today'\''s top 3 AI/ML stories. For each: headline, 2-sentence summary, source URL, and practical implications.",
        "temperature": 0.3, "maxTokens": 800, "enableWebSearch": true
      }
    },
    {
      "id": "market-news",
      "type": "llm",
      "position": {"x": 300, "y": 440},
      "data": {
        "nodeType": "llm", "label": "Search Market & Business News",
        "model": "claude-haiku-4-5",
        "systemPrompt": "You are a financial journalist. Find the most relevant business and market news for tech professionals: market movements, major business decisions, economic indicators, and startup news.",
        "userPrompt": "Search for today'\''s top 3 business/market stories relevant to tech professionals. For each: headline, 2-sentence summary, source URL, and what it means for tech.",
        "temperature": 0.3, "maxTokens": 800, "enableWebSearch": true
      }
    },
    {
      "id": "synthesize",
      "type": "llm",
      "position": {"x": 700, "y": 250},
      "data": {
        "nodeType": "llm", "label": "Synthesize Morning Briefing",
        "model": "claude-sonnet-4-5",
        "systemPrompt": "You are a brilliant editor creating a morning briefing for a senior tech professional. Your briefing is concise, insightful, and has a clear point of view. Format in clean HTML for email. Include cross-topic connections where relevant.",
        "userPrompt": "Create a morning briefing email from these three news digests:\n\n## TECH NEWS\n{{tech-news.output}}\n\n## AI/ML NEWS\n{{ai-news.output}}\n\n## MARKET NEWS\n{{market-news.output}}\n\nFormat as HTML email with: subject line suggestion, brief editorial intro (2 sentences), three sections (Tech, AI, Markets), each with 3 stories, and a closing \"The Big Picture\" paragraph connecting today'\''s themes.",
        "temperature": 0.5, "maxTokens": 2500
      }
    },
    {
      "id": "send-briefing",
      "type": "emailSend",
      "position": {"x": 1050, "y": 250},
      "data": {
        "nodeType": "emailSend", "label": "Send Morning Briefing",
        "emailTo": "you@yourcompany.com",
        "emailSubject": "☀️ Your Morning Briefing",
        "emailBody": "{{synthesize.output}}"
      }
    }
  ],
  "edges": [
    {"id": "e1", "source": "morning-sched", "target": "tech-news"},
    {"id": "e2", "source": "morning-sched", "target": "ai-news"},
    {"id": "e3", "source": "morning-sched", "target": "market-news"},
    {"id": "e4", "source": "tech-news", "target": "synthesize"},
    {"id": "e5", "source": "ai-news", "target": "synthesize"},
    {"id": "e6", "source": "market-news", "target": "synthesize"},
    {"id": "e7", "source": "synthesize", "target": "send-briefing"}
  ]
}'

# ─────────────────────────────────────────────────────────────────
# 8. Incident Response + Auto Post-Mortem
# ─────────────────────────────────────────────────────────────────
create_workflow "Incident Response + Auto Post-Mortem" '{
  "name": "Incident Response + Auto Post-Mortem",
  "nodes": [
    {
      "id": "alert-webhook",
      "type": "webhookTrigger",
      "position": {"x": 0, "y": 200},
      "data": {"nodeType": "webhookTrigger", "label": "Monitoring Alert Webhook"}
    },
    {
      "id": "diagnose",
      "type": "llm",
      "position": {"x": 300, "y": 200},
      "data": {
        "nodeType": "llm", "label": "Diagnose Incident",
        "model": "claude-sonnet-4-5",
        "systemPrompt": "You are a senior SRE/DevOps engineer. When given an alert or error, diagnose the root cause by searching for known issues, documentation, and similar incidents. Use extended thinking to reason through the problem systematically.",
        "userPrompt": "Diagnose this incident alert:\n\n{{alert-webhook.output}}\n\nSearch for: known issues with this error, similar incidents, potential causes, and recommended fixes. Return JSON: {\"severity\": \"low|medium|high|critical\", \"likely_cause\": \"...\", \"affected_systems\": [\"...\"], \"immediate_actions\": [\"step1\", \"step2\"], \"escalation_needed\": <boolean>, \"estimated_impact\": \"...\"}",
        "temperature": 0.2, "maxTokens": 2000, "enableWebSearch": true,
        "outputSchema": "{\"severity\": \"string\", \"likely_cause\": \"string\", \"immediate_actions\": \"array\", \"escalation_needed\": \"boolean\"}"
      }
    },
    {
      "id": "severity-gate",
      "type": "branch",
      "position": {"x": 600, "y": 200},
      "data": {"nodeType": "branch", "label": "High Severity?", "condition": "output.severity === \"high\" || output.severity === \"critical\" || output.escalation_needed === true"}
    },
    {
      "id": "oncall-approval",
      "type": "humanApproval",
      "position": {"x": 900, "y": 60},
      "data": {
        "nodeType": "humanApproval", "label": "On-Call Acknowledgement",
        "approvalMessage": "HIGH SEVERITY INCIDENT DETECTED. Review the diagnosis and approve to: create a Linear incident ticket, notify stakeholders, and begin post-mortem draft.",
        "approvalTimeout": 300, "approvalEmail": "oncall@yourcompany.com"
      }
    },
    {
      "id": "linear-incident",
      "type": "linear",
      "position": {"x": 1200, "y": 60},
      "data": {
        "nodeType": "linear", "label": "Create Incident Ticket",
        "integrationOp": "create_issue",
        "integrationToken": "", "linearTeamId": "",
        "linearTitle": "INCIDENT: {{diagnose.output}}",
        "linearDescription": "## Incident Alert\n{{alert-webhook.output}}\n\n## Diagnosis\n{{diagnose.output}}\n\n## Status\nACTIVE - Under Investigation",
        "linearPriority": "0"
      }
    },
    {
      "id": "postmortem-draft",
      "type": "llm",
      "position": {"x": 1500, "y": 60},
      "data": {
        "nodeType": "llm", "label": "Draft Post-Mortem",
        "model": "claude-sonnet-4-5",
        "systemPrompt": "You are an SRE writing a post-mortem document. Follow blameless post-mortem culture. Be specific about timeline, impact, and prevention.",
        "userPrompt": "Draft a post-mortem document for this incident:\n\n## Alert\n{{alert-webhook.output}}\n\n## Diagnosis\n{{diagnose.output}}\n\nCreate a full post-mortem with: Executive Summary, Timeline (fill with placeholders), Root Cause Analysis, Impact Assessment, What Went Well, What Went Wrong, Action Items (5 specific preventive measures), and Lessons Learned.",
        "temperature": 0.3, "maxTokens": 3000
      }
    },
    {
      "id": "notion-postmortem",
      "type": "notion",
      "position": {"x": 1800, "y": 60},
      "data": {
        "nodeType": "notion", "label": "Save Post-Mortem to Notion",
        "integrationOp": "create_page",
        "integrationToken": "", "notionDatabaseId": "",
        "notionTitle": "Post-Mortem: Incident",
        "notionContent": "{{postmortem-draft.output}}"
      }
    },
    {
      "id": "auto-resolved",
      "type": "textOutput",
      "position": {"x": 900, "y": 380},
      "data": {"nodeType": "textOutput", "label": "Auto-Resolved (Low Severity)"}
    }
  ],
  "edges": [
    {"id": "e1", "source": "alert-webhook", "target": "diagnose"},
    {"id": "e2", "source": "diagnose", "target": "severity-gate"},
    {"id": "e3", "source": "severity-gate", "target": "oncall-approval", "sourceHandle": "true"},
    {"id": "e4", "source": "severity-gate", "target": "auto-resolved", "sourceHandle": "false"},
    {"id": "e5", "source": "oncall-approval", "target": "linear-incident", "sourceHandle": "approved"},
    {"id": "e6", "source": "linear-incident", "target": "postmortem-draft"},
    {"id": "e7", "source": "postmortem-draft", "target": "notion-postmortem"}
  ]
}'

# ─────────────────────────────────────────────────────────────────
# 9. Job / Opportunity Research Assistant
# ─────────────────────────────────────────────────────────────────
create_workflow "Job Opportunity Research Assistant" '{
  "name": "Job Opportunity Research Assistant",
  "nodes": [
    {
      "id": "job-webhook",
      "type": "webhookTrigger",
      "position": {"x": 0, "y": 200},
      "data": {"nodeType": "webhookTrigger", "label": "Job URL Webhook"}
    },
    {
      "id": "extract-job",
      "type": "llm",
      "position": {"x": 300, "y": 200},
      "data": {
        "nodeType": "llm", "label": "Extract Job Details",
        "model": "claude-sonnet-4-5",
        "systemPrompt": "You are a career advisor. Read the job posting URL and extract all relevant information about the role, requirements, and company.",
        "userPrompt": "Read and extract details from this job posting:\n\n{{job-webhook.output}}\n\nExtract: job title, company name, location/remote policy, salary range (if listed), key responsibilities (top 5), required skills, nice-to-have skills, company size/stage, and any red/green flags in the posting.",
        "temperature": 0.2, "maxTokens": 1500, "enableWebSearch": true
      }
    },
    {
      "id": "company-research",
      "type": "llm",
      "position": {"x": 600, "y": 200},
      "data": {
        "nodeType": "llm", "label": "Research Company",
        "model": "claude-sonnet-4-5",
        "systemPrompt": "You are a thorough researcher preparing someone for a job application and potential interviews. Research the company deeply.",
        "userPrompt": "Research the company from this job posting:\n\n{{extract-job.output}}\n\nFind: company mission & values, recent news & funding, product/technology stack, culture (Glassdoor/Blind reviews), leadership team, competitive position, growth trajectory, and any controversies or concerns. Be thorough and honest.",
        "temperature": 0.3, "maxTokens": 2500, "enableWebSearch": true
      }
    },
    {
      "id": "score-fit",
      "type": "llm",
      "position": {"x": 900, "y": 200},
      "data": {
        "nodeType": "llm", "label": "Score Fit & Generate Materials",
        "model": "claude-sonnet-4-5",
        "systemPrompt": "You are an expert career coach and writer. Assess job fit and create compelling application materials. Be honest about fit scores.",
        "userPrompt": "Based on the job details and company research:\n\n## Job Details\n{{extract-job.output}}\n\n## Company Research\n{{company-research.output}}\n\nCreate:\n1. FIT SCORE (1-10) with honest reasoning\n2. TAILORED COVER LETTER (3 paragraphs, specific to this role)\n3. TOP 5 QUESTIONS TO ASK in the interview\n4. SALARY NEGOTIATION NOTES based on market research\n5. POTENTIAL RED FLAGS to watch for",
        "temperature": 0.5, "maxTokens": 3000, "enableWebSearch": true
      }
    },
    {
      "id": "review-approval",
      "type": "humanApproval",
      "position": {"x": 1200, "y": 200},
      "data": {
        "nodeType": "humanApproval", "label": "Review & Approve Application",
        "approvalMessage": "Job research complete. Review the company analysis, fit score, and generated cover letter. Approve to save everything to Notion.",
        "approvalTimeout": 86400, "approvalEmail": ""
      }
    },
    {
      "id": "save-notion",
      "type": "notion",
      "position": {"x": 1500, "y": 80},
      "data": {
        "nodeType": "notion", "label": "Save to Job Tracker",
        "integrationOp": "create_page",
        "integrationToken": "", "notionDatabaseId": "",
        "notionTitle": "Job Application: {{extract-job.output}}",
        "notionContent": "## Job Details\n{{extract-job.output}}\n\n## Company Research\n{{company-research.output}}\n\n## Application Materials & Fit Analysis\n{{score-fit.output}}"
      }
    },
    {
      "id": "rejected-output",
      "type": "textOutput",
      "position": {"x": 1500, "y": 360},
      "data": {"nodeType": "textOutput", "label": "Application Skipped"}
    }
  ],
  "edges": [
    {"id": "e1", "source": "job-webhook", "target": "extract-job"},
    {"id": "e2", "source": "extract-job", "target": "company-research"},
    {"id": "e3", "source": "company-research", "target": "score-fit"},
    {"id": "e4", "source": "score-fit", "target": "review-approval"},
    {"id": "e5", "source": "review-approval", "target": "save-notion", "sourceHandle": "approved"},
    {"id": "e6", "source": "review-approval", "target": "rejected-output", "sourceHandle": "rejected"}
  ]
}'

# ─────────────────────────────────────────────────────────────────
# 10. Automated Trend-to-Content Pipeline
# ─────────────────────────────────────────────────────────────────
create_workflow "Automated Trend-to-Content Pipeline" '{
  "name": "Automated Trend-to-Content Pipeline",
  "nodes": [
    {
      "id": "weekly-sched",
      "type": "scheduledTrigger",
      "position": {"x": 0, "y": 250},
      "data": {"nodeType": "scheduledTrigger", "label": "Monday Weekly Trigger", "interval": "24h"}
    },
    {
      "id": "find-trends",
      "type": "llm",
      "position": {"x": 300, "y": 250},
      "data": {
        "nodeType": "llm", "label": "Find Trending Topics",
        "model": "claude-sonnet-4-5",
        "systemPrompt": "You are a content strategist specializing in tech and AI. Find what'\''s genuinely trending this week in the tech/AI/developer space — what people are actually talking about, debating, and sharing.",
        "userPrompt": "Search for this week'\''s top trending topics in tech/AI/developer communities (Twitter, HackerNews, Reddit, LinkedIn). Find 8 topics with real momentum. Return JSON: {\"topics\": [{\"title\": \"...\", \"description\": \"brief description\", \"trend_source\": \"where it'\''s trending\", \"content_angle\": \"unique angle to write about\"}]}",
        "temperature": 0.4, "maxTokens": 2000, "enableWebSearch": true,
        "outputSchema": "{\"topics\": \"array\"}"
      }
    },
    {
      "id": "topic-loop",
      "type": "loop",
      "position": {"x": 600, "y": 250},
      "data": {"nodeType": "loop", "label": "Score Each Topic", "loopOverField": "output.topics", "mode": "concurrent"}
    },
    {
      "id": "score-topic",
      "type": "llm",
      "position": {"x": 900, "y": 250},
      "data": {
        "nodeType": "llm", "label": "Score & Outline Topic",
        "model": "claude-haiku-4-5",
        "systemPrompt": "You are a content strategist who scores content opportunities. Consider: audience interest, content gap (is it covered well?), your competitive advantage, SEO potential, and evergreen vs. timely value. Return JSON only.",
        "userPrompt": "Score this trending topic as a content opportunity:\n\n{{topic-loop.output}}\n\nReturn JSON: {\"topic\": \"topic title\", \"opportunity_score\": <1-10>, \"reasoning\": \"why this score\", \"content_gap\": \"what angle is missing\", \"outline\": [\"H1 title\", \"point1\", \"point2\", \"point3\", \"point4\", \"conclusion\"], \"estimated_traffic_potential\": \"low|medium|high\"}",
        "temperature": 0.3, "maxTokens": 600,
        "outputSchema": "{\"topic\": \"string\", \"opportunity_score\": \"number\", \"outline\": \"array\"}"
      }
    },
    {
      "id": "select-best",
      "type": "llm",
      "position": {"x": 1200, "y": 250},
      "data": {
        "nodeType": "llm", "label": "Select Top 3 Opportunities",
        "model": "claude-sonnet-4-5",
        "systemPrompt": "You are a content director making final editorial decisions. Select the best content opportunities based on scores, uniqueness, and strategic value. Return JSON only.",
        "userPrompt": "From these scored topics, select the top 3 with the best content opportunities:\n\n{{score-topic.output}}\n\nReturn JSON: {\"bestTopics\": [{\"topic\": \"...\", \"score\": <number>, \"outline\": [...], \"reasoning\": \"why selected\"}], \"editorial_note\": \"overall strategic note about this week'\''s content\"}",
        "temperature": 0.2, "maxTokens": 1500,
        "outputSchema": "{\"bestTopics\": \"array\", \"editorial_note\": \"string\"}"
      }
    },
    {
      "id": "quality-gate",
      "type": "branch",
      "position": {"x": 1500, "y": 250},
      "data": {"nodeType": "branch", "label": "Strong Opportunities Found?", "condition": "output.bestTopics && output.bestTopics.length > 0 && output.bestTopics[0].score >= 7"}
    },
    {
      "id": "editorial-review",
      "type": "humanApproval",
      "position": {"x": 1800, "y": 80},
      "data": {
        "nodeType": "humanApproval", "label": "Approve Content Calendar",
        "approvalMessage": "Weekly content opportunities identified. Review the top 3 topics with outlines and approve to create Linear writing tasks and save outlines to Notion.",
        "approvalTimeout": 86400, "approvalEmail": ""
      }
    },
    {
      "id": "linear-tasks",
      "type": "linear",
      "position": {"x": 2100, "y": 80},
      "data": {
        "nodeType": "linear", "label": "Create Writing Tasks",
        "integrationOp": "create_issue",
        "integrationToken": "", "linearTeamId": "",
        "linearTitle": "Content: Weekly Writing Tasks",
        "linearDescription": "## This Week'\''s Content Opportunities\n\n{{select-best.output}}\n\n## All Scored Topics\n{{score-topic.output}}",
        "linearPriority": "3"
      }
    },
    {
      "id": "notion-outlines",
      "type": "notion",
      "position": {"x": 2400, "y": 80},
      "data": {
        "nodeType": "notion", "label": "Save Outlines to Notion",
        "integrationOp": "create_page",
        "integrationToken": "", "notionDatabaseId": "",
        "notionTitle": "Content Calendar: Weekly Opportunities",
        "notionContent": "## Top Content Opportunities\n{{select-best.output}}\n\n## All Trending Topics\n{{find-trends.output}}\n\n## Scored Analysis\n{{score-topic.output}}"
      }
    },
    {
      "id": "no-trends",
      "type": "textOutput",
      "position": {"x": 1800, "y": 420},
      "data": {"nodeType": "textOutput", "label": "No Strong Opportunities This Week"}
    }
  ],
  "edges": [
    {"id": "e1", "source": "weekly-sched", "target": "find-trends"},
    {"id": "e2", "source": "find-trends", "target": "topic-loop"},
    {"id": "e3", "source": "topic-loop", "target": "score-topic"},
    {"id": "e4", "source": "score-topic", "target": "select-best"},
    {"id": "e5", "source": "select-best", "target": "quality-gate"},
    {"id": "e6", "source": "quality-gate", "target": "editorial-review", "sourceHandle": "true"},
    {"id": "e7", "source": "quality-gate", "target": "no-trends", "sourceHandle": "false"},
    {"id": "e8", "source": "editorial-review", "target": "linear-tasks", "sourceHandle": "approved"},
    {"id": "e9", "source": "linear-tasks", "target": "notion-outlines"}
  ]
}'

echo ""
echo "Done! All workflows created."
