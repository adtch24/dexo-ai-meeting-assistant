import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dexo — AI Meeting Intelligence Platform",
  description: "Turn meetings into searchable knowledge, accurate Minutes of Meeting (MoM), clear decisions, and trackable action items.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark h-full">
      <body className="min-h-full flex flex-col bg-[#090D16] text-slate-100 antialiased selection:bg-indigo-500/30 selection:text-indigo-200">
        {children}
      </body>
    </html>
  );
}
