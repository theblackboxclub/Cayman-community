import './globals.css';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'CircleCayman',
  description: 'Community App for Cayman Islands',
  manifest: '/manifest.json', // Linked here
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0', // Prevents zooming on inputs
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
