import type { Metadata, Viewport } from "next";
import "./globals.css";
import ContextProvider from "@/contexts";
import { headers } from "next/headers";
import Navigation from "@/components/Navigation";
import FadeContent from "@/components/FadeContent";
import { DocumentTextIcon } from "@heroicons/react/24/outline";
import { SiDiscord, SiX } from "react-icons/si";

const siteUrl ="https://app.harborfinance.io";
const title ="Harbor Protocol";
const description =
"A decentralized protocol for creating synthetic assets pegged to any real-world data feed.";

export const viewport: Viewport = {
 width: "device-width",
 initialScale: 1,
 maximumScale: 5,
 userScalable: true,
};

export const metadata: Metadata = {
 metadataBase: new URL(siteUrl),
 title,
 description,
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
 className={`antialiased font-sans bg-[#1E4775] text-white relative overflow-x-hidden min-h-full flex flex-col`}
 >
 <div className="relative z-10 flex flex-1 flex-col min-h-0">
 <ContextProvider cookies={cookies}>
 <Navigation />
 <FadeContent
 blur={false}
 duration={500}
 easing="ease-out"
 initialOpacity={0}
 className="flex-1 min-h-0 flex flex-col"
 >
 {children}
 </FadeContent>
 <footer className="mt-auto flex-shrink-0 border-t border-white/20">
   <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
     <div className="flex justify-center mb-4">
       <a
         href="https://www.harborfinance.io/#:~:text=and%20many%20more.-,View%20audit%20report,-Banking%20and%20Crypto"
         target="_blank"
         rel="noopener noreferrer"
         className="inline-flex items-center rounded-md bg-[#FF8A7A] px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-[#E07A6A] transition-colors"
       >
         Audited by Sherlock
       </a>
     </div>

     <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-5 text-sm text-white/70">
       <a
         href="https://docs.harborfinance.io/"
         target="_blank"
         rel="noopener noreferrer"
         title="Harbor Docs"
         className="inline-flex items-center gap-2 rounded-md px-2 py-1.5 font-normal hover:bg-white/10 hover:text-white transition-colors"
       >
         <DocumentTextIcon className="h-4 w-4 shrink-0" aria-hidden />
         Docs
       </a>
       <a
         href="https://discord.com/invite/BW3P62vJXT"
         target="_blank"
         rel="noopener noreferrer"
         title="Harbor on Discord"
         className="inline-flex items-center gap-2 rounded-md px-2 py-1.5 font-normal hover:bg-white/10 hover:text-white transition-colors"
       >
         <SiDiscord className="h-4 w-4 shrink-0" aria-hidden />
         Discord
       </a>
       <a
         href="https://x.com/0xHarborFi"
         target="_blank"
         rel="noopener noreferrer"
         title="@0xHarborFi on X"
         className="inline-flex items-center gap-2 rounded-md px-2 py-1.5 font-normal hover:bg-white/10 hover:text-white transition-colors"
       >
         <SiX className="h-4 w-4 shrink-0" aria-hidden />
         0xHarborFi
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
