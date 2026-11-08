import { LegalContact, LegalSectionList as List } from "@/components/legal-document";

type RegionalNote = {
  region: string;
  frameworks: string;
  explanation: string;
  sources: { title: string; href: string }[];
};

const regionalNotes: RegionalNote[] = [
  {
    region: "Uganda and other African countries",
    frameworks: "Uganda’s Data Protection and Privacy Act 2019 and Regulations 2021; relevant national laws in other African markets.",
    explanation: "Keyo Technologies is registered in Uganda. Uganda’s requirements concerning lawful processing, notice, access/correction, objections, security, overseas processing and PDPO registration must be assessed for our activities. You may complain to Uganda’s Personal Data Protection Office. Other African markets have separate rules, for example Kenya’s Data Protection Act 2019, Nigeria’s Data Protection Act 2023 and South Africa’s POPIA. Their territorial scope, registration, direct-marketing, sensitive/child-data, breach and transfer rules differ. The African Union’s Malabo Convention is not a single continent-wide business registration or a substitute for national law. Country-specific assessment is required for other African markets too.",
    sources: [
      { title: "Uganda PDPO", href: "https://pdpo.go.ug/information-center/resources" },
      { title: "Kenya ODPC", href: "https://www.odpc.go.ke/" },
      { title: "Nigeria NDPC", href: "https://ndpc.gov.ng/faqs/" },
      { title: "South Africa Information Regulator", href: "https://inforegulator.org.za/" },
    ],
  },
  {
    region: "European Economic Area and United Kingdom",
    frameworks: "EU GDPR and applicable ePrivacy/consumer law; UK GDPR, Data Protection Act 2018, PECR and Data (Use and Access) Act 2025.",
    explanation: "The GDPR rights, bases and deadlines explained elsewhere in this notice apply where their scope is met. UK rules are separate from EU rules, including their own international-transfer arrangements and current cookie/automated-decision provisions. Under applicable UK complaint-handling requirements, a data-protection complaint must be acknowledged within 30 days and dealt with without undue delay; this is not the same as the deadline for a subject access request. UK individuals may complain to the ICO. Any required EU/UK representative, transfer agreement or complaint process must be established rather than assumed from this notice.",
    sources: [
      { title: "EDPB rights guidance", href: "https://www.edpb.europa.eu/sme/be-compliant/respect-individuals-rights_en" },
      { title: "ICO: current UK changes", href: "https://ico.org.uk/about-the-ico/what-we-do/legislation-we-cover/data-use-and-access-act-2025/the-data-use-and-access-act-2025-what-does-it-mean-for-organisations/" },
    ],
  },
  {
    region: "ASEAN",
    frameworks: "Separate national regimes, including Singapore’s PDPA, Malaysia’s PDPA as amended, Indonesia’s Law No. 27 of 2022, the Philippines’ Data Privacy Act 2012, Thailand’s PDPA and Vietnam’s Law No. 91/2025/QH15.",
    explanation: "ASEAN does not have one privacy law or regulator that authorises operation throughout the region. Rights such as notice, access/correction, withdrawal, deletion, objection and portability depend on the particular country and applicable exceptions; not every country grants every right identically. Local DPO/representative, notification, registration and overseas-transfer requirements require separate review. Vietnam’s 2025 personal-data law took effect on 1 January 2026; Malaysia’s amendments and implementing guidance also require current assessment. Brunei’s 2025 Personal Data Protection Order has its own commencement framework. Cambodia, Laos, Myanmar and Timor-Leste also require local-law review, not an assumption that no data, cybersecurity, consumer or localisation rules apply. ASEAN model contractual clauses are a tool, not proof that a particular transfer is lawful.",
    sources: [
      { title: "Singapore PDPC", href: "https://www.pdpc.gov.sg/data-protection-obligations" },
      { title: "Malaysia amendment", href: "https://www.pdp.gov.my/ppdpv1/wp-content/uploads/2024/11/Act-A1727.pdf" },
      { title: "Vietnam Ministry of Justice: law", href: "https://vbpl.moj.gov.vn/bocongan/Pages/vbpq-van-ban-goc.aspx?ItemID=179252" },
      { title: "ASEAN transfer-clause guide", href: "https://asean.org/wp-content/uploads/2023/05/The-Joint-Guide-to-ASEAN-Model-Contractual-Clauses-and-EU-Standard-Contractual-Clauses.pdf" },
    ],
  },
  {
    region: "GCC",
    frameworks: "Saudi Arabia’s PDPL; UAE Federal Decree-Law No. 45 of 2021 and applicable free-zone regimes; Qatar Law No. 13 of 2016; Bahrain Law No. 30 of 2018; Oman’s Royal Decree 6/2022 and implementing rules; applicable Kuwait CITRA/sector rules.",
    explanation: "The six GCC countries do not share one applicable privacy licence or data-transfer rule. Saudi, UAE, Qatar, Bahrain, Oman and Kuwait requirements must be assessed separately, including territorial scope, lawful grounds, sensitive/child data, marketing, local representation/permits and overseas processing. DIFC and ADGM have separate data-protection regimes; they are not interchangeable with UAE federal rules. A GDPR clause or Cloudflare subscription does not by itself satisfy any GCC transfer, hosting or approval requirement. No GCC registration, permit or local hosting arrangement is claimed here.",
    sources: [
      { title: "Saudi SDAIA transfer rules", href: "https://scc-pdpl.sdaia.gov.sa/" },
      { title: "UAE official data-protection overview", href: "https://u.ae/en/about-the-uae/digital-uae/data/data-protection-laws" },
      { title: "Qatar NCSA", href: "https://assurance.ncsa.gov.qa/en/privacy/law" },
      { title: "Bahrain law", href: "https://www.pdp.gov.bh/en/regulations.html" },
      { title: "Kuwait CITRA privacy regulation", href: "https://www.citra.gov.kw/sites/en/LegalReferences/Data_Privacy_Protection_Regulation.pdf" },
    ],
  },
  {
    region: "China — mainland",
    frameworks: "The Personal Information Protection Law (PIPL), Data Security Law, Cybersecurity Law and applicable implementing/overseas-transfer rules.",
    explanation: "PIPL can cover certain overseas providers serving or analysing individuals in mainland China. A GDPR legitimate-interest basis or European transfer contract is not automatically sufficient under PIPL. Applicable rights can include being informed, deciding/limiting or refusing processing, access/copy, correction, deletion and withdrawal; conditions and exceptions apply. Sensitive data and overseas disclosure can require separate consent and additional notices/assessments. Information about children under 14 is sensitive personal information and requires parental/guardian consent where PIPL applies; our under-13 account exclusion alone is not sufficient. Any required mainland representative, filing, assessment, standard contract or domestic-storage obligation must be independently assessed. None is represented as completed. Hong Kong and Macao require separate legal assessment rather than automatic treatment as mainland regimes.",
    sources: [
      { title: "PIPL official text (Chinese)", href: "https://www.spp.gov.cn/spp/fl/202108/t20210820_527244.shtml" },
      { title: "CAC: synthetic-content labelling", href: "https://www.cac.gov.cn/2025-03/14/c_1743654685896173.htm" },
    ],
  },
  {
    region: "Australia",
    frameworks: "Privacy Act 1988, Australian Privacy Principles and Notifiable Data Breaches scheme where applicable; Australian Consumer Law separately.",
    explanation: "Privacy Act coverage depends on the entity, Australian connection and applicable exemptions; it must not be assumed solely from a user visiting the site or from the service being free. Where covered, access/correction, clear notices, security, complaints, overseas-recipient accountability and applicable breach notifications must be addressed. APP 8 requirements are separate from EU transfer rules. Contact support first about a privacy complaint; an eligible unresolved complaint may be brought to the OAIC. Consumer guarantees can apply independently of Privacy Act coverage, including to an overseas business supplying Australian consumers.",
    sources: [
      { title: "OAIC: overseas disclosure", href: "https://www.oaic.gov.au/privacy/australian-privacy-principles/australian-privacy-principles-guidelines/chapter-8-app-8-cross-border-disclosure-of-personal-information" },
      { title: "ACCC: selling online", href: "https://www.accc.gov.au/business/selling-products-and-services/selling-online" },
    ],
  },
  {
    region: "North America — United States",
    frameworks: "Applicable state privacy/consumer laws, including California CCPA as amended by CPRA where qualifying thresholds are met; COPPA, CAN-SPAM and applicable education/biometric/AI rules.",
    explanation: "US rules are not a single GDPR-equivalent law. Depending on the state and coverage, residents may have access, correction, deletion, portability, targeted-advertising/sale/sharing opt-out, sensitive-data and appeal rights, with authorised-agent options and protection against unlawful discrimination. AdSense/ad-tech disclosure requires a legal assessment of sale/sharing/targeted advertising even if private documents are not sold. Required Global Privacy Control recognition and other opt-outs must be implemented where applicable; this draft does not claim they already work. COPPA obligations can arise for child-directed services or known collection from under-13 users; a teacher account or age statement alone is not a compliance certification. School-record use needs separate FERPA/state student-privacy analysis. Marketing must meet applicable CAN-SPAM requirements, including functional opt-out. No US-wide student-data or biometric compliance certification is asserted.",
    sources: [
      { title: "California Attorney General: CCPA", href: "https://www.oag.ca.gov/privacy/ccpa" },
      { title: "FTC: COPPA", href: "https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions" },
      { title: "FTC: CAN-SPAM", href: "https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business" },
    ],
  },
  {
    region: "North America — Canada",
    frameworks: "PIPEDA and applicable provincial privacy laws, including Quebec, Alberta and British Columbia regimes; Canada’s Anti-Spam Legislation (CASL).",
    explanation: "Applicable Canadian requirements can include meaningful consent, access/correction, limits on use/retention, accountable overseas processing, security/breach handling and privacy complaints. Provincial coverage and Quebec-specific assessment/transfer requirements must be considered separately. Contact support to exercise rights or complain; the OPC or competent provincial authority may also be relevant. CASL can apply to commercial messages sent into Canada from abroad and generally requires an applicable consent basis, sender identification and a functioning unsubscribe mechanism. This draft is not evidence that a broken unsubscribe link has been fixed.",
    sources: [
      { title: "OPC: PIPEDA", href: "https://www.priv.gc.ca/en/privacy-topics/privacy-laws-in-canada/the-personal-information-protection-and-electronic-documents-act-pipeda/pipeda_brief" },
      { title: "CRTC: CASL", href: "https://crtc.gc.ca/eng/com500/faq500.htm" },
    ],
  },
  {
    region: "North America — Mexico and other markets",
    frameworks: "Mexico’s 2025 Federal Law on Protection of Personal Data Held by Private Parties and applicable national laws in other North/Central American and Caribbean markets.",
    explanation: "Where Mexican law applies, the privacy notice, consent and transfer requirements, ARCO rights (access, rectification, cancellation and opposition), withdrawal/limitation requests and the competent authority’s procedures require local assessment. Do not rely on an outdated reference to the former INAI framework as proof of current compliance. Spanish/local-language notices and required request procedures may need to be provided. Mexico, Canada and the United States do not cover every North American market; Central American and Caribbean jurisdictions have their own laws, rights and authorities.",
    sources: [
      { title: "Mexico: current private-sector data law", href: "https://www.ordenjuridico.gob.mx/Documentos/Federal/html/wo125102.html" },
    ],
  },
  {
    region: "South America",
    frameworks: "Brazil’s LGPD and ANPD transfer rules; Argentina Law 25,326; Colombia Law 1581 of 2012; Peru Law 29,733 and implementing rules; Uruguay Law 18,331; Chile’s current Law 19,628 and forthcoming Law 21,719 reforms.",
    explanation: "Each country has its own scope, lawful grounds, rights, local-accountability and transfer rules. Relevant rights can include confirmation/access, correction, deletion, consent withdrawal and objections; LGPD also has specific rights concerning sharing information and automated decisions. ANPD-approved Brazilian transfer mechanisms are not interchangeable with every EU clause. Argentina’s AAIP, Colombia’s SIC, Peru’s ANPD and Uruguay’s URCDP have separate remits. As of this review on 8 November 2026, Chile’s Law 21,719 reform is due to take effect on 1 December 2026; it must not be represented as already fully operative. Other South American countries also require their own review. Portuguese/Spanish notices, local forms and mandatory consumer rights may be necessary.",
    sources: [
      { title: "Brazil ANPD: international transfers", href: "https://www.gov.br/anpd/pt-br/assuntos/assuntos-internacionais/international-affairs" },
      { title: "Argentina AAIP", href: "https://www.argentina.gob.ar/aaip/datospersonales/responsables/obligaciones" },
      { title: "Colombia SIC", href: "https://www.sic.gov.co/preguntas-frecuentes-pdp" },
      { title: "Chile: reform and commencement", href: "https://www.bcn.cl/leychile/Navegar/imprimir?idNorma=1209272" },
    ],
  },
];

export function RegionalPrivacyNotices() {
  return <>
    <p>These notes supplement, not replace, the processing explanations above. Applicable law depends
      on the person, the activity, territorial scope and any qualifying thresholds/exemptions.
      Not all rights exist identically everywhere. Our Ugandan establishment does not displace
      mandatory protections in your jurisdiction, and a GDPR legal basis does not automatically
      supply a lawful basis under another country’s law.</p>
    <p>Use <LegalContact /> for requests or complaints and identify your country/state so the correct
      rules and deadlines can be assessed. You do not have to create a BrightBoard account merely to
      submit a qualifying privacy or opt-out request. Proportionate identity checks may still be needed
      for access/deletion. You may also contact the competent regulator under applicable local procedures.</p>
    {regionalNotes.map(note => <div key={note.region} className="space-y-2 border-l-2 border-primary/20 pl-4">
      <h3 className="font-semibold text-foreground">{note.region}</h3>
      <p><strong>Relevant frameworks:</strong> {note.frameworks}</p>
      <p>{note.explanation}</p>
      <p className="flex flex-wrap gap-x-4 gap-y-1">
        {note.sources.map(source => <a key={source.href} href={source.href} target="_blank" rel="noopener noreferrer" className="text-primary underline">{source.title}</a>)}
      </p>
    </div>)}
    <p>This English notice is not a country-by-country legal opinion or proof of worldwide
      compliance. Required local-language notices, lawful transfer arrangements, consents, registrations,
      representatives, forms, appeal mechanisms and technical controls must be provided where applicable.
      A website being reachable does not prove every feature can lawfully be offered in every country.</p>
  </>;
}

export function MandatoryLocalRights() {
  return <>
    <p>Ugandan law is the proposed governing law, not a waiver of other mandatory protections.
      The EU AI Act is only one relevant framework. Applicable national consumer, privacy, advertising,
      intellectual-property, accessibility, synthetic-media/AI, cybersecurity and child-protection rules
      may impose additional duties on BrightBoard or its users.</p>
    <List>
      <li><strong>Africa:</strong> Uganda’s applicable contract/electronic-transactions rules and the
        mandatory protections of other African markets remain relevant. A single Ugandan registration
        is not a continent-wide permit.</li>
      <li><strong>ASEAN and GCC:</strong> local e-commerce, cancellation, invoice/language, privacy,
        content and transfer requirements must be assessed by country. ASEAN/GCC membership does not
        supply one uniform cooling-off period or an automatic exemption for free/open-source software.</li>
      <li><strong>China:</strong> mainland privacy, cybersecurity, content and AI rules require a separate
        assessment. Where their scope is met, China’s AI-generated/synthetic-content labelling measures
        impose requirements beyond merely mentioning the EU AI Act; those measures took effect
        on 1 September 2025. No required filing, mainland representative, assessment or labelling
        implementation is asserted as complete by these Terms.</li>
      <li><strong>Australia:</strong> applicable Australian Consumer Law guarantees cannot be excluded
        by these Terms, “as is” wording, overseas establishment or a non-refundable label.
        Remedies depend on the failure and applicable law.</li>
      <li><strong>North America:</strong> US state/federal and Canadian federal/provincial rules differ;
        Mexico and other markets have their own mandatory consumer protections. State/provincial
        cancellation rules, privacy rights and payment-dispute protections remain available where applicable.</li>
      <li><strong>South America:</strong> national consumer laws apply where their scope is met,
        including Brazil’s statutory remote-purchase withdrawal protection where applicable.
        An EU digital-content exception is not automatically a defence to another country’s law.</li>
      <li><strong>UK and EEA:</strong> applicable distance-contract, digital-service conformity,
        withdrawal and privacy protections remain in force despite a Ugandan governing-law clause.</li>
    </List>
    <p>These regional notes are not a promise that all national permits, local-language documents,
      registration/representation, age-assurance or technical requirements have already been implemented.
      Where mandatory law conflicts with these Terms, the mandatory protection prevails.
      The Privacy Policy’s regional notices provide further information.</p>
  </>;
}
