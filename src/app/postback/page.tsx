import { getAppUrl } from "@/lib/app-url";

export default function PostbackPage() {
  const appUrl = getAppUrl();
  const bitlabsCallbackUrl = `${appUrl}/api/postback`;
  const theoremreachCallbackUrl = `${appUrl}/api/theoremreach/postback`;

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10 md:px-8">
      <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Offerwall Postbacks</h1>
        <p className="text-sm text-slate-600">Use these callback endpoints to credit users in EasyEarn.</p>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">BitLabs Callback URL</p>
          <code className="break-all text-sm text-slate-900">{bitlabsCallbackUrl}</code>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            TheoremReach Reward Callback URL
          </p>
          <code className="break-all text-sm text-slate-900">{theoremreachCallbackUrl}</code>
        </div>
        <div className="space-y-2 text-sm text-slate-700">
          <p>Suggested parameter names in BitLabs Callback Settings:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>`hash` from `hash`</li>
            <li>`user_id` from `(user:uid) Unique user ID`</li>
            <li>`trans_id` from `(tx) Transaction ID`</li>
            <li>`sub_id2` from `(value:usd) value in USD`</li>
            <li>`sub_id` from `(offer:task_id) Offer ID` (optional)</li>
          </ul>
          <p className="pt-2">Suggested TheoremReach parameters:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>`user_id` from your external user ID</li>
            <li>`transaction_id` from TheoremReach transaction ID</li>
            <li>`amount` as reward amount (USD)</li>
            <li>`enc` or `hash` as signature</li>
          </ul>
        </div>
      </section>
    </main>
  );
}
