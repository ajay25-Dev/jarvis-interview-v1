import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Interview Prep - Jarvis",
  description: "Prepare for your interview with AI-powered guidance",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
