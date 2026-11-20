import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import { PaletteProvider } from "@/lib/palette";

const saans = localFont({
  src: [
    {
      path: "../../public/fonts/Saans-Regular.otf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../public/fonts/Saans-SemiBold.otf",
      weight: "600",
      style: "normal",
    },
  ],
  variable: "--font-saans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "boost.supply — Clean, customizable CRO sections for Shopify",
  description:
    "A directory of conversion-focused Shopify sections you can tweak to your brand and export as Liquid. Clean design, fully customizable, copy-paste ready.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${saans.variable} h-full antialiased`}>
      <body className="min-h-full bg-bg text-ink">
        <AuthProvider>
          <PaletteProvider>{children}</PaletteProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
