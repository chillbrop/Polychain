import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Polychain Capital — Invest Smarter. Grow Faster.",
    template: "%s | Polychain Capital",
  },
  description:
    "Polychain Capital is a premium cryptocurrency investment platform offering secure, transparent, high-yield digital asset growth. Invest in USDT, BTC and ETH with confidence.",
  keywords: ["Polychain Capital", "crypto investment", "USDT", "bitcoin", "ethereum", "passive income", "digital assets"],
  icons: [{ rel: "icon", url: "/favicon.svg", type: "image/svg+xml" }],
  openGraph: {
    title: "Polychain Capital — Invest Smarter. Grow Faster.",
    description: "Premium cryptocurrency investment platform with secure, transparent high-yield growth.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#030507",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${spaceGrotesk.variable} font-sans`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
