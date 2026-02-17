import type { Metadata } from "next";
import { Manrope, Sora } from "next/font/google";

import { SiteFooter } from "@/components/site-footer";
import { APP_NAME } from "@/lib/constants";

import "./globals.css";

const headingFont = Sora({
  variable: "--font-heading",
  subsets: ["latin"],
});

const bodyFont = Manrope({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: APP_NAME,
    template: `%s - ${APP_NAME}`,
  },
  description:
    "Easy Earn is a Get Paid To platform with full account flows, USD wallet tracking, referrals, levels, and withdrawals.",
  icons: {
    icon: "/easy-earn-logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${headingFont.variable} ${bodyFont.variable} antialiased`}>
        <div className="flex min-h-screen flex-col">
          <div className="flex-1">{children}</div>
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
