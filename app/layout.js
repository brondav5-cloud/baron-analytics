import './globals.css';

export const metadata = {
  title: 'Baron Analytics - מערכת ניתוח מכירות',
  description: 'מערכת לניתוח נתוני מכירות וביצועים',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="he" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
