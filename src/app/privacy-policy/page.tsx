import { DISCORD_SERVER_URL } from "@/lib/constants";

export default function PrivacyPolicyPage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10 md:px-8">
      <article className="space-y-6 rounded-3xl border border-white/80 bg-white/85 p-6 shadow-sm md:p-8">
        <header className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">Legal</p>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Privacy Policy - EasyEarn (ezearn.org)</h1>
          <p className="text-sm text-slate-600">Effective Date: 17 February 2026</p>
        </header>

        <p className="text-sm leading-7 text-slate-700">
          A general partnership based in Australia. This Privacy Policy explains in detail how we collect, use, store,
          and protect your personal and non-personal information when you access or use EasyEarn, including all services,
          offers, surveys, and payment features available on the website.
        </p>
        <p className="text-sm leading-7 text-slate-700">
          We are committed to protecting your privacy and ensuring that your personal data is handled securely and
          responsibly. By using EasyEarn, you agree to the terms of this Privacy Policy and consent to the collection and
          use of your information as described below.
        </p>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-slate-900">1. Information We Collect</h2>
          <p className="text-sm leading-7 text-slate-700">
            In order to provide you with a safe, secure, and functional experience on EasyEarn, we collect various types
            of information.
          </p>

          <h3 className="text-base font-semibold text-slate-900">1.1 Account Information</h3>
          <p className="text-sm leading-7 text-slate-700">When you create an account, we collect:</p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
            <li>Email address</li>
            <li>Username</li>
            <li>Password (stored securely in hashed form)</li>
            <li>Verification status</li>
          </ul>
          <p className="text-sm leading-7 text-slate-700">
            This information is required to create your account, authenticate your identity, and securely access our
            services.
          </p>

          <h3 className="text-base font-semibold text-slate-900">1.2 Device &amp; Technical Information</h3>
          <p className="text-sm leading-7 text-slate-700">
            To help prevent fraud, optimize your experience, and maintain platform integrity, we may collect:
          </p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
            <li>IP address</li>
            <li>Browser type and version</li>
            <li>Device type (computer, smartphone, tablet, etc.)</li>
            <li>Operating system</li>
            <li>Cookies and other tracking technologies</li>
          </ul>

          <h3 className="text-base font-semibold text-slate-900">1.3 Activity Information</h3>
          <p className="text-sm leading-7 text-slate-700">
            We collect information about your interactions with EasyEarn, including:
          </p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
            <li>Surveys or offers you complete</li>
            <li>Offerwall interactions and clicks</li>
            <li>Rewards you earn</li>
            <li>Referral activities or bonus tracking</li>
          </ul>
          <p className="text-sm leading-7 text-slate-700">
            This helps us calculate rewards accurately, prevent abuse, and improve the user experience.
          </p>

          <h3 className="text-base font-semibold text-slate-900">1.4 Payment Information</h3>
          <p className="text-sm leading-7 text-slate-700">
            For withdrawals and reward delivery, we collect only data needed to process payouts, including:
          </p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
            <li>PayPal email or account details</li>
            <li>Crypto wallet addresses</li>
            <li>Other relevant payout details</li>
          </ul>
          <p className="text-sm leading-7 text-slate-700">
            We do not store sensitive financial details such as bank account numbers or card numbers on our servers.
          </p>

          <h3 className="text-base font-semibold text-slate-900">1.5 Communications</h3>
          <p className="text-sm leading-7 text-slate-700">
            We may collect information you voluntarily provide when contacting us, such as support requests, questions,
            feedback, and survey responses.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-slate-900">2. How We Use Your Information</h2>
          <p className="text-sm leading-7 text-slate-700">
            We use the information we collect to operate, improve, and secure EasyEarn, including to:
          </p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
            <li>Create, authenticate, and verify user accounts</li>
            <li>Process rewards, bonuses, and withdrawals</li>
            <li>Send transactional communications (verification emails, updates, support responses)</li>
            <li>Detect and prevent fraud, abuse, multi-accounting, bot activity, or VPN misuse</li>
            <li>Improve product performance and user experience</li>
            <li>Comply with legal obligations or industry requirements</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-slate-900">3. Third-Party Services</h2>
          <p className="text-sm leading-7 text-slate-700">
            EasyEarn integrates with third-party services (including offerwalls) to provide surveys, tasks, and earning
            opportunities. These providers may collect data directly, including IP address, device information, and survey
            responses.
          </p>
          <p className="text-sm leading-7 text-slate-700">
            We are not responsible for third-party privacy practices. Providers may include CPX Research, AdGate Media,
            OfferToro, Revenue Universe, InBrain, and Adscend Media.
          </p>
          <p className="text-sm leading-7 text-slate-700">
            We recommend reviewing each provider&apos;s privacy policy before using their services.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-slate-900">4. Cookies and Tracking Technologies</h2>
          <p className="text-sm leading-7 text-slate-700">
            EasyEarn uses cookies and similar technologies to improve user experience, maintain security, and prevent
            fraudulent activities. This may include session cookies, engagement tracking cookies, and security cookies.
          </p>
          <p className="text-sm leading-7 text-slate-700">
            Third-party integrations may also use cookies. By using EasyEarn, you consent to cookie use under this policy.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-slate-900">5. Data Sharing</h2>
          <p className="text-sm leading-7 text-slate-700">
            We do not sell personal information. We may share data in limited cases:
          </p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
            <li>With offerwall providers for reward tracking and task completion</li>
            <li>When required by law, legal process, or government authorities</li>
            <li>To enforce Terms of Service or protect rights, property, and user safety</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-slate-900">6. Data Retention</h2>
          <p className="text-sm leading-7 text-slate-700">
            We retain data as long as needed to provide services, comply with legal obligations, resolve disputes, and
            enforce agreements. Verification tokens expire 24 hours after issuance. Reward history may be retained for
            auditing and fraud prevention.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-slate-900">7. User Rights</h2>
          <p className="text-sm leading-7 text-slate-700">
            Depending on your location, you may have rights to access, correct, or delete your personal data, and opt out
            of marketing communications (except required transactional communications).
          </p>
          <p className="text-sm leading-7 text-slate-700">
            To exercise these rights, contact us through the methods listed in Section 11.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-slate-900">8. Security Measures</h2>
          <p className="text-sm leading-7 text-slate-700">
            We implement reasonable technical and administrative safeguards, including password hashing, HTTPS encryption,
            token-based verification, suspicious activity monitoring, and restricted internal access.
          </p>
          <p className="text-sm leading-7 text-slate-700">
            No transmission or storage method is fully secure, and absolute security cannot be guaranteed.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-slate-900">9. Children&apos;s Privacy</h2>
          <p className="text-sm leading-7 text-slate-700">
            EasyEarn is intended for users aged 13 and older. If we discover personal data from a child under 13, we will
            take steps to delete it as soon as possible.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-slate-900">10. Changes to This Privacy Policy</h2>
          <p className="text-sm leading-7 text-slate-700">
            We may update this policy to reflect changes in services, practices, or legal requirements. Updates will be
            published on this page with a revised effective date.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-slate-900">11. Contact Us</h2>
          <p className="text-sm leading-7 text-slate-700">
            If you have questions, concerns, or requests about privacy or data handling, contact us through our official
            support channel:
          </p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">
            <li>
              Discord Support:{" "}
              <a
                href={DISCORD_SERVER_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-sky-700 hover:text-sky-800"
              >
                Join our Discord server
              </a>{" "}
              and open a support ticket
            </li>
          </ul>
        </section>
      </article>
    </main>
  );
}
