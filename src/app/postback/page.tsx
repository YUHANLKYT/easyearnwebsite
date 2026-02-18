import { getAppUrl } from "@/lib/app-url";

export default function PostbackPage() {
  const appUrl = getAppUrl();
  const callbackUrl = `${appUrl}/api/postback`;

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10 md:px-8">
      <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">BitLabs Postback</h1>
        <p className="text-sm text-slate-600">Use this callback endpoint in BitLabs to credit users in EasyEarn.</p>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Callback URL</p>
          <code className="break-all text-sm text-slate-900">{callbackUrl}</code>
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
        </div>
      </section>
    </main>
  );
}
