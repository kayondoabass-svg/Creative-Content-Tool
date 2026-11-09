import { legalOperator, LegalContact, LegalDocument, LegalSectionList as List, type LegalSection } from "@/components/legal-document";
import { MandatoryLocalRights } from "./regional-notices";

const sections: LegalSection[] = [
  {
    id: "operator", title: "Operator, agreement, and mandatory rights",
    content: <>
      <p>These Terms concern BrightBoard’s hosted services, operated by
        {" "}<strong>{legalOperator.name}</strong>, registered in {legalOperator.registrationLocation}.
        Business address: {legalOperator.address}. Contact <LegalContact /> for service or legal questions.
        The updated Terms apply upon publication for new users; material changes for existing
        customers take effect only after any legally required notice and acceptance.</p>
      <p>These Terms govern the services you choose to use.
        If you act for an organisation, you must have authority to bind it. The Privacy Policy is a
        transparency notice, not blanket consent to processing. Any separately agreed order or data
        processing agreement applies within its scope. Nothing removes non-waivable privacy, consumer,
        statutory digital-content/service conformity, or other mandatory rights.</p>
    </>,
  },
  {
    id: "services", title: "What the services do",
    content: <List>
      <li><strong>Teacher tools and Teacher Studio:</strong> assisted creation and editing of educational
        text, images, worksheets, presentations, report-card materials and other resources.
        Hosted AI features send relevant inputs to their generation providers.</li>
      <li><strong>BrightboardTV:</strong> presentation creation, import/export, local or available hosted
        libraries, display pairing and approved remote control. Durable project sharing is separate
        from a temporary paired presentation session.</li>
      <li><strong>BrightBoard Editor:</strong> browser-local procedural image, animation/video and
        synthesised-audio creation, project files and exports. It is not a promise of prompt-to-anything
        generative AI. Device capacity, browser codecs, permissions and export formats affect availability.</li>
      <li><strong>Sharing:</strong> published project snapshots, revision links/QR codes, read access,
        invitations and owner-approved editing, subject to available controls and limits.</li>
      <li><strong>Developers:</strong> the currently available hosted media-rendering API and local SDK.
        MCP is coming soon and is not represented as an available service.</li>
    </List>,
  },
  {
    id: "accounts", title: "Accounts, age, and security",
    content: <>
      <p>Use accurate account information and protect passwords, sessions, developer keys and recovery
        messages. Hosted Editor and other gated features require sign-in; sharing also requires email
        verification. A downloaded, independently operated offline edition does not require a BrightBoard
        account merely because the hosted service does.</p>
      <p>Use is intended for educators and other authorised users with contractual capacity. Children
        under 13 must not register; older minors must also satisfy applicable age and authorisation
        requirements. A school’s involvement does not automatically authorise unrestricted student-data
        processing. Report suspected unauthorised access promptly. You are responsible for use you
        authorise, but not automatically liable for every event regardless of our own security obligations.</p>
    </>,
  },
  {
    id: "content", title: "Your content, permissions, and intellectual property",
    content: <>
      <p>You retain your existing rights in material you upload or create. You must have permission to
        use logos, photographs, voices, source documents, music and other material. You grant BrightBoard
        only the rights needed to process, host, render, transmit and display that material to provide
        the functions you request, including to recipients you authorise. This is not a general licence
        to publish private documents, sell them, or use them to train a model.</p>
      <p>To the extent we have rights in generated output that can be transferred or licensed, you may
        use that output lawfully, including in education or business, subject to applicable provider
        terms and third-party rights. AI output may be non-unique or not copyrightable; no exclusivity,
        originality, trademark clearance or non-infringement guarantee is given.</p>
      <p>Our private hosted application, branding and proprietary materials remain protected. Separately
        released open-source code is governed by the licence included with that release; these hosted
        Terms do not remove rights that licence grants. Open-source releases do not include a licence
        to the private website backend, private database, credentials, or unrestricted use of BrightBoard
        trademarks. Third-party code and assets retain their own licences.</p>
    </>,
  },
  {
    id: "sharing", title: "Sharing, editing, and presenter responsibilities",
    content: <>
      <p>Before publishing a snapshot, check all pages, notes, attachments and personal information.
        A complete shared project may contain more than its visible preview. Choose the narrowest
        appropriate access setting. Depending on your setting, anyone with the link may read it without
        signing in, or access may be limited to invited, verified accounts. Editing requires a verified
        signed-in account and appropriate permission; a request is not approval.</p>
      <p>Stable project links and revision links/QR codes have different purposes. A published revision
        identifies a snapshot rather than every future edit, but it does not override current permissions
        or deletion. Public link viewing does not require an account. Private access and editing require
        the necessary authentication, verification and permissions, with the destination preserved
        through sign-in.</p>
      <p>Recipients must respect granted permissions and applicable rights. Revocation cannot retrieve
        exports, screenshots or independently saved copies. Do not treat a link or QR code as confidential
        merely because it looks random. BrightboardTV room codes/links are for the intended audience;
        approve controllers carefully, protect presenter notes, and end the session when finished.</p>
    </>,
  },
  {
    id: "ai-use", title: "AI transparency, human review, and restricted uses",
    content: <>
      <p>Hosted AI results may contain inaccurate, biased, misleading or inappropriate material. Review
        and, where needed, independently verify results before using them. They are not professional
        medical, legal, financial, safeguarding or other regulated advice. Do not rely on generated
        scores or report-card statements as the sole basis for decisions significantly affecting a learner.</p>
      <p>Where the EU AI Act or other law applies, providers and professional deployers have their own
        duties. Disclose AI interaction and synthetic/manipulated content when required, including
        applicable deepfake and public-interest-text disclosures. Preserve applicable machine-readable
        provenance/markings and do not remove disclosures to mislead. Relevant artistic, editorial-review
        and standard-editing exceptions require a case-specific assessment, not an automatic exemption.</p>
      <p>Not every mathematical/procedural Editor feature is necessarily an “AI system” in law.
        Equally, calling software free, open source, educational or browser-based does not automatically
        exempt it from applicable duties. BrightBoard does not claim that automatic provenance, EU
        conformity assessment, or an SGR system has been implemented by publishing these Terms.</p>
      <p>The services are not offered as certified high-risk educational decision systems. Do not deploy
        them for admissions, significant learner evaluation, exam surveillance, biometric categorisation,
        emotion recognition in education/workplaces, social scoring, or other prohibited/high-risk
        activities without an independently lawful, supported arrangement. Illegal impersonation,
        non-consensual intimate content, child sexual abuse material, exploitation and deception are prohibited.</p>
    </>,
  },
  {
    id: "acceptable-use", title: "Acceptable use and reporting problems",
    content: <>
      <List>
        <li>Do not upload unlawful material, infringe rights, harass people, expose another person’s
          private information, distribute malware, or use the service for fraud or harmful impersonation.</li>
        <li>Do not access another account, founder/admin records or private documents without permission,
          bypass authentication or quotas, steal keys, or disrupt services. Report security issues
          responsibly rather than testing on other users’ data.</li>
        <li>Do not submit unnecessary learner identifiers or sensitive/biometric/health data without
          the required lawful basis, notices and processing arrangements.</li>
        <li>Do not resell access to your account or imply that your app is officially endorsed by
          BrightBoard. Rights to redistribute open-source releases remain governed by their licences.</li>
      </List>
      <p>Send content, copyright, privacy or security reports to <LegalContact />. Identify the affected
        feature/document without sending passwords, secret keys or unnecessary sensitive material.
        We may restrict content/access to address a credible violation or legal obligation and will
        provide reasons and a route to contest a decision where required and safe to do so.</p>
    </>,
  },
  {
    id: "payments", title: "Free tools, paid access, and payment processing",
    content: <>
      <p>BrightBoard includes free tools and paid offerings. BrightBoard Editor, its public downloads,
        local SDK and hosted media API are free at the current launch stage, subject to technical quotas
        and abuse protections. Free now does not promise unlimited server capacity or a future free
        service forever. Introducing charges requires clear notice and your agreement to a paid purchase;
        creating a developer key alone does not authorise billing.</p>
      <p>For paid offerings, the checkout must show the selected service, total price, currency, applicable
        taxes/fees, access period, payment timing and any renewal terms before you commit. Current reviewed
        PesaPal purchases activate a fixed access period after server-side payment verification.
        Do not assume automatic renewal solely because a plan is named weekly or monthly.
        Recurring charges require an expressly disclosed and authorised recurring arrangement.</p>
      <p>PesaPal and its payment partners process payments, including when their interface appears inside
        BrightBoard. Their applicable payment terms also apply; this does not remove BrightBoard’s own
        obligations as the service seller. Bank/provider checks or notification delays may mean access
        is not immediate. Do not repeatedly pay for the same pending order; contact support with its
        reference, not your payment PIN or full card details.</p>
      <p>Referral participation, commissions and payouts follow separately presented programme terms
        and verified records; these Terms do not promise an unconfirmed commission or payout schedule.</p>
    </>,
  },
  {
    id: "withdrawal", title: "Cancellation, withdrawal, refunds, and faulty services",
    content: <>
      <p>Cancellation of future renewal, statutory withdrawal from a purchase, and a remedy for a faulty
        digital service are different rights. For a non-recurring prepaid purchase, not buying another
        period prevents a new purchase; it does not by itself create a recurring charge to cancel.
        Use available account controls or contact <LegalContact /> for help.</p>
      <p>Where EU/EEA distance-contract consumer rules apply, a consumer generally has 14 days from
        conclusion of a service/digital-content contract to withdraw, subject to applicable exceptions.
        Immediate supply does not automatically remove this right. Any exception for non-tangible digital
        content requires the legally prescribed express prior consent, acknowledgement of losing the
        right and required contract confirmation. Service-contract rules differ: requested early
        performance may justify only a lawful proportionate charge, and full-performance exceptions
        require the applicable conditions. A Terms checkbox alone does not establish all those facts.</p>
      <p>To notify withdrawal, email <LegalContact /> with a clear statement, your name, account email,
        purchase/order reference and purchase date; no special reason is required. Example:
        “I withdraw from my BrightBoard purchase [reference] made on [date]. My name and account email
        are [details].” We must honour applicable deadlines, including reimbursement normally within
        14 days of notification where required, using the original payment method unless lawfully agreed otherwise.
        This email route does not replace a legally required online withdrawal function.</p>
      <p>Mandatory remedies for lack of conformity, non-supply, unauthorised/duplicate charges and other
        applicable rights remain available, including correction, price reduction or termination/refund
        where required. No “all sales final,” AI-generation cost argument or discretionary refund policy
        overrides those rights. The separate Refund information page explains these distinctions and
        includes a model withdrawal form. Conflicting wording must not be used to deny a statutory right.</p>
    </>,
  },
  {
    id: "retention", title: "Saving work, limits, deletion, and backups",
    content: <>
      <p>Recent generated history normally lasts 24 hours from creation and may have capacity limits.
        Export important work before expiry. Intentionally saved libraries and published sharing snapshots
        have separate retention and storage limits. Deleting a link, expiring access, deleting a project
        and closing an account are different operations.</p>
      <p>Local drafts and offline exports can be lost through browser cleanup, device failure or user
        deletion; keep your own project backups. We cannot erase another person’s downloaded copy or
        files held only on your device. Shared-project deletion can first revoke access and then queue
        physical storage deletion. Legally required transaction records, restricted backups and justified
        incident records may require different treatment under the Privacy Policy.</p>
      <p>Quotas, import limits, available formats and browser/device compatibility are shown in the
        relevant tool or documentation. We do not guarantee perfect conversion of every imported PDF
        or presentation, support for every codec, unlimited hosted storage, or automatic backup of every
        local file. Our diagnostic log archive is not a customer document backup service.</p>
    </>,
  },
  {
    id: "developers", title: "Developer API and third-party applications",
    content: <>
      <p>Hosted API requests are processed on BrightBoard servers and are distinct from local SDK
        rendering. Protect keys server-side, label and revoke them appropriately, respect published
        rate/render limits, and do not put them in public browser code or GitHub. Keys can be revoked
        without deleting local open-source software.</p>
      <p>If you build an application for other people, you are responsible for your own notices,
        permissions, security, lawful instructions, and user-facing claims. You may not use someone else’s
        personal data simply because an API accepts it. Future commercial API or MCP offerings require
        their own available functionality and clearly presented terms; “coming soon” is not a purchase commitment.</p>
    </>,
  },
  {
    id: "availability", title: "Availability, support, and changes to the service",
    content: <>
      <p>Maintenance, network/provider failures, browser changes and security incidents may affect
        availability. Unless expressly agreed, there is no contractual uptime SLA. We will not use
        this clause to exclude mandatory conformity, security-update, support or remedy obligations.</p>
      <p>We may make reasonable technical changes or retire features, subject to applicable notice,
        contractual and consumer protections. Material adverse changes to paid digital services may
        carry a right to terminate or other remedies. Open-source rights already granted remain governed
        by the relevant release licence. A definitive support period, if legally required for an offering,
        must be provided rather than inferred from a download or repository remaining online.</p>
    </>,
  },
  {
    id: "termination", title: "Suspension and ending your account",
    content: <>
      <p>You may request account closure through <LegalContact />. Export work and review sharing
        memberships first. Account closure does not automatically cancel a separate third-party payment
        mandate or delete independent/offline copies. We may suspend access for material misuse, credible
        security risks, non-payment or legal obligations, with notice and an opportunity to resolve or
        contest matters where appropriate. Urgent protective action may require immediate restriction.</p>
      <p>Ending access does not remove accrued statutory refund rights or authorise indefinite retention
        of all personal data. Deletion and justified retention follow the Privacy Policy and applicable
        agreements/law. Required export or recovery opportunities must be considered before planned
        termination; no guarantee is made that expired recent history can be recovered.</p>
    </>,
  },
  {
    id: "liability", title: "Warranties and liability",
    content: <>
      <p>To the extent permitted by applicable law, experimental/free functions and AI outputs are
        provided without a guarantee of error-free, uninterrupted or particular-result performance.
        We do not exclude liability or rights that cannot lawfully be excluded, including applicable
        consumer guarantees, fraud, intentional misconduct, death/personal injury caused by negligence,
        or data-protection remedies. We remain responsible for obligations the law places on us.</p>
      <p>Where lawful, we exclude indirect or consequential business losses that were not reasonably
        foreseeable. This does not remove a consumer’s remedies for foreseeable loss or service
        non-conformity where mandatory law protects them. No artificial zero-fee liability cap is
        introduced merely because Editor is free.</p>
    </>,
  },
  {
    id: "regional-protections", title: "Mandatory protections outside the EU and across regions",
    content: <MandatoryLocalRights />,
  },
  {
    id: "law-changes", title: "Applicable law, disputes, and changes to these Terms",
    content: <>
      <p>These Terms are governed by the laws of Uganda, subject to applicable mandatory law.
        This choice does not deprive consumers of mandatory protections of their habitual residence,
        including applicable EU/EEA consumer rights. Disputes may be brought before courts with lawful
        jurisdiction; consumers retain any right to use competent courts in their country of residence.
        No mandatory arbitration or class-action waiver is imposed. Contact support for informal resolution,
        without losing regulatory complaint or court rights.</p>
      <p>Material changes must be clearly notified before taking effect, with any advance notice and
        acceptance required by law. Changes must not retrospectively remove accrued rights or authorise
        previously undisclosed recurring charges. When new consent is legally needed, continued use is
        not a substitute. Existing customers retain accrued rights and any protection requiring
        advance notice or acceptance before material changes apply.</p>
    </>,
  },
];

export default function TermsAndConditions() {
  return <LegalDocument title="Terms and Conditions" introduction={
    <p>These Terms distinguish the private hosted BrightBoard service from separately licensed
      open-source software and device-local files. They cover current services, not promises that
      planned compliance systems or “coming soon” developer features are already available.</p>
  } sections={sections} />;
}
