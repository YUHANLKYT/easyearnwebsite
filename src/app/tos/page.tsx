import { DISCORD_SERVER_URL } from "@/lib/constants";

export default function TermsOfServicePage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10 md:px-8">
      <article className="space-y-6 rounded-3xl border border-white/80 bg-white/85 p-6 shadow-sm md:p-8">
        <header className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">Legal</p>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Terms of Service - EasyEarn</h1>
          <p className="text-sm text-slate-600">Effective Date: 17 February 2026</p>
        </header>

        <p className="text-sm leading-7 text-slate-700">
          These Terms of Service govern your access to and use of EasyEarn, operated as a general partnership based in
          Australia. By accessing or using EasyEarn, you agree to these Terms. If you do not agree, you may not use our
          services.
        </p>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-slate-900">1. Eligibility</h2>
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
            <li>Users must be 13 years or older to use EasyEarn.</li>
            <li>Users under 18 must have the consent of a parent or legal guardian to use the site.</li>
            <li>By using EasyEarn, you represent that you meet these eligibility requirements.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-slate-900">2. Account Registration</h2>
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
            <li>To participate in EasyEarn, you must create a registered account.</li>
            <li>You agree to provide accurate, complete, and current information during registration.</li>
            <li>You are responsible for safeguarding your account credentials and all activity under your account.</li>
            <li>You agree to notify us immediately if your account is compromised.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-slate-900">3. Earning Rewards</h2>
          <p className="text-sm leading-7 text-slate-700">
            Users can earn rewards by completing tasks, offers, surveys, or other activities provided via EasyEarn and
            third-party offerwall providers.
          </p>
          <p className="text-sm leading-7 text-slate-700">
            Reward eligibility is determined by EasyEarn and/or the third-party provider.
          </p>
          <p className="text-sm leading-7 text-slate-700">
            All decisions regarding task completion, reward approval, and disqualification are final.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-slate-900">4. Payments and Withdrawals</h2>
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
            <li>Rewards are virtual until successfully processed as a withdrawal.</li>
            <li>Users must meet any minimum payout threshold to withdraw funds.</li>
            <li>Withdrawals may only be processed through supported payment methods (for example PayPal or crypto).</li>
            <li>
              EasyEarn reserves the right to delay, withhold, or reverse payments for suspected fraud, multi-accounting,
              or Terms violations.
            </li>
            <li>Users are responsible for any fees associated with payment processors.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-slate-900">5. Prohibited Conduct</h2>
          <p className="text-sm leading-7 text-slate-700">You may not:</p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
            <li>Create multiple accounts to abuse referral bonuses or rewards.</li>
            <li>Use bots, scripts, automated systems, or VPNs to manipulate offers or site functionality.</li>
            <li>Provide false or misleading information during registration or surveys.</li>
            <li>Attempt to reverse engineer, hack, or exploit EasyEarn or third-party offerwalls.</li>
            <li>Engage in fraudulent behavior to gain rewards improperly.</li>
          </ul>
          <p className="text-sm leading-7 text-slate-700">
            Violations may result in account suspension, permanent bans, and loss of earned rewards.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-slate-900">6. Third-Party Offerwalls and Services</h2>
          <p className="text-sm leading-7 text-slate-700">
            EasyEarn integrates with third-party offerwall providers to deliver tasks, surveys, and offers.
          </p>
          <p className="text-sm leading-7 text-slate-700">
            These third parties may collect and process your information according to their own policies.
          </p>
          <p className="text-sm leading-7 text-slate-700">
            EasyEarn is not responsible for the content, accuracy, or privacy practices of these providers.
          </p>
          <p className="text-sm leading-7 text-slate-700">
            Users agree to comply with the rules of any third-party service when completing offers.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-slate-900">7. Intellectual Property</h2>
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
            <li>All site content, including logos, designs, scripts, and text, is owned by EasyEarn or its licensors.</li>
            <li>Users may not copy, reproduce, or distribute content without explicit written permission.</li>
            <li>
              Account submissions such as feedback and suggestions may be used by EasyEarn without restriction for product
              improvement.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-slate-900">8. Termination and Account Suspension</h2>
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
            <li>EasyEarn may suspend or terminate accounts for Terms violations or suspected fraud.</li>
            <li>Suspended or terminated accounts may lose access to earned rewards.</li>
            <li>EasyEarn reserves the right to take legal action when necessary to protect its rights or property.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-slate-900">9. Disclaimers</h2>
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
            <li>EasyEarn is provided &quot;as is&quot; and does not guarantee rewards will meet user expectations.</li>
            <li>Offer availability is not guaranteed at all times.</li>
            <li>EasyEarn is not responsible for interruptions caused by third-party offerwalls.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-slate-900">10. Limitation of Liability</h2>
          <p className="text-sm leading-7 text-slate-700">
            To the maximum extent permitted by law, EasyEarn and its partners are not liable for direct, indirect,
            incidental, or consequential damages arising from use of the site, participation in offers, or withdrawal of
            rewards.
          </p>
          <p className="text-sm leading-7 text-slate-700">
            Your sole remedy if dissatisfied is to stop using the site.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-slate-900">11. Changes to Terms</h2>
          <p className="text-sm leading-7 text-slate-700">
            EasyEarn may update these Terms at any time without prior notice. Updated Terms will be posted on this page
            with a new effective date. Continued use of the site constitutes acceptance of updated Terms.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-slate-900">12. Governing Law</h2>
          <p className="text-sm leading-7 text-slate-700">
            These Terms are governed by the laws of Australia. Any disputes arising from use of EasyEarn are subject to
            the exclusive jurisdiction of Australian courts.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-slate-900">13. Contact Us</h2>
          <p className="text-sm leading-7 text-slate-700">
            For questions or concerns regarding these Terms, contact us through Discord support by{" "}
            <a
              href={DISCORD_SERVER_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-sky-700 hover:text-sky-800"
            >
              joining the server
            </a>{" "}
            and opening a support ticket.
          </p>
        </section>
      </article>
    </main>
  );
}
