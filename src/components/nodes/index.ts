import { TextInputNode }        from './TextInputNode'
import { ImageInputNode }       from './ImageInputNode'
import { LLMNode }              from './LLMNode'
import { BranchNode }           from './BranchNode'
import { LoopNode }             from './LoopNode'
import { TextOutputNode }       from './TextOutputNode'
import { HttpRequestNode }      from './HttpRequestNode'
import { EmailSendNode }        from './EmailSendNode'
import { HumanApprovalNode }    from './HumanApprovalNode'
import { WebhookTriggerNode }   from './WebhookTriggerNode'
import { ScheduledTriggerNode } from './ScheduledTriggerNode'
import { NotionNode }           from './NotionNode'
import { LinearNode }           from './LinearNode'
import { GithubNode }           from './GithubNode'
import { GitlabNode }           from './GitlabNode'
import { GmailNode }            from './GmailNode'
import { StripeNode }           from './StripeNode'
import { ShopifyNode }          from './ShopifyNode'
import { GoogleCalendarNode }   from './GoogleCalendarNode'
import { OutlookNode }          from './OutlookNode'
import { SlackNode }            from './SlackNode'
import { GoogleDriveNode }      from './GoogleDriveNode'
import { GoogleDocsNode }       from './GoogleDocsNode'
import { GoogleSheetsNode }     from './GoogleSheetsNode'

// Must be defined at module scope — never inside a component body
export const nodeTypes = {
  textInput:        TextInputNode,
  imageInput:       ImageInputNode,
  llm:              LLMNode,
  branch:           BranchNode,
  loop:             LoopNode,
  textOutput:       TextOutputNode,
  httpRequest:      HttpRequestNode,
  emailSend:        EmailSendNode,
  humanApproval:    HumanApprovalNode,
  webhookTrigger:   WebhookTriggerNode,
  scheduledTrigger: ScheduledTriggerNode,
  notion:           NotionNode,
  linear:           LinearNode,
  github:           GithubNode,
  gitlab:           GitlabNode,
  gmail:            GmailNode,
  stripe:           StripeNode,
  shopify:          ShopifyNode,
  googlecalendar:   GoogleCalendarNode,
  outlook:          OutlookNode,
  slack:            SlackNode,
  googledrive:      GoogleDriveNode,
  googledocs:       GoogleDocsNode,
  googlesheets:     GoogleSheetsNode,
}
