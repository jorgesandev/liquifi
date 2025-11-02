import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "LiquiFi - Invoice Financing",
  description: "Decentralized invoice financing platform",
  icons: {
    icon: "/LiquiFi_Logo_small.png",
    shortcut: "/LiquiFi_Logo_small.png",
    apple: "/LiquiFi_Logo_small.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
