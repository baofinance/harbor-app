import type { Metadata } from "next";
import"./globals.css";
import ContextProvider from "@/contexts";
import { headers } from "next/headers";
import Navigation from "@/components/Navigation";
import FadeContent from "@/components/FadeContent";

const siteUrl ="https://app.harborfinance.io";
const title ="Harbor Protocol";
const description =
"A decentralized protocol for creating synthetic assets pegged to any real-world data feed.";

export const metadata: Metadata = {
 metadataBase: new URL(siteUrl),
 title,
 description,
 viewport: {
 width: "device-width",
 initialScale: 1,
 maximumScale: 5,
 userScalable: true,
 },
 keywords: [
"Harbor",
"DeFi",
"synthetic assets",
"yield",
"leverage",
"crypto",
"blockchain",
"STEAM token",
 ],
 authors: [{ name:"Harbor Protocol" }],
 icons: {
 icon:"/logowhitenobg.png",
 shortcut:"/logowhitenobg.png",
 apple:"/logowhitenobg.png",
 },
 openGraph: {
 title,
 description,
 url: siteUrl,
 siteName: title,
 images: [
 {
 url: `${siteUrl}/logowhitenobg.png`,
 width: 1200,
 height: 630,
 alt: description,
 },
 ],
 type:"website",
 },
 twitter: {
 card:"summary_large_image",
 title,
 description,
 creator:"@0xHarborFi",
 site:"@0xHarborFi",
 images: [`${siteUrl}/logowhitenobg.png`],
 },
 alternates: {
 canonical: siteUrl,
 },
};

export default async function RootLayout({
 children,
}: Readonly<{
 children: React.ReactNode;
}>) {
 const headersObj = await headers();
 const cookies = headersObj.get("cookie");

  return (
    <html lang="en" suppressHydrationWarning>
 <body
 className={`antialiased font-sans bg-[#1E4775] text-white relative overflow-x-hidden min-h-screen flex flex-col`}
 >
 <div className="relative z-10 flex min-h-screen flex-col">
 <ContextProvider cookies={cookies}>
 <Navigation />
 <FadeContent
 blur={false}
 duration={500}
 easing="ease-out"
 initialOpacity={0}
 className="flex-1"
 >
 {children}
 </FadeContent>
 <footer className="mt-8 border-t border-white/20">
   <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
     <div className="flex justify-center mb-4">
       <a
         href="https://www.harborfinance.io/#:~:text=and%20many%20more.-,View%20audit%20report,-Banking%20and%20Crypto"
         target="_blank"
         rel="noopener noreferrer"
         className="inline-flex items-center rounded-full bg-[#FF8A7A] px-3 py-1 text-xs font-semibold text-white hover:bg-[#E07A6A] transition-colors"
       >
         Audited by Sherlock
       </a>
     </div>

     <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-sm text-white/70">
       <a
         href="https://docs.harborfinance.io/"
         target="_blank"
         rel="noopener noreferrer"
         className="hover:text-white transition-colors"
       >
         Docs
       </a>
       <a
         href="https://discord.com/invite/BW3P62vJXT"
         target="_blank"
         rel="noopener noreferrer"
         className="hover:text-white transition-colors"
       >
         Discord
       </a>
       <a
         href="https://x.com/0xHarborFi"
         target="_blank"
         rel="noopener noreferrer"
         className="hover:text-white transition-colors"
       >
         X
       </a>
     </div>
   </div>
 </footer>
 </ContextProvider>
 </div>
 </body>
 </html>
 );
}
