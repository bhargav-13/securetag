import type { Metadata, Viewport } from "next";
import SiteHeader from "@/components/SiteHeader";
import "./globals.css";

export const metadata: Metadata = {
  title: "SecureTag — Smart Vehicle Tag",
  description:
    "A QR smart-tag for your vehicle. Scan to reach the owner in seconds — for parking, emergencies, and lost & found.",
};

export const viewport: Viewport = {
  themeColor: "#4e46dc",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
