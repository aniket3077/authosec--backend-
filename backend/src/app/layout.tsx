import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'K Backend API',
  description: 'Next.js backend for K mobile app',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
