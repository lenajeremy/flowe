# Privacy Policy

**Last updated: 3 August 2026**

This policy explains what Fernary does with personal data. It is written to be
read, not to be survived.

**Controller:** **Jeremiah Lena, trading as Fernary**, a sole trader established in
Ireland at **Dublin, Ireland**.
**Contact for anything in this policy:** **legal@fernary.com**.

---

## 1. The two hats we wear

This distinction runs through everything below, so it comes first.

**For your own account, we are the controller.** Your email, your name, your
workflows, your billing details when there are any — we decide how those are
handled, and this policy is our account of it.

**For the data your workflows pull in, we are your processor.** When a workflow
reads your Shopify orders, your Gmail inbox, or your Stripe customers, it is
handling *other people's* personal data — your customers'. You are the controller
of that data. We process it only to run the workflow you built. You are
responsible for having a lawful basis to process it and for telling those people
what you do with it.

If you need a **Data Processing Agreement** to cover that relationship, email
**legal@fernary.com** and we'll put one in place. We haven't published a standard
one yet.

## 2. What we collect

### Account data — because you signed up

| Data | Why |
|---|---|
| Email address | Identifies your account; receives sign-in codes and service notices |
| Name and avatar URL | Shown in the app. Only if you sign in with Google, which supplies them |
| Google account ID | Links your Google sign-in to your account |
| Sign-in codes | Stored **hashed only**, expire quickly, dead once used or after too many wrong attempts |
| Session tokens | Held in Redis so you stay signed in |

We do **not** store a password, because there isn't one.

### Content you create — because that's the product

Workflows, prompts, AI-builder conversations, chat sessions, run history, and the
contents of your Data Stores.

**Run history is the sensitive part.** A run record keeps each step's output, and
those outputs are whatever your workflow fetched — an order, an email body, a
customer's name and address. If your workflows touch personal data, your run
history contains personal data.

### Credentials for connected accounts

Access and refresh tokens for the services you connect. These are **encrypted at
rest** before they reach the database. Any LLM API keys you enter yourself stay in
your **browser's local storage** and are never sent to our servers.

### Technical data — because the software has to run

Server logs and operational telemetry: request paths, timings, error messages,
workflow and run identifiers, IP address, and browser user-agent. Log output is
filtered to strip values whose names look like secrets — tokens, passwords, keys,
authorization headers, signatures.

### What we don't collect

- **No analytics, no tracking pixels, no advertising, no third-party cookies.**
  There is no PostHog, no Google Analytics, no Meta pixel, no session recorder.
- **No cookie banner**, because the only browser storage we set is what signs you
  in and remembers your preferences — strictly necessary, which needs no consent.
- We never buy personal data, and we never sell yours.

## 3. Why we're allowed to (lawful bases)

| Purpose | Lawful basis |
|---|---|
| Providing the Service, running your workflows | **Contract** — Art. 6(1)(b) |
| Sign-in, session security, abuse prevention | **Contract** and **legitimate interests** — Art. 6(1)(b), (f) |
| Keeping the Service working: logs, debugging, capacity | **Legitimate interests** — Art. 6(1)(f) |
| Service emails you need to receive | **Contract** — Art. 6(1)(b) |
| Billing and tax records, once there are fees | **Contract** and **legal obligation** — Art. 6(1)(b), (c) |
| Any marketing email | **Consent** — Art. 6(1)(a), withdrawable in one click |

## 4. Who your data reaches

Everything here is a processor or sub-processor acting on our instruction, or a
service **you** chose to connect. None of them get your data to use for their own
purposes.

### To run the Service

| Who | What reaches them | Where |
|---|---|---|
| **Railway** | Hosting, PostgreSQL, Redis — so, everything at rest | **EU (Ireland) — `eu-west-1`** |
| **Vercel** | Serves the web app; sees request metadata and IP | Global edge |
| **Resend** | Recipient address and message content for emails we send, including sign-in codes | US/EU |

### AI providers — only what a workflow sends them

| Who | When |
|---|---|
| **Anthropic** (Claude) | An AI step or a branch condition using a Claude model |
| **OpenAI** | An AI step using a GPT model |
| **Google** (Gemini) | An AI step using a Gemini model |
| **xAI** (Grok) | An AI step using a Grok model |
| **Brave Search** | A web-search step — your search query |
| **Jina Reader** | A page-read step — the URL to fetch |

**These providers do not train on your content.** Anthropic and OpenAI do not train
on data submitted through their APIs by default, and we do not opt in. Prompts may
be retained briefly for abuse monitoring under their own terms.

**Only what a step actually needs is sent.** A prompt containing customer data
means that customer data goes to the model provider. That is inherent to what an
AI step is, and it is worth thinking about when you write one.

### Services you connect

Notion, Linear, GitHub, GitLab, Gmail, Stripe, Shopify, Google Calendar, Google
Drive, Google Docs, Google Sheets, Outlook, Slack. We exchange data with these
**only** as your workflows instruct. Each has its own privacy policy, which governs
what they do at their end.

### In your browser

Loading the app fetches integration logos from **logo.dev** and Google's product
logo CDN (**gstatic.com**). Those requests reveal your IP address and user-agent to
those hosts. No account data goes with them.

### Otherwise

We disclose personal data only where legally compelled, to establish or defend
legal claims, or to a successor if the business transfers — including on
incorporation. We'd tell you about a transfer first.

## 5. International transfers

**Your data at rest stays in the EU.** The database, the cache, and the stored
contents of your workflows and runs are hosted in Ireland (`eu-west-1`) and are not
replicated outside the EEA.

Data does leave the EEA in two situations, both in transit:

- **When a workflow calls an AI provider.** Anthropic, OpenAI, Google, xAI, Brave,
  and Jina process the request wherever they operate, typically the US. We store
  nothing there.
- **Serving the app and sending email.** Vercel serves from a global edge network,
  and Resend may process outbound mail in the US or the EU.

For those, we rely on the **European Commission's adequacy decision** for providers
certified under the **EU–US Data Privacy Framework**, or on **Standard Contractual
Clauses** where they are not. Email **legal@fernary.com** and we'll tell you which
applies to a given processor.

If keeping a particular workload inside the EEA matters to you, say so — some model
providers offer EU-only processing, and we can talk about which steps to route
where.

## 6. How long we keep it

| Data | Retention |
|---|---|
| Account data | While your account exists |
| Workflows, Data Stores, chats | While your account exists, or until you delete them |
| Run history and logs | While your account exists, or until you delete the run or workflow |
| Sign-in codes | Minutes. Deleted once used, expired, or exhausted |
| Sessions | Until expiry or sign-out |
| Operational telemetry | Short rolling window, then aged out |
| Billing records, once there are any | As long as tax law requires — typically 6 years |

**When you delete your account**, we delete your account data, workflows, run
history, Data Stores, chat history, and connected-account tokens **within 30
days**, apart from anything we must keep by law. Backups age out on their own
cycle, so a copy can persist a little longer before it is overwritten.

Deleting a workflow deletes its runs. Disconnecting an integration deletes its
stored token.

## 7. Your rights

Under the GDPR you can ask us to:

- **Access** — get a copy of your personal data
- **Rectify** — correct it
- **Erase** — delete it
- **Restrict** or **object** to processing, including anything based on legitimate
  interests
- **Port** — receive it in a machine-readable form
- **Withdraw consent** — where consent was the basis, without affecting what came
  before

Email **legal@fernary.com**. We'll respond within **one month**. There's no charge
unless a request is excessive, and we'll say so first if it is.

You can also complain to the **Irish Data Protection Commission** (`dataprotection.ie`)
or to your local supervisory authority. We'd rather you told us first, but it's
your right either way.

**If you're one of our customers' customers** — your data reached us because a
Fernary user's workflow processed it — we are the processor, not the controller.
Send your request to that business. If you reach us instead, we'll forward it and
tell you we have.

## 8. Automated decision-making

Fernary is a tool for building automations, so your workflows may make automated
decisions. **We** don't make automated decisions about *you*.

If a workflow you build makes decisions about people with legal or similarly
significant effects, Art. 22 GDPR obligations are yours as controller. The approval
step exists partly for this: it puts a human in the loop where you need one.

## 9. Security

- OAuth tokens **encrypted at rest**; sign-in codes stored only as hashes
- HTTPS everywhere in transit
- Passwordless sign-in, so there is no password to breach or reuse
- Every query scoped to the authenticated user; tenant isolation tested
- Secret-looking values stripped from logs by name
- Outbound requests blocked from reaching private network addresses

No system is perfectly secure, and this one is in beta. If a breach affects your
personal data we'll notify the DPC within **72 hours** where required, and you
without undue delay where the risk to you is high.

Found a vulnerability? **security@fernary.com**. We won't pursue good-faith research.

## 10. Children

Not for under-16s. We don't knowingly collect their data; tell us at
**legal@fernary.com** if you believe we have and we'll delete it.

## 11. Changes

We'll update this page and the date above. For changes that materially affect your
rights we'll email you at least **14 days** before they take effect.

---

*Data protection questions: **legal@fernary.com**. Security: **security@fernary.com**.*
