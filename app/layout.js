import './globals.css'

export const metadata = {
  title: 'Baron Analytics',
  description: 'דשבורד ניהולי - ברון',
  manifest: '/manifest.json',
  themeColor: '#3b82f6',
}

export default function RootLayout({ children }) {
  return (
    <html lang="he" dir="rtl">
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </head>
      <body>{children}</body>
    </html>
  )
}
