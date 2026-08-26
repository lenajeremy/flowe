import type { NodeType, FlowNodeData } from '@/types/workflow'

export function getDefaultNodeData(type: NodeType): FlowNodeData {
  switch (type) {
    case 'textInput':
      return { nodeType: 'textInput', label: 'Text Input', defaultValue: '' }
    case 'imageInput':
      return { nodeType: 'imageInput', label: 'Image Input', imageUrl: '' }
    case 'llm':
      return {
        nodeType: 'llm',
        label: 'LLM',
        model: 'gpt-4o',
        systemPrompt: 'You are a helpful assistant.',
        userPrompt: '{{previousNode.output}}',
        temperature: 0.7,
        maxTokens: 1024,
        enableWebSearch: true,
      }
    case 'codingAgent':
      return {
        nodeType: 'codingAgent',
        label: 'Coding Agent',
        codingAgentRuntime: 'codex',
        codingAgentTask: 'Inspect the repository and complete this task:\n\n{{previousNode.output}}',
        codingAgentRepository: '',
        codingAgentBranch: '',
        codingAgentWorkspaceMode: 'persistent',
        codingAgentConversationKey: '',
        codingAgentMaxDuration: 1800,
        codingAgentAutoStopMinutes: 15,
        codingAgentAutoDeleteMinutes: 10080,
        codingAgentAllowedDomains: [],
        codingAgentAllowWrite: true,
      }
    case 'branch':
      return { nodeType: 'branch', label: 'Branch', condition: '' }
    case 'loop':
      return { nodeType: 'loop', label: 'Loop', loopOverField: 'output.items', mode: 'sequential' }
    case 'textOutput':
      return { nodeType: 'textOutput', label: 'Text Output' }
    case 'httpRequest':
      return {
        nodeType: 'httpRequest',
        label: 'HTTP Request',
        url: 'https://',
        method: 'GET',
        requestHeaders: '{}',
        requestBody: '',
      }
    case 'emailSend':
      return {
        nodeType: 'emailSend',
        label: 'Send Email',
        emailTo: '',
        emailSubject: '',
        emailBody: '',
      }
    case 'humanApproval':
      return {
        nodeType: 'humanApproval',
        label: 'Human Approval',
        approvalMessage: 'Please review and approve or reject this step.',
        // Approvals must be bounded — an open gate strands the run, and a
        // scheduled one strands a new run every cycle. 24h suits "I'll look at
        // it tomorrow"; the server caps any value at 3 days.
        approvalTimeout: 86400,
      }
    case 'webhookTrigger':
      return { nodeType: 'webhookTrigger', label: 'Webhook Trigger' }
    case 'integrationTrigger':
      return { nodeType: 'integrationTrigger', label: 'App Trigger' }
    case 'scheduledTrigger':
      return { nodeType: 'scheduledTrigger', label: 'Scheduled Trigger' }
    case 'notion':
      return {
        nodeType: 'notion',
        label: 'Notion',
        integrationOp: 'create_page',
        integrationToken: '',
        notionDatabaseId: '',
        notionTitle: '',
        notionContent: '',
      }
    case 'linear':
      return {
        nodeType: 'linear',
        label: 'Linear',
        integrationOp: 'create_issue',
        integrationToken: '',
        linearTeamId: '',
        linearTitle: '',
        linearDescription: '',
        linearPriority: 3,
      }
    case 'github':
      return { nodeType: 'github', label: 'GitHub', integrationOp: 'create_issue', githubRepo: '', githubState: 'open', githubLimit: 10, githubTreeLimit: 1000 }
    case 'gitlab':
      return { nodeType: 'gitlab', label: 'GitLab', integrationOp: 'create_issue', gitlabProjectId: '', gitlabState: 'opened', gitlabLimit: 10 }
    case 'gmail':
      return { nodeType: 'gmail', label: 'Gmail', integrationOp: 'send_email', gmailTo: '', gmailSubject: '', gmailBody: '', gmailLimit: 10 }
    case 'stripe':
      return { nodeType: 'stripe', label: 'Stripe', integrationOp: 'list_customers', stripeLimit: 10, stripeQuantity: 1 }
    case 'googlemeet':
      return { nodeType: 'googlemeet', label: 'Google Meet', integrationOp: 'create_space', meetAccessType: 'TRUSTED', meetLimit: 25 }
    case 'googleslides':
      return { nodeType: 'googleslides', label: 'Google Slides', integrationOp: 'create_presentation', slidesLayout: 'TITLE_AND_BODY' }
    case 'googleforms':
      return { nodeType: 'googleforms', label: 'Google Forms', integrationOp: 'create_form', formsQuestionType: 'TEXT', formsLimit: 25 }
    case 'googletasks':
      return { nodeType: 'googletasks', label: 'Google Tasks', integrationOp: 'list_tasks', tasksLimit: 25 }
    case 'googlechat':
      return { nodeType: 'googlechat', label: 'Google Chat', integrationOp: 'send_message', chatSpaceType: 'SPACE', chatLimit: 25 }
    case 'googlekeep':
      return { nodeType: 'googlekeep', label: 'Google Keep', integrationOp: 'create_note', keepLimit: 25 }
    case 'hubspot':
      return { nodeType: 'hubspot', label: 'HubSpot', integrationOp: 'search_objects', hubspotObjectType: 'contacts', hubspotLimit: 25 }
    case 'front':
      return { nodeType: 'front', label: 'Front', integrationOp: 'list_conversations', frontLimit: 25 }
    case 'googlesearchconsole':
      return { nodeType: 'googlesearchconsole', label: 'Search Console', integrationOp: 'query_search_analytics', gscDimensions: 'query', gscRowLimit: 100 }
    case 'googlecontacts':
      return { nodeType: 'googlecontacts', label: 'Google Contacts', integrationOp: 'list_contacts', contactsLimit: 50 }
    case 'gumroad':
      return { nodeType: 'gumroad', label: 'Gumroad', integrationOp: 'list_sales' }
    case 'supabase':
      return { nodeType: 'supabase', label: 'Supabase', integrationOp: 'list_projects' }
    case 'netlify':
      return { nodeType: 'netlify', label: 'Netlify', integrationOp: 'list_sites' }
    case 'vercel':
      return { nodeType: 'vercel', label: 'Vercel', integrationOp: 'list_deployments', vercelLimit: 20 }
    case 'dropbox':
      return { nodeType: 'dropbox', label: 'Dropbox', integrationOp: 'list_folder', dropboxLimit: 100 }
    case 'typeform':
      return { nodeType: 'typeform', label: 'Typeform', integrationOp: 'list_responses', typeformLimit: 25 }
    case 'calendly':
      return { nodeType: 'calendly', label: 'Calendly', integrationOp: 'list_scheduled_events', calendlyScope: 'user', calendlyLimit: 25 }
    case 'clickup':
      return { nodeType: 'clickup', label: 'ClickUp', integrationOp: 'list_tasks', clickupLimit: 25 }
    case 'monday':
      return { nodeType: 'monday', label: 'monday.com', integrationOp: 'list_items', mondayLimit: 25 }
    case 'asana':
      return { nodeType: 'asana', label: 'Asana', integrationOp: 'list_tasks', asanaLimit: 50 }
    case 'airtable':
      return { nodeType: 'airtable', label: 'Airtable', integrationOp: 'list_records', airtableLimit: 25 }
    case 'kit':
      return { nodeType: 'kit', label: 'Kit', integrationOp: 'create_subscriber', kitLimit: 25 }
    case 'sendgrid':
      return { nodeType: 'sendgrid', label: 'SendGrid', integrationOp: 'send_email', sendgridLimit: 25 }
    case 'resend':
      return { nodeType: 'resend', label: 'Resend', integrationOp: 'send_email', resendLimit: 25 }
    case 'granola':
      return { nodeType: 'granola', label: 'Granola', integrationOp: 'list_notes', granolaLimit: 25 }
    case 'jira':
      return { nodeType: 'jira', label: 'Jira', integrationOp: 'search_issues', jiraIssueType: 'Task', jiraLimit: 25 }
    case 'confluence':
      return { nodeType: 'confluence', label: 'Confluence', integrationOp: 'list_pages', confluenceStatus: 'current', confluenceLimit: 25 }
    case 'bitbucket':
      return { nodeType: 'bitbucket', label: 'Bitbucket', integrationOp: 'list_pull_requests', bitbucketState: 'OPEN', bitbucketLimit: 25 }
    case 'shopify':
      return { nodeType: 'shopify', label: 'Shopify', integrationOp: 'list_orders', shopifyStatus: 'any', shopifyLimit: 10 }
    case 'googlecalendar':
      return { nodeType: 'googlecalendar', label: 'Google Calendar', integrationOp: 'list_events', gcalCalendarId: '', gcalLimit: 10 }
    case 'outlook':
      return { nodeType: 'outlook', label: 'Outlook', integrationOp: 'send_email', outlookTo: '', outlookSubject: '', outlookBody: '', outlookLimit: 10 }
    case 'slack':
      return { nodeType: 'slack', label: 'Slack', integrationOp: 'send_message', slackChannel: '', slackText: '', slackSendAs: 'bot', slackLimit: 100 }
    case 'googledrive':
      return { nodeType: 'googledrive', label: 'Google Drive', integrationOp: 'list_files', gdriveQuery: '', gdriveLimit: 20 }
    case 'googledocs':
      return { nodeType: 'googledocs', label: 'Google Docs', integrationOp: 'create_document', gdocsTitle: '', gdocsText: '' }
    case 'googlesheets':
      return { nodeType: 'googlesheets', label: 'Google Sheets', integrationOp: 'read_range', gsheetsSpreadsheetId: '', gsheetsRange: '' }
    case 'data':
      return { nodeType: 'data', label: 'Data Store', dataStoreId: '', dataOp: 'get', dataKey: '', dataValue: '', dataAmount: '1' }
  }
}
