export const metadata = {
  title: 'AuthoSec API',
  description: 'Secure transaction platform with dual QR verification',
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
