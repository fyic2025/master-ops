import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Brand Connections | Get Your Brand in Front of 30,000+ Retailers",
  description: "Partner with New Star Wholesale to access 50,000+ Australian retailers and 20,000+ export contacts. Low $900 investment, full order processing, and tailored business development.",
  keywords: "wholesale distribution, retail partnerships, brand growth, Australian retailers, export markets",
  openGraph: {
    title: "Brand Connections | Get Your Brand in Front of 30,000+ Retailers",
    description: "Partner with New Star Wholesale to access 50,000+ Australian retailers. Low $900 investment.",
    url: "https://brandconnections.com.au",
    siteName: "Brand Connections",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
