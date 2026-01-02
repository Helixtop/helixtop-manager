import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/layout/Sidebar";
import { AuthProvider } from "@/context/AuthContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Helixtop | Agency Management Suite",
  description: "Enterprise-grade agency management with AI insights.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <AuthProvider>
          <div className="flex min-h-screen bg-black text-white">
            <Sidebar />
            <main className="flex-1 ml-64 p-4 md:p-8 min-h-screen relative overflow-x-hidden">
              <div className="w-full max-w-[1920px] mx-auto">
                {children}
              </div>
              
              {/* Background decorative elements */}
              <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-blue-600/5 blur-[120px] -z-10 rounded-full" />
              <div className="fixed bottom-0 left-64 w-[400px] h-[400px] bg-green-600/5 blur-[100px] -z-10 rounded-full" />
            </main>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
