type FlashMessageProps = {
  notice?: string;
  error?: string;
};

export function FlashMessage({ notice, error }: FlashMessageProps) {
  if (!notice && !error) {
    return null;
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
        {error}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-700">
      {notice}
    </div>
  );
}
