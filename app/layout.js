import './globals.css';

export const metadata = {
  title: 'CircleCayman',
  description: 'The community app for Grand Cayman.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
