import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GraphCody - AI Coding Assistant with Code Graph Analysis",
  description:
    "Understand entire codebases through code graph analysis, semantic search, and AI-powered insights.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
