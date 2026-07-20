import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "Clothing Store",
  description: "Production-ready payment integration",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#faf9f5] text-[#30302e] antialiased font-sans">
        <Navbar />
        {children}
      </body>
    </html>
  );
}
