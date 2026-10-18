import type { Metadata } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { IntroOverlay } from "@/components/motion/IntroOverlay";
import { SITE_URL } from "@/lib/site";
import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "What's Your Story — The Voice of Untold Stories",
    template: "%s | What's Your Story",
  },
  description:
    "Discover real-life stories about people, their experiences, struggles, achievements, and personal journeys. Share your own story with What's Your Story.",
  applicationName: "What's Your Story",
  keywords: [
    "stories",
    "real life stories",
    "personal journeys",
    "human stories",
    "storytelling",
  ],
  openGraph: {
    type: "website",
    siteName: "What's Your Story",
    title: "What's Your Story — The Voice of Untold Stories",
    description:
      "Behind every face is a journey. Discover the experiences, struggles, and triumphs that remind us what it means to be human.",
    url: SITE_URL,
    locale: "en_GB",
  },
  twitter: {
    card: "summary_large_image",
    title: "What's Your Story — The Voice of Untold Stories",
    description:
      "Behind every face is a journey. Discover the experiences, struggles, and triumphs that remind us what it means to be human.",
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: SITE_URL,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // suppressHydrationWarning: the intro's pre-paint script sets
    // data-wys-intro on <html> before React hydrates (session/admin gating).
    // This is the documented pattern for attribute-modifying inline scripts;
    // it only silences the attribute diff on <html> itself.
    <html
      lang="en"
      className={`${playfair.variable} ${inter.variable}`}
      suppressHydrationWarning
    >
      <body className="flex min-h-screen flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:bg-charcoal focus:px-4 focus:py-2 focus:text-ivory"
        >
          Skip to content
        </a>
        <Navbar />
        <IntroOverlay />
        <main id="main" className="flex-1">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
