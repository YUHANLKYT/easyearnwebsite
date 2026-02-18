import type { Metadata } from "next";
import { Manrope, Sora } from "next/font/google";

import { SiteFooter } from "@/components/site-footer";
import { getAppUrl } from "@/lib/app-url";
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

const appUrl = getAppUrl();
const socialDescription = "Trusted rewards platform with real offerwall payouts.";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: APP_NAME,
    template: `%s - ${APP_NAME}`,
  },
  description: socialDescription,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: appUrl,
    siteName: APP_NAME,
    title: APP_NAME,
    description: socialDescription,
    images: [
      {
        url: "/easy-earn-logo-full.png",
        width: 1536,
        height: 1024,
        alt: `${APP_NAME} logo`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: APP_NAME,
    description: socialDescription,
    images: ["/easy-earn-logo-full.png"],
  },
  icons: {
    icon: [{ url: "/easy-earn-logo.png", type: "image/png" }],
    apple: "/easy-earn-logo.png",
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
