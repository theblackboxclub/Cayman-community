import "./globals.css";

export const metadata = {
  title: "CaymanCircle",
  description: "Local community for the Cayman Islands"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <header
          style={{
            padding: "16px",
            borderBottom: "1px solid #e5e5e5",
            fontWeight: "bold"
          }}
        >
          CaymanCircle 🌴
        </header>

        <main style={{ padding: "16px" }}>
          {children}
        </main>
      </body>
    </html>
  );
}
