# Privacy / terms review — 8 November 2026

Legal-information review, not legal advice, a conformity assessment, or certification.
Qualified counsel should assess the operator, applicable territories and actual processing.

## Publication preparation

The user has requested publication of the updated Privacy Policy, Terms and aligned Refund notice.
Public pages now say “Last updated: 8 November 2026” and apply upon publication, preserving
any advance notice/acceptance requirements for existing customers. Removing the draft banner
does not certify unimplemented consent, labelling, transfer or other legal controls.
The older draft findings below remain the audit trail, not a statement that this build is deployed.

Cloudflare Web Analytics has been added to the privacy disclosures because its beacon was
observed in delivered HTML even though it is injected outside the repository.

Official EU Commission AI Act overview rechecked during this update:
https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai
The source discusses August 2026 transparency obligations and amended high-risk transition
periods under the AI Omnibus. This release does not claim to implement those technical duties,
appoint a representative, or certify the service as compliant across jurisdictions.
User scope: update documents first; do not implement SGR or other compliance systems in this change.
The user confirmed the specific new law is the **EU AI Act**. “SGR” remains undefined;
clarify its meaning before choosing or implementing any technical system.
The scope was then expanded to ASEAN, Africa, GCC, China, Australia and North/South America.
See [the regional review and official sources](legal-regional-review.md) for those additions and
country-specific publication checks. The public drafts now include regional notices and
non-EU consumer protections; this is not a claim of worldwide compliance.

## Publication status

The revised public-route content is explicitly a **review draft, not yet effective**.
Do not build/push/deploy this draft as the operative policy without resolving the publication gates below.
Retain the current published text and its effective date in the legal change record before rollout.
No production deployment, VPS change, consent banner, AI marker, or payment-flow change is part of this review.

### Operator details confirmed for publication

- Legal operator: **Keyo Technologies** (no unconfirmed company suffix added).
- Registered location: **Kampala, Uganda**.
- Business address: **SHAMBA COMPLEX P44, William Street, Kampala, Uganda**.
- Public support and privacy-request email: **support@brightboardapp.com**.
- Confirmed by the user for these drafts. No personal home address inferred from a profile.

## Material findings in the old documents

| Existing wording | Issue | Draft treatment |
| --- | --- | --- |
| Privacy §2 / Terms §4: “Payment processing is handled by Paddle”; automatic renewal | Active reviewed checkout is PesaPal, with fixed-period activation after verified payment. Existing Paddle code/history is not proof of live Paddle checkout. | Explain PesaPal, embedded third-party processing, verified activation, prepaid periods; require separate express agreement for recurring billing. |
| Privacy §4: “Content generation requests are processed by OpenAI's API” | Current teacher generators use Gemini; an OpenAI-compatible SDK is not itself evidence of OpenAI processing. | Identify Google generation and separate local procedural rendering from hosted API rendering and optional AfroAI chat. |
| Privacy §6: generated content stored for history | Omits 24-hour recent-history expiry and separate saved/shared/local copies. | Explain each storage class, expiration versus deletion and queued object cleanup. |
| Privacy §7: partial rights list | Omits restriction, consent withdrawal, response period, supervisory complaints and significant automated-decision rights. | Add qualified GDPR rights, one-month response, lawful extension and identity checks. |
| Privacy §9: “You can control cookies through your browser settings” | Browser controls do not replace valid prior consent for non-essential storage/access. | Disclose actual script loading and flag absent consent implementation; do not claim a working CMP. |
| Privacy §11: continued use as acceptance | A privacy notice is not blanket processing consent. | Separate notification from consent and require fresh consent when legally needed. |
| Terms §6: output only for educational purposes; all platform technology proprietary | Excludes business presenters and conflicts with separately licensed public Editor/TV distributions. | Distinguish user rights, third-party content, private hosted code and release-specific open-source licences. |
| Terms §8: blanket indirect-loss exclusion | No consumer/statutory/data-protection carve-outs. | Preserve non-waivable remedies and foreseeable consumer loss; no invented liability cap. |
| Refund page: “all sales are final and non-refundable”; Paddle portal/merchant-of-record claims | Incorrect provider and risks denying statutory withdrawal/conformity rights. | Aligned draft Refund page preserves statutory rights, distinguishes services/content exceptions and includes a model withdrawal form; checkout mechanisms remain unimplemented. |
| Terms identifies a sole proprietor; About identifies Keyo Technologies | Inconsistent operator identity. | User confirmed Keyo Technologies, Kampala, Uganda and publishable contact/address; legal pages now share the same operator details. |

## Newly covered developments

- AfroAI authentication, verification/recovery, sessions, email and optional assistant.
- Account/organisation logos and third-party rights; learner identifiers and sensitive data.
- Cloudflare private R2 snapshots + D1 ownership/access/revisions through a signed Worker; no migration of the existing account DB.
- Stable project links versus published revision links/QR codes, authenticated recipients, invitations,
  owner-approved editing, revocation limits and recipient exports.
- BrightboardTV pairing/remote-control relay separated from durable sharing; controller notes versus audience display.
- Hosted/local/offline distinction; local storage/export loss and browser/device limitations.
- Free-at-launch Editor, local SDK and hosted media-render API; hashed key records, usage and limits;
  no automatic API billing; MCP remains coming soon.
- Diagnostic logs/private R2 archive distinct from customer document backups. Initial archive is verified;
  **scheduled archiving, rotation and a fixed expiry have not been verified**.
- PesaPal verification delays, refunds/cancellation/withdrawal distinguished, referrals and separate payout terms.

## Verified legal sources and applicability notes

Sources consulted on 8 November 2026. Recheck the binding text and local implementation before publication.
This is not an exhaustive legal applicability assessment.

1. [GDPR, Regulation (EU) 2016/679](https://eur-lex.europa.eu/eli/reg/2016/679/oj):
   Articles 3, 5–9, 12–22, 27–28, 32–35 and 44 onward. Offering services to/monitoring EEA individuals
   can trigger GDPR for a non-EEA operator. Identify controller, purposes/bases, sources, recipients,
   transfers, retention and rights; assess school-controller/processor roles and Article 28 agreements.
   [Commission individual-rights guidance](https://commission.europa.eu/law/law-topic/data-protection/information-individuals_en);
   [EDPB rights guide](https://www.edpb.europa.eu/sme/be-compliant/respect-individuals-rights_en).
2. [EU AI Act framework and current timetable](https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai);
   [Article 50](https://ai-act-service-desk.ec.europa.eu/en/ai-act/article-50);
   [Commission Article 50 FAQ](https://digital-strategy.ec.europa.eu/en/faqs/transparency-obligations-under-article-50-ai-act).
   Transparency duties apply from 2 August 2026. The Commission's current guidance describes a
   limited Article 50(2) transition to 2 December 2026 for qualifying pre-existing systems, **not a
   blanket extension for new systems or all duties**. Provider versus deployer roles must be assessed.
   Chat disclosure, machine-readable marking, deepfake and public-interest-text duties are different.
   User obligations do not discharge BrightBoard's own provider duties. Pure procedural effects need
   an AI-definition assessment rather than automatic AI classification.
   Current Commission materials also describe amended high-risk dates under the
   [2026 AI Omnibus](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=OJ:L_202601744);
   do not reuse a stale “all obligations apply August 2026” timeline. Obtain counsel's confirmation
   against the final/consolidated text before relying on a transition or exception.
3. [Consumer Rights Directive and amendments — EUR-Lex summary](https://eur-lex.europa.eu/EN/legal-content/summary/consumer-information-right-of-withdrawal-and-other-consumer-rights.html).
   Directives 2011/83/EU, 2023/2673 and 2024/825 require assessment under the consumer's applicable
   national law. The withdrawal-function rules apply from 19 June 2026; relevant digital
   conformity/update information requirements from 27 September 2026. Digital-content exceptions
   and service exceptions differ. An email option or Terms paragraph does not implement a mandatory
   online withdrawal function or supply evidence of express consent/acknowledgement.
   Assess [Directive (EU) 2019/770](https://eur-lex.europa.eu/eli/dir/2019/770/oj) digital-service remedies too.
4. [Cyber Resilience Act summary](https://digital-strategy.ec.europa.eu/en/policies/cra-summary),
   Regulation (EU) 2024/2847: reporting duties from 11 September 2026; general application
   11 December 2027. Separately assess downloadable software, commercial activity and open-source
   steward/manufacturer roles. “Free/open source” is not a complete exemption analysis.
   Do not claim CE marking, a support period, SBOM delivery, reporting workflows or conformity
   assessment that has not been established.
5. Where Uganda is the confirmed establishment, assess the Data Protection and Privacy Act 2019
   and Regulations 2021, PDPO registration, overseas-processing requirements and local consumer/tax law.
   [Official Ministry Act text](https://ict.go.ug/site/documents/Data-Protection-and-Privacy-Act-2019.pdf).
   No registration or legal compliance is represented as verified.
6. Assess ePrivacy national implementation for cookies/device storage; private-document hosting
   may also require a Digital Services Act applicability assessment. Do not automatically describe
   authenticated/private sharing as exempt, or promise that BrightBoard is a public online platform.

Draft structure was checked against the
[Common Paper Cloud Service Agreement 2.1](https://commonpaper.com/standards/cloud-service-agreement/2.1/).
These consumer-facing, product-specific drafts are not an adoption of that unmodified B2B standard:
its broad ML training, content licence, restrictions and non-refundable clauses are not incorporated.

## Publication gates / implementation gaps — NOT implemented in this change

1. **Operator and notice:** operator name, registered location, business postal address and public
   privacy/legal contact are confirmed above. Verify operational monitoring of that mailbox,
   assess any required EU representative/DPO and set effective dates.
   No personal address should be inferred from a founder profile or internal records.
2. **Consent:** reCAPTCHA and Ahrefs are embedded in `client/index.html`. Fonts are now self-hosted,
   and the advertising integration has been removed at the owner's request.
   No consent-management/script-gating mechanism was found. Determine categories/necessity,
   prevent non-essential loading before required consent, implement reject/withdraw controls,
   and retain appropriate evidence. Text alone cannot legalise an unlawful deployment.
3. **Marketing:** some email “unsubscribe” links point to the home page rather than a working
   unsubscribe endpoint. Implement and verify direct opt-out and suppression; assess consent
   and existing marketing history. Do not label that flow complete.
4. **Data inventory/contracts/transfers:** verify actual providers/subprocessors, legal entities,
   locations, DPAs, AI-provider data-use settings, transfer mechanism/assessment and any supplementary
   measures. Do not claim SCCs, DPF certification, EU-only residency or “never used for training”
   without evidence. Historical providers/records need separate treatment.
5. **Rights/retention:** document request ownership, search/export/delete across account DB,
   D1/R2, auth provider, email, referrals, support and identifiable logs; legal holds,
   backup expiration/restoration and rejection/extension notices. No account-delete UI or complete
   end-to-end deletion/export workflow was established by this review.
6. **AI:** determine system roles/definitions and launch dates, transparency/marking requirements,
   provider-output provenance preservation, deepfake/public-interest notices and AI literacy.
   Review report-card uses for actual evaluation/admission/high-risk behaviour rather than
   treating “teacher tool” as an exemption. Do not claim a future SGR system already meets these duties.
7. **Consumer purchases:** confirm the aligned draft Refund page, checkout identity and conformity/update information,
   durable contract confirmation, recurring authorisation if ever introduced, immediate-supply
   consent/acknowledgements, withdrawal function, cancellation and statutory remedy handling.
   The draft model withdrawal form now includes the confirmed operator/address; provide all
   additional required pre-contract information rather than treating a short example email as a substitute.
8. **Download security:** scope CRA obligations for Editor/TV, vulnerability intake, incident reporting,
   support/update period and notices. Coordinate any required DSA notice/action/appeal process
   after legal classification. This review is not a security scan or conformity assessment.

## Release boundary

Only legal content, public legal-page rendering and this review are in scope.
Do not change authentication, payment code, tracking scripts, TV relay, document permissions,
Cloudflare resources, server log retention, deployment locks or SGR as a side effect.
Existing unfinished operational work is not silently treated as completed by these documents.
