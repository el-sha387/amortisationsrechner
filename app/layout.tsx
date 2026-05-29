import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rentabilitätsrechner – gebioMized",
  description: "Berechne die Amortisation deiner Bikefitting-Investition",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icon-192.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" className="h-full">
      <head>
        <meta name="theme-color" content="#3D5278" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="gebioMized" />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
