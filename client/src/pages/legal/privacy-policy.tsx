import { legalOperator, LegalContact, LegalDocument, LegalSectionList as List, type LegalSection } from "@/components/legal-document";
import { RegionalPrivacyNotices } from "./regional-notices";

const sections: LegalSection[] = [
  {
    id: "operator", title: "Who is responsible and how to contact us",
    content: <>
      <p>BrightBoard is operated by <strong>{legalOperator.name}</strong>, registered in
        {" "}{legalOperator.registrationLocation}. Business address: {legalOperator.address}.
        This is the controller for BrightBoard’s account administration and other purposes it determines.
        BrightBoard is the brand used for the hosted teacher tools, Teacher Studio, BrightboardTV,
        BrightBoard Editor, document sharing, and developer services.</p>
      <p>For privacy requests, complaints, account help, or questions about this notice, contact <LegalContact />.
        This is also the public privacy-request contact. No EU representative or data protection officer
        appointment is asserted by this notice; whether either appointment is legally required must be assessed.</p>
    </>,
  },
  {
    id: "scope", title: "Hosted services, local editing, and your school",
    content: <>
      <p>This notice concerns personal data handled by BrightBoard’s hosted services. Installing a
        BrightBoard web app does not make hosted authentication, AI generation, payments, or sharing
        operate offline. Those functions still communicate with servers.</p>
      <p>BrightBoard Editor’s procedural Canvas/Web Audio rendering and the downloadable offline edition
        can create media on your device without a remote generation API. BrightboardTV also keeps local
        drafts and lesson files. Choosing hosted rendering, cloud storage, sharing, pairing, external
        links, or support can send the relevant data off your device. Visiting the hosted website also
        involves ordinary network requests and the third-party services described below.</p>
      <p>For account administration and service security, BrightBoard acts as controller. A school or
        other organisation may separately determine why personal data is entered into its documents.
        Where BrightBoard processes that data on the organisation’s behalf, roles, instructions,
        subprocessors, transfers, deletion, and assistance must be covered by an appropriate data
        processing agreement. These public documents are not that agreement.</p>
    </>,
  },
  {
    id: "information", title: "Information processed and where it comes from",
    content: <List>
      <li><strong>Accounts and authentication:</strong> names, email addresses, profile information,
        verification status, account identifiers, password credentials or hashes where applicable,
        recovery and verification records, sessions, and device/security metadata. Authentication
        providers receive credentials needed to authenticate you.</li>
      <li><strong>Content:</strong> prompts, uploaded text, images, documents and audio, selected logos,
        generated results, compositions, presentations, speaker notes, and settings you submit.
        Documents can contain information about other people supplied by you or your organisation.</li>
      <li><strong>Sharing:</strong> project titles, snapshots and revisions, owner and recipient identifiers,
        invitation email addresses, permissions, edit requests, decisions, and activity records.
        Another account holder may supply your email address when inviting you.</li>
      <li><strong>Payments and referrals:</strong> chosen plan, amount, currency, contact/billing details,
        order and provider references, payment status, entitlement periods, referral attribution,
        commission and payout records. Payment providers collect card or mobile-money information
        through their payment interfaces; BrightBoard does not need your card security code or
        mobile-money PIN in its document database.</li>
      <li><strong>Developer services:</strong> API-key labels and prefixes, hashed API keys, creation,
        revocation and last-use timestamps, usage counts, and rendering requests. Keep the complete
        key private; it is shown when created, not available as an ordinary account listing.</li>
      <li><strong>Communications and technical data:</strong> support/chat messages, newsletter signup,
        email delivery events, IP addresses, browser/device data, request timestamps, failures,
        security and operational logs, and any analytics/advertising data collected by enabled services.</li>
    </List>,
  },
  {
    id: "purposes", title: "Purposes and lawful bases",
    content: <>
      <p>Where GDPR applies, the relevant basis depends on the purpose; accepting Terms is not blanket
        consent to every use of personal data.</p>
      <List>
        <li><strong>Contract or steps you request before a contract:</strong> account access, requested
          generation/rendering, saving and sharing, subscriptions, payment confirmation, and service support.</li>
        <li><strong>Legitimate interests, subject to a balancing assessment:</strong> proportionate fraud
          prevention, account and infrastructure security, reliability, abuse investigation, and defending
          legal claims. You may object as explained below. This basis does not bypass cookie-consent rules.</li>
        <li><strong>Legal obligations:</strong> applicable accounting, tax, lawful disclosure, and
          regulatory obligations. Applicable legislation and required periods must be recorded for the operator.</li>
        <li><strong>Consent where required:</strong> optional marketing and non-essential tracking.
          Consent must be specific and withdrawable; refusing optional consent must not be treated as
          refusing necessary processing for the service you requested.</li>
      </List>
      <p>Required account and transaction fields enable the requested service; without them, that service
        may not be available. Other profile details and newsletter participation are optional.
        Information entered about another person needs its own appropriate basis and notice.</p>
    </>,
  },
  {
    id: "ai", title: "AI processing and automated decisions",
    content: <>
      <p>Hosted teacher generation currently uses Google Gemini, including Google endpoints accessed
        through OpenAI-compatible software interfaces. A library named “OpenAI” does not by itself mean
        OpenAI receives a request. Selected prompts, source material, images, or audio needed for a hosted
        generation are sent to the actual generation provider. Provider terms and data-use settings
        must be assessed for the particular feature; this notice does not promise zero provider retention
        or that all providers exclude data from model improvement.</p>
      <p>Local procedural Editor output is different from remotely generated AI output. Hosted developer
        rendering sends the submitted project to BrightBoard’s server even when it does not call an
        external generation model. Using an optional AfroAI support assistant sends the conversation
        needed for that service.</p>
      <p>BrightBoard’s intended use is content assistance, not solely automated decisions with legal or
        similarly significant effects. Do not use generated report cards, lesson suggestions, or other
        results as the sole basis for admission, grading, exclusion, recruitment, diagnosis, or eligibility.
        Human review is essential. Rights concerning significant automated decisions remain available
        where applicable. This notice does not authorise training a BrightBoard model on private
        documents; any new training purpose would need a separate assessment, notice, and lawful basis.</p>
    </>,
  },
  {
    id: "recipients", title: "Service providers and other recipients",
    content: <>
      <p>Recipients receive data needed for their role. Depending on the activity, a provider may be a
        processor, separate controller, or both; those roles require confirmation in the relevant contracts.</p>
      <List>
        <li><strong>DigitalOcean:</strong> hosting the application server and its existing account/database
          infrastructure, including network and operational data.</li>
        <li><strong>Cloudflare:</strong> website delivery/security and private R2/D1/Worker infrastructure for
          shared document snapshots, permissions and revisions; a separate private R2 bucket also holds
          diagnostic log archives.</li>
        <li><strong>AfroAI / Afro AI Group:</strong> authentication, verification/recovery, session services,
          transactional and marketing email delivery, and the optional support assistant.</li>
        <li><strong>Google:</strong> Gemini generation and enabled reCAPTCHA security services; AdSense
          advertising and any enabled Google sign-in have separate data flows and applicable notices.</li>
        <li><strong>PesaPal:</strong> checkout, payment processing, status verification, refunds where
          supported, and related payment compliance. Staying inside an embedded BrightBoard checkout
          does not prevent payment information being processed by PesaPal and its payment partners.</li>
        <li><strong>Ahrefs:</strong> website analytics through the embedded analytics script. The precise
          collected fields and consent requirements require verification; it must not be assumed cookie-free
          means exempt from every privacy requirement.</li>
        <li><strong>GitHub:</strong> public source/release downloads and any interactions you initiate on
          GitHub. Private uploaded projects are not made public source code merely by using the tools.</li>
        <li><strong>Other recipients:</strong> people you authorise, professional advisers bound by
          confidentiality, or competent authorities where disclosure is lawfully required. Additional
          social sign-in providers receive data only when their available sign-in option is selected.</li>
      </List>
      <p>We do not offer private account or document data for sale. This is not a representation that
        advertising services involve no disclosure or that every jurisdiction’s “sale” or “sharing”
        definition has been assessed. Historical Paddle or other provider records may remain where
        necessary, but the reviewed checkout uses PesaPal, not a blanket Paddle merchant-of-record model.</p>
    </>,
  },
  {
    id: "sharing", title: "Sharing links, QR codes, and presenter access",
    content: <>
      <p>Publishing a complete-project snapshot sends it to the sharing service. A stable project link
        and revision-specific links/QR codes are different: an explicitly published revision records a
        particular snapshot, while viewing it still depends on current access permissions. Publishing
        does not mean every keystroke is automatically published.</p>
      <p>Recipients must sign in and satisfy verification/access checks. Depending on the owner’s
        settings, access may be limited to invited accounts or available to authenticated people with
        the link. Editing requires the relevant permission, including owner approval of an edit request.
        Owners and collaborators may see identity information needed to manage access. Forwarding a
        link or QR code does not grant edit permission, but can expand who discovers a document.</p>
      <p>Revoking access prevents future authorised access through the service; it cannot recall
        screenshots, exports, downloads, or independent copies already obtained.</p>
      <p>BrightboardTV pairing is separate from durable document sharing. Its relay temporarily processes
        presentation/session data; approved controllers can receive private presenter notes, while
        audience display responses omit those notes. People with the room link/code can view a read-only
        display. Share pairing details only with the intended audience and end the session afterward.</p>
    </>,
  },
  {
    id: "retention", title: "Storage, retention, and deletion",
    content: <List>
      <li><strong>Recent generated content:</strong> normally available in private recent history for
        24 hours from creation, subject to capacity limits. Expired content is excluded from access and
        removed by cleanup; this is not a promise that every cache or backup erases at that exact instant.</li>
      <li><strong>Saved and published projects:</strong> separately saved libraries and shared revisions
        do not automatically expire with recent history. Owners can delete shared projects; access
        removal and queued physical object deletion are distinct operations. Link expiry alone is not deletion.</li>
      <li><strong>Local/offline files:</strong> drafts, browser storage, installation caches, exported
        files and recipients’ copies are controlled by the relevant device/user. Deleting a hosted account
        does not erase those copies. Browser storage may also be removed by device settings or browser cleanup.</li>
      <li><strong>Accounts, access records, support and API metadata:</strong> retained as needed for
        the requested service, account administration, security, and applicable legal obligations.
        Deletion requests require checks for records that must lawfully be retained.</li>
      <li><strong>Payment, accounting and dispute records:</strong> retained for the statutory retention
        period applicable to the operator and relevant transactions, and justified dispute/legal holds,
        rather than the 24-hour generation-history period.</li>
      <li><strong>Logs and backups:</strong> diagnostic archives exist separately from user history.
        Retention depends on configured lifecycle rules, legitimate investigation needs and legal holds.
        Automatic log rotation and a fixed archive-deletion period are not represented as verified.
        Deletion requests must consider identifiable data in restricted archives and any restoration process.</li>
    </List>,
  },
  {
    id: "international", title: "International processing and safeguards",
    content: <>
      <p>The operator and providers may process data outside your country, including outside the EEA.
        A server location or an R2 bucket does not guarantee EU-only processing or provider support access.
        Where GDPR applies, each restricted transfer requires an applicable Chapter V mechanism, such as
        a relevant adequacy decision or appropriate contractual safeguards, with supplementary measures
        where needed. Consent is not a default substitute for routine transfer safeguards.</p>
      <p>The provider agreements, actual processing locations, transfer mechanisms, and any required
        EU representative must be assessed for each applicable processing activity. We do not claim executed standard
        contractual clauses, an EU-US Data Privacy Framework certification, or an EU representative
        without verification. Contact <LegalContact /> for the applicable arrangements and safeguards.</p>
    </>,
  },
  {
    id: "cookies", title: "Cookies, local storage, analytics, and advertising",
    content: <>
      <p>Session/security cookies support sign-in and abuse prevention. Browser storage also holds local
        projects and preferences; referral attribution may use a signed attribution cookie. Third-party
        scripts in the website include Google AdSense, reCAPTCHA, Ahrefs analytics, and Cloudflare
        Web Analytics (which Cloudflare may inject at its delivery edge), and may
        disclose network/browser data when loaded.</p>
      <p>Where EU/ePrivacy rules require consent, non-essential storage/access and related processing
        must wait for a valid choice; reject and withdrawal mechanisms must be available. Security
        services require their own necessity and proportionality assessment, not automatic classification
        as “essential.” A privacy-policy link, browser settings, or continued browsing is not sufficient
        consent. No working consent-management interface or consent-gated script loading is certified
        by this notice; those are outstanding implementation items.</p>
      <p>You can delete device storage or change browser controls, but this can sign you out or remove
        unsaved projects and does not replace a required site-level consent mechanism.
        Google’s <a href="https://policies.google.com/technologies/partner-sites" target="_blank" rel="noopener noreferrer" className="text-primary underline">partner-site data notice</a> explains its services.</p>
    </>,
  },
  {
    id: "rights", title: "Your privacy rights and requests",
    content: <>
      <p>Depending on applicable law and the processing basis, you may request information and access,
        correction, erasure, restriction, portability of qualifying data, or object to processing.
        You may withdraw consent without affecting earlier lawful processing and object to direct
        marketing at any time. Rights concerning solely automated significant decisions may also apply.</p>
      <p>Send requests to <LegalContact /> with enough information to identify the account and request.
        We may seek proportionate identity verification, not your password or a payment PIN. Where GDPR
        applies, the response is due without undue delay and normally within one month; a permitted
        extension of up to two further months for complexity/number of requests must be explained within
        the first month. Requests are normally free; any lawful exception must be explained.</p>
      <p>You may complain to a competent data protection authority in your EEA country of residence,
        workplace, or alleged infringement, without first contacting us, and seek judicial remedies.
        Where Uganda’s law applies, the Personal Data Protection Office is also a relevant contact.
        We must explain any lawful refusal or retention exception. Account closure, a provider-side
        account request, document deletion and device-file deletion may require separate steps.</p>
      <p>To stop marketing, contact us directly if a working unsubscribe option is unavailable.
        Transactional security, payment and service messages are separate from optional marketing.</p>
    </>,
  },
  {
    id: "regional-rights", title: "Country and regional privacy notices",
    content: <RegionalPrivacyNotices />,
  },
  {
    id: "children", title: "Children, learners, and sensitive information",
    content: <>
      <p>BrightBoard is primarily an educator/professional tool, not a direct-to-child account service.
        The existing under-13 exclusion remains a minimum exclusion, not a universal declaration that
        every person aged 13 can legally consent. Local age, contractual-capacity, and parental-authorisation
        rules apply; GDPR Article 8’s consent age for directly offered online services varies from 13 to 16
        by Member State. China’s PIPL can require parental/guardian consent for personal information
        of children under 14; other countries also have their own child-data and age rules. These
        obligations must be assessed for both accounts and uploaded learner information.</p>
      <p>Educators should use anonymised examples and avoid uploading student identifiers, health data,
        biometric information, safeguarding records or other sensitive information unless there is a
        lawful basis, required notices/authorisations and an appropriate processing arrangement.
        Teacher authority or acceptance of these Terms alone does not supply those requirements.
        Contact us promptly about unauthorised child data or other sensitive material.</p>
    </>,
  },
  {
    id: "security-changes", title: "Security, incidents, and changes to this notice",
    content: <>
      <p>Access controls, authenticated sharing, private storage, transport protections and restricted
        credentials help protect data. They do not guarantee that a service or every endpoint is immune
        from compromise, and private cloud storage is not a claim of end-to-end encryption. We assess
        incidents and must make regulator/data-subject notifications when applicable legal thresholds
        and deadlines require them.</p>
      <p>Material changes to processing require clear notice before the new processing where required,
        and a new lawful basis or fresh consent when necessary. Continuing to use BrightBoard does not
        waive your privacy rights or automatically consent to new purposes. This updated notice applies
        upon publication. Where additional notice or consent is required, publication alone does not
        authorise new processing.</p>
    </>,
  },
];

export default function PrivacyPolicy() {
  return <LegalDocument title="Privacy Policy" introduction={
    <p>This notice explains personal data handling across BrightBoard’s hosted services and distinguishes
      it from local/offline creation. It must be read alongside the choices you make in each tool.
      It does not replace a school’s own privacy notice or a required data processing agreement.</p>
  } sections={sections} />;
}
