import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  metadataBase: new URL("https://sertifgenerator.vercel.app/"),
  title: {
    default: "Sertifikat Generator",
    template: "%s | Sertifikat Generator",
  },
  description:
    "Generate sertifikat PDF massal dari template gambar dan Excel. Upload template, data peserta, dan font, lalu unduh ZIP otomatis.",
  applicationName: "Sertifikat Generator",
  alternates: {
    canonical: "https://sertifgenerator.vercel.app/",
  },
  openGraph: {
    type: "website",
    url: "https://sertifgenerator.vercel.app/",
    title: "Sertifikat Generator",
    description:
      "Generate sertifikat PDF massal dari template gambar dan Excel. Upload template, data peserta, dan font, lalu unduh ZIP otomatis.",
    siteName: "Sertifikat Generator",
    images: [
      {
        url: "/og.svg",
        width: 1200,
        height: 630,
        alt: "Sertifikat Generator",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "Sertifikat Generator",
    description:
      "Generate sertifikat PDF massal dari template gambar dan Excel. Upload template, data peserta, dan font, lalu unduh ZIP otomatis.",
    images: ["/og.svg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  category: "productivity",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
