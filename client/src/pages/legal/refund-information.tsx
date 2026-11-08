import { legalOperator, legalContact, LegalContact, LegalDocument, type LegalSection } from "@/components/legal-document";

const sections: LegalSection[] = [
  {
    id: "rights", title: "Mandatory rights come first",
    content: <>
      <p>AI-generation costs do not override consumer law. This notice replaces the blanket
        “all sales final” approach with a distinction between cancellation, statutory withdrawal,
        remedies for faulty/non-supplied services, and any additional goodwill refund.</p>
      <p>Nothing here removes a refund, correction, price reduction or termination right that applicable
        law grants you. The seller is {legalOperator.name}, registered in {legalOperator.registrationLocation},
        at {legalOperator.address}. Read this notice with the Terms and
        Conditions and the information shown at checkout.</p>
    </>,
  },
  {
    id: "billing", title: "Current purchases and payment provider",
    content: <>
      <p>The reviewed paid-access flow uses PesaPal and activates a fixed access period after server-side
        payment verification. A weekly/monthly label is not itself authorisation for recurring charges.
        Any recurring arrangement must be separately disclosed and expressly agreed before charging.</p>
      <p>PesaPal and payment partners may process a payment inside an embedded interface. This does not
        make Paddle the merchant of record for that purchase or remove BrightBoard’s responsibilities.
        Use the provider and order details on your actual receipt for a historical transaction.</p>
      <p>The currently free Editor, offline downloads, local SDK and free hosted media API do not require
        a refund of a fee that was never charged. Their free status does not remove applicable rights
        concerning personal data or digital-service conformity.</p>
    </>,
  },
  {
    id: "withdrawal", title: "EU/EEA consumer withdrawal",
    content: <>
      <p>If applicable distance-contract consumer rules cover your purchase, you generally have
        14 days from contract conclusion to withdraw from a service/digital-content contract without
        giving a reason, subject to the applicable exceptions and national law. Failure to give required
        withdrawal information can extend the period; this policy does not reduce that statutory extension.</p>
      <p>Beginning to use a feature does not automatically remove the right. Immediate non-tangible
        digital-content supply requires the prescribed prior express consent, acknowledgement of the
        loss of withdrawal rights and contract confirmation for the relevant exception to apply.
        For services started at your express request during the withdrawal period, only a lawful
        proportionate charge may apply, and any full-performance exception needs its own legal conditions.
        A generic Terms checkbox is not evidence that every condition was satisfied.</p>
      <p>An ordinary email giving a clear withdrawal statement is sufficient to notify us; the example
        form below is optional for exercising the right. Any separately required online withdrawal
        function must also be supplied by the service. This notice does not claim that function exists.</p>
    </>,
  },
  {
    id: "other-countries", title: "Purchases outside the EU/EEA",
    content: <>
      <p>The EU/EEA explanation above is not a worldwide limitation or a promise of the same
        cooling-off period in every country. Mandatory local law prevails where it applies.</p>
      <p><strong>United Kingdom:</strong> applicable distance-selling rules generally provide a
        14-day cancellation period for relevant service/digital-content contracts, with their own
        immediate-supply/performance conditions. Mandatory Consumer Rights Act remedies remain available.</p>
      <p><strong>Australia:</strong> Australian Consumer Law guarantees and remedies apply where
        required, including to qualifying overseas suppliers. A faulty-service remedy is distinct from
        a change-of-mind refund; “no refunds” wording cannot remove a mandatory guarantee.</p>
      <p><strong>Brazil:</strong> where Consumer Defence Code Article 49 applies, remote purchases
        generally carry a seven-day withdrawal right, with the starting point and other conditions
        determined by applicable law. EU loss-of-withdrawal conditions must not automatically be
        imported into Brazilian purchases.</p>
      <p><strong>Other North/South American, African, ASEAN and GCC markets, and China:</strong>
        statutory cancellation, non-supply, unfair-term, price-reduction, repair/refund and payment-dispute
        protections vary by country/state/province and transaction. We cannot exclude them by choosing
        Ugandan law, using a third-party processor or describing a plan as prepaid.
        Contact support with your purchase details and country/state; a statutory claim is not merely
        a request for a discretionary goodwill exception.</p>
    </>,
  },
  {
    id: "form", title: "Withdrawal notice and model form",
    content: <>
      <p>Email <LegalContact /> before the relevant deadline. Include enough information to identify
        your purchase. Do not send a password, full card number, card security code or mobile-money PIN.</p>
      <div className="rounded-md border p-4 space-y-2">
        <p><strong>Model withdrawal form — complete only if you wish to withdraw</strong></p>
        <p>To: {legalOperator.name}, {legalOperator.address}; email: {legalContact}.</p>
        <p>I/We hereby give notice that I/We withdraw from my/our contract for the supply of the
          following service/digital content: [description and order reference].</p>
        <p>Ordered on / received on: [date, as applicable].</p>
        <p>Name of consumer(s): [name].</p>
        <p>Address of consumer(s): [address].</p>
        <p>Signature of consumer(s): [only if this form is notified on paper].</p>
        <p>Date: [date]. Delete wording that does not apply.</p>
      </div>
      <p>An electronic notice does not need a handwritten signature. This model is based on the
        withdrawal information required for relevant consumer purchases; any additional mandatory
        pre-contract information must also be supplied.</p>
    </>,
  },
  {
    id: "remedies", title: "Failed payments, duplicate charges and faulty services",
    content: <>
      <p>If money was taken but access was not supplied, or you suspect a duplicate or unauthorised
        payment, contact support with the order reference, date, amount and payment method. Do not pay
        repeatedly while the same order is pending. Payment verification can be delayed by the bank
        or provider; your statutory non-supply and payment rights remain available.</p>
      <p>For a digital service that does not conform to the contract, applicable law may provide
        correction, a proportionate price reduction, termination and reimbursement. A blanket
        “no refund once generation begins” clause does not override those remedies. If no statutory or
        contractual right applies, any additional goodwill refund can be assessed individually;
        that discretion is not a condition for exercising a legal right.</p>
    </>,
  },
  {
    id: "reimbursement", title: "Reimbursement timing",
    content: <>
      <p>Where EU withdrawal rules require reimbursement, it is normally due without undue delay and
        within 14 days of being informed of the withdrawal, subject to any lawful applicable conditions.
        Reimbursement uses the original payment method unless another method is expressly agreed
        without fees to the consumer. Other statutory remedies have their applicable deadlines.</p>
      <p>Payment-provider and bank processing times can affect when funds appear, but do not remove our
        own legal duties. We must explain any lawful deduction, refusal or delay and not describe
        every refund as solely at our discretion.</p>
    </>,
  },
  {
    id: "cancellation", title: "Cancellation and help",
    content: <>
      <p>Cancellation of future renewal is not the same as withdrawal or a claim about faulty supply.
        For a prepaid non-recurring plan, avoiding a further purchase prevents another purchase.
        If an expressly authorised recurring plan is offered, its cancellation method, deadline and
        continuing access period must be clearly disclosed. Use available account controls or
        contact <LegalContact />; do not rely on a Paddle portal for a PesaPal purchase.</p>
      <p>Closing an account does not automatically cancel a separate third-party payment mandate.
        Ask for confirmation of both where relevant. You may contact us about a dispute without
        waiving a statutory complaint, court, payment-dispute or data-protection right.</p>
    </>,
  },
];

export default function RefundInformation() {
  return <LegalDocument title="Refunds, Cancellation and Withdrawal" introduction={
    <p>This notice explains different purchase remedies without promising automatic refunds
      for every request or excluding rights protected by law. The terms and provider on your actual
      purchase must be checked.</p>
  } sections={sections} />;
}
