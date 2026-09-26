import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ReachInbox Email Scheduler',
  description: 'Full-stack email scheduling and delivery management platform',
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
