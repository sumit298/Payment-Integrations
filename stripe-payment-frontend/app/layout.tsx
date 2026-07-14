import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "StreamHub",
  description: "Production-ready SaaS starter — ship your startup this weekend",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${geist.className} bg-[#faf9f5] text-[#30302e] antialiased`}>
        <Navbar />
        {children}
      </body>
    </html>
  );
}
