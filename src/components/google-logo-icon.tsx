type GoogleLogoIconProps = {
  className?: string;
};

export function GoogleLogoIcon({ className }: GoogleLogoIconProps) {
  return (
    <span
      className={className ?? "inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-200 bg-white p-0.5"}
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24" className="h-full w-full" role="img" aria-label="Google">
        <path
          d="M21.35 12.23c0-.72-.06-1.24-.19-1.79H12v3.37h5.38c-.11.84-.72 2.1-2.08 2.95l-.02.11 3.04 2.31.21.02c1.95-1.77 3.08-4.37 3.08-7z"
          fill="#4285F4"
        />
        <path
          d="M12 21.6c2.64 0 4.86-.86 6.48-2.33l-3.23-2.44c-.86.6-2.01 1.01-3.25 1.01a5.89 5.89 0 0 1-5.6-4.01l-.11.01-3.16 2.39-.04.1A9.78 9.78 0 0 0 12 21.6z"
          fill="#34A853"
        />
        <path
          d="M6.4 13.83A6 6 0 0 1 6.07 12c0-.64.12-1.27.31-1.83l-.01-.12-3.2-2.43-.1.05A9.54 9.54 0 0 0 2 12c0 1.55.37 3.01 1.08 4.33z"
          fill="#FBBC05"
        />
        <path
          d="M12 6.16c1.57 0 2.63.67 3.24 1.23l2.36-2.26C16.85 4.45 14.64 3.2 12 3.2A9.78 9.78 0 0 0 3.07 7.67l3.31 2.5A5.89 5.89 0 0 1 12 6.16z"
          fill="#EA4335"
        />
      </svg>
    </span>
  );
}
