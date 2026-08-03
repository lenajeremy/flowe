# Terms of Service

**Last updated: 3 August 2026**

These terms are a contract between you and **Jeremiah Lena, trading as Fernary**
("Fernary", "we", "us"), a sole trader established in Ireland at
**Dublin, Ireland**. They govern your use of the Fernary web application at
`fernary.com` and everything it connects to (the "Service").

By creating an account you accept these terms. If you are accepting on behalf of a
company, you confirm you are authorised to bind it, and "you" means that company.

---

## 1. What Fernary does, in plain terms

Fernary builds and runs automated workflows. You describe what you want; an AI
assembles a workflow; the workflow then runs **unattended** — on a schedule or on
a webhook — calling large language models and third-party services on your
behalf.

That last sentence is the important one. When you connect an account (Shopify,
Stripe, Gmail, Slack, GitHub and the rest), you are authorising Fernary to take
actions in that account without a human present for each one. Those actions can
include sending email, posting messages, creating and cancelling orders, adjusting
inventory, and issuing refunds.

**You are responsible for what your workflows do.** We give you the tools to
constrain them — approval steps that pause and wait for you, bounded timeouts, and
a publish flag that must be switched on before any schedule fires — and we
strongly recommend using them for anything that moves money or contacts a
customer. But a workflow you build and publish acts with your authority, and its
consequences are yours.

## 2. Beta status

The Service is in **beta**. Concretely:

- It is provided **free of charge** for now. Section 8 sets out what happens when
  that changes.
- There is **no uptime commitment**. We may take it down, break it, or change it
  without notice.
- Features can be added, altered, or removed. Data structures can change.
- **Do not rely on Fernary as your only copy of anything.** Keep your own records
  of data that matters to you.

We are not being coy about this: the Service executes real operations against real
accounts, and it is early software. Judge how much authority to give it
accordingly.

## 3. Your account

- You need a working email address. Sign-in is passwordless — a one-time code or
  magic link — or via Google.
- You must be at least **16 years old**. The Service is built for businesses, not
  for consumers or children.
- Keep access to your email secure. Anyone who can read your inbox can sign in as
  you, and therefore reach every account you have connected.
- One human per account. Don't share credentials.
- Tell us promptly at **security@fernary.com** if you think your account has been
  accessed by someone else.

## 4. Connected accounts and credentials

When you connect a third-party service, we store an access token — encrypted at
rest — so your workflows can act while you're away.

- You must have the right to connect each account and to grant the permissions you
  grant.
- You are bound by each provider's own terms. Fernary calling Shopify on your
  behalf does not put us between you and Shopify.
- You can disconnect any account at any time. Workflows depending on it will then
  fail rather than silently skip steps.
- We only use those credentials to do what your workflows instruct.

## 5. Acceptable use

Don't use Fernary to:

- break the law, or infringe anyone's rights;
- send unsolicited bulk email or messages, or anything a reasonable person would
  call spam;
- access accounts or data you are not authorised to access;
- attack, overload, probe, or reverse-engineer the Service, or work around its
  rate limits, quotas, or the safeguards in section 1;
- process special-category personal data (health, biometrics, political opinions
  and similar) or children's data through your workflows;
- build workflows whose purpose is deception — fake reviews, impersonation,
  fabricated records;
- resell the Service or run it as a service for third parties, unless we've agreed
  that in writing.

We can suspend an account that is causing harm — to other users, to a third-party
provider, or to us — without notice, and we will tell you why afterwards.

## 6. Your content

Your workflows, prompts, stored data, run history, and everything your workflows
pull in from connected accounts are **yours**. We claim no ownership.

You grant us only the narrow licence needed to operate the Service: to store,
process, and transmit that content so workflows run, and to send the parts of it a
workflow requires to the third parties it calls, including model providers.

**We do not train AI models on your content, and we do not permit our model
providers to.** See the Privacy Policy for how that works.

You are responsible for having the right to process the personal data your
workflows touch — including your own customers' data. Where we process it on your
behalf, we act as your processor and you are the controller.

## 7. Our intellectual property

The Service, the software, the Fernary name, the frond mark, and the brand are
ours. These terms grant you a right to use the Service, not to copy it. Don't
remove our attribution, and don't use the name or mark to suggest we endorse you.

Feedback you send us, we can use freely and without obligation.

## 8. Fees — when they start

The Service is free during beta. When we introduce paid plans:

- We will give you **at least 30 days' notice** by email before you are charged
  anything.
- Continuing to use the Service after a plan begins means accepting the fees for
  it. You can stop instead, and export or delete your data first.
- Fees will be stated exclusive of VAT and other taxes, which you pay in addition
  where they apply.
- Subscriptions will renew automatically for the same period until cancelled.
  Cancelling stops the next renewal; it does not refund the current one.
- Because the Service's dominant cost is AI model usage, some plans may be
  metered. Any metered element and its limits will be shown before you incur it.
- Payments will be handled by a third-party payment processor. We won't hold your
  card details.
- **No refunds** for partial periods, except where the law gives you a right to
  one — which, for consumers in the EU, it may.

Until then: no fees, no card, nothing to cancel.

## 9. Third-party services

Fernary calls AI providers, search and page-reading tools, an email sender, and
the integrations you connect. Those services are outside our control. We are not
responsible for their availability, their output, their pricing, or their acts, and
their failures can cause your workflows to fail.

The Privacy Policy lists who they are and what reaches them.

## 10. AI output — read this before you trust it

Large language models are wrong sometimes, confidently. They misread data, invent
facts, and mishandle edge cases. Fernary passes their output into real actions.

- **Check AI output before it does anything consequential.** Use an approval step.
- Nothing Fernary produces is legal, financial, medical, or professional advice.
- The same prompt can give different answers on different runs. That is how the
  models work, not a defect.
- You remain responsible for messages sent, records changed, and money moved by
  your workflows, whether or not a model chose to do it.

## 11. Warranties — what we don't promise

The Service is provided **"as is" and "as available"**, without warranties of any
kind, whether express or implied, including fitness for a particular purpose,
merchantability, non-infringement, or that it will be uninterrupted, timely,
secure, or error-free.

If you are a consumer, you have rights under Irish and EU consumer law that these
terms cannot exclude, and nothing here tries to.

## 12. Liability

To the fullest extent the law allows:

- We are not liable for indirect, incidental, special, consequential, or punitive
  damages; nor for lost profits, revenue, goodwill, or data; nor for the cost of
  substitute services — even if we were warned they were possible.
- Our total liability for all claims in any 12-month period is capped at the
  greater of **(a) the fees you paid us in that period** and **(b) €100**. During
  the free beta, that means €100.

Nothing in these terms limits liability for death or personal injury caused by
negligence, for fraud or fraudulent misrepresentation, or for anything else that
cannot lawfully be limited.

The cap is low because the Service is free and early. If you need a contractual
risk position that matches a production dependency, talk to us at
**contact@fernary.com** rather than relying on these terms.

## 13. Indemnity

You will indemnify us against claims, damages, and reasonable costs arising from
your use of the Service in breach of these terms, from your content, or from what
your workflows did in your connected accounts.

## 14. Ending it

- **You**, any time: delete your account in the app. See the Privacy Policy for
  what deletion removes and when.
- **Us**: we may suspend or end your access if you breach these terms, if we're
  required to, or if we discontinue the Service. Except in cases of breach or
  legal compulsion, we'll give you reasonable notice and a chance to export your
  data.

On termination your licence ends and your workflows stop running, including any
schedules. Sections 6, 7, 11, 12, and 13 survive.

## 15. Changes to these terms

We may update these terms. For material changes we'll email you and update the
date at the top at least **14 days** before they take effect. Continuing to use
the Service after that means accepting them. If you don't accept, stop using the
Service and delete your account.

## 16. Governing law

These terms are governed by the **laws of Ireland**, and the courts of Ireland
have exclusive jurisdiction. If you are a consumer resident elsewhere in the EU,
this doesn't deprive you of the protection of your local law or of your right to
sue where you live.

## 17. Odds and ends

- If a provision is unenforceable, the rest stands.
- Not enforcing something once doesn't waive it.
- You may not assign these terms without our consent; we may assign them to a
  successor to our business, including on incorporation of a company to which the
  Service is transferred.
- These terms plus the Privacy Policy are the entire agreement between us on this
  subject.
- Notices to you go to your account email. Notices to us go to
  **contact@fernary.com**.

---

*Questions: **contact@fernary.com**.*
