import Link from "next/link";

function FaqCard({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="group relative rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="absolute -top-3 -left-3 inline-flex h-10 min-w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-400 to-sky-500 px-2 text-sm font-extrabold text-white shadow-lg shadow-sky-200/70">
        {number}
      </div>
      <h2 className="pl-9 text-lg font-semibold tracking-tight text-slate-900">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-7 text-slate-700">{children}</div>
    </section>
  );
}

export default function FaqPage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10 md:px-8">
      <article className="space-y-6 rounded-3xl border border-white/80 bg-white/85 p-6 shadow-sm md:p-8">
        <header className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">Support</p>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Frequently Asked Questions</h1>
          <p className="text-sm text-slate-600">
            Everything users need to know about earning, withdrawals, security, and account rules.
          </p>
        </header>

        <div className="space-y-4">
          <FaqCard number="1" title="What is EasyEarn?">
            <p>
              EasyEarn is an online platform that allows users to earn rewards by completing surveys, offers, and tasks
              through our integrated partner networks, known as offerwalls.
            </p>
            <p>
              Users can accumulate points or credits that can later be redeemed via PayPal, crypto, or other payout
              methods.
            </p>
          </FaqCard>

          <FaqCard number="2" title="How do I create an account?">
            <ul className="list-disc space-y-1 pl-5">
              <li>Click the Sign Up button on the EasyEarn homepage.</li>
              <li>Enter your email, username, and password.</li>
              <li>Verify your email by clicking the link sent to your inbox.</li>
              <li>Once verified, you can start completing tasks and earning rewards.</li>
            </ul>
            <p>Note: Users must be 13 years or older to register. Minors should have parental consent.</p>
          </FaqCard>

          <FaqCard number="3" title="How do I earn rewards?">
            <p>Complete surveys, offers, or tasks provided by our third-party partners.</p>
            <p>Earn points or credits for each successfully completed activity.</p>
            <p>Rewards are tracked in your EasyEarn account automatically.</p>
            <p>
              Tip: Always follow the instructions in each survey or offer carefully to ensure your reward is approved.
            </p>
          </FaqCard>

          <FaqCard number="4" title="Why was I disqualified from a survey or offer?">
            <p>Third-party offerwall providers determine eligibility for surveys and offers.</p>
            <p>You may be disqualified for reasons such as:</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Not meeting demographic requirements</li>
              <li>Incomplete or invalid responses</li>
              <li>Multi-accounting or suspicious activity</li>
            </ul>
            <p>Disqualifications are not controlled by EasyEarn, and we cannot reverse them.</p>
          </FaqCard>

          <FaqCard number="5" title="How long does it take to receive rewards?">
            <p>Rewards are usually credited to your EasyEarn account immediately after completion.</p>
            <p>Some offers may take 1-7 days to confirm depending on the third-party provider.</p>
            <p>Withdrawals can take additional time based on your chosen payout method.</p>
          </FaqCard>

          <FaqCard number="6" title="How do I withdraw my earnings?">
            <ul className="list-disc space-y-1 pl-5">
              <li>Ensure you meet the minimum payout threshold.</li>
              <li>Go to the Withdraw section in your account.</li>
              <li>Select your payout method (PayPal, crypto, etc.) and submit your request.</li>
              <li>Wait for processing; times vary by provider.</li>
            </ul>
            <p>EasyEarn reserves the right to review withdrawals to prevent fraud.</p>
            <p>Earnings remain virtual until successfully processed.</p>
          </FaqCard>

          <FaqCard number="7" title="Can I use a VPN or create multiple accounts?">
            <p>No. Multi-accounting, VPN use, or using bots/scripts is strictly prohibited.</p>
            <p>Violating these rules may result in:</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Account suspension or permanent ban</li>
              <li>Loss of rewards</li>
              <li>Denial of withdrawals</li>
            </ul>
            <p>EasyEarn uses monitoring systems to detect and prevent fraudulent activity.</p>
          </FaqCard>

          <FaqCard number="8" title="Do I need to verify my email?">
            <p>Yes. Email verification is required to:</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Activate your account</li>
              <li>Enable full access to offers and tasks</li>
              <li>Process withdrawals securely</li>
            </ul>
            <p>Unverified accounts may have restricted access until verification is complete.</p>
          </FaqCard>

          <FaqCard number="9" title="Is my personal information safe?">
            <p>Yes. EasyEarn takes privacy and security seriously:</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Passwords are securely hashed</li>
              <li>Data is encrypted over HTTPS</li>
              <li>Verification tokens expire after 24 hours</li>
              <li>Only authorized personnel have access to sensitive information</li>
            </ul>
            <p>
              See our{" "}
              <Link href="/privacy-policy" className="font-semibold text-sky-700 hover:text-sky-800">
                Privacy Policy
              </Link>{" "}
              for full details on how we handle your data.
            </p>
          </FaqCard>

          <FaqCard number="10" title="Why was my account banned or suspended?">
            <p>Accounts may be suspended or terminated for:</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Violating Terms of Service</li>
              <li>Multi-accounting or fraud</li>
              <li>Using bots, scripts, or VPNs</li>
              <li>Attempting to manipulate offers or rewards</li>
            </ul>
            <p>EasyEarn reserves the right to take action to protect the platform and its users.</p>
          </FaqCard>

          <FaqCard number="11" title="Can I contact support?">
            <p>Yes. For any issues, questions, or account concerns:</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Discord Support: Join our Discord server and open a ticket</li>
            </ul>
            <p>Support requests are typically handled within 24-48 hours.</p>
          </FaqCard>

          <FaqCard number="12" title="What if an offer is not credited?">
            <p>If an offer does not credit after completion:</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Confirm all steps of the offer were completed correctly.</li>
              <li>Wait the provider verification period (1-7 days).</li>
              <li>
                Submit a support ticket to the offerwall where you completed the offer with details including the offer
                name and timestamp.
              </li>
            </ul>
            <p>
              EasyEarn cannot reverse offers denied by third-party providers, but we will assist with verification when
              possible.
            </p>
          </FaqCard>

          <FaqCard number="13" title="Can I earn if I am outside Australia?">
            <p>Yes. EasyEarn supports users worldwide.</p>
            <p>Some offers may be region-specific.</p>
            <p>Users outside supported regions may have limited access to certain surveys or tasks.</p>
          </FaqCard>

          <FaqCard number="14" title="Are there any fees?">
            <p>EasyEarn does not charge fees for using the platform.</p>
            <p>Payment processors (PayPal, crypto) may apply standard fees; check with your provider.</p>
          </FaqCard>

          <FaqCard number="15" title="Can I delete my account?">
            <p>
              Yes. Head to the Settings tab, scroll down, and click Account deletion after confirming with your password.
            </p>
            <p>Deleting your account removes all personal data and earned rewards permanently.</p>
          </FaqCard>
        </div>

        <p className="text-sm text-slate-600">
          Need legal details? View the{" "}
          <Link href="/privacy-policy" className="font-semibold text-sky-700 hover:text-sky-800">
            Privacy Policy
          </Link>{" "}
          and{" "}
          <Link href="/tos" className="font-semibold text-sky-700 hover:text-sky-800">
            Terms of Service
          </Link>
          .
        </p>
      </article>
    </main>
  );
}
