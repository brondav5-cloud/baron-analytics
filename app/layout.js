import './globals.css'

export const metadata = {
  title: 'Baron Analytics - מערכת ניתוח מכירות',
  description: 'מערכת ניתוח מכירות לחברת Baron',
  manifest: '/manifest.json',
}

export const viewport = {
  themeColor: '#3b82f6',
}

export default function RootLayout({ children }) {
  return (
    <html lang="he" dir="rtl">
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body>{children}</body>
    </html>
  )
}
