import type { Metadata } from"next";
import"./globals.css";
import ContextProvider from"@/contexts";
import { headers } from"next/headers";
import Navigation from"@/components/Navigation";
import FadeContent from"@/components/FadeContent";

const siteUrl ="https://harbor.finance";
const title ="Harbor Protocol";
const description =
"A decentralized protocol for creating synthetic assets pegged to any real-world data feed.";

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
 url:"/demo.png",
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
 creator:"@HarborFi",
 site:"@HarborFi",
 images: [`${siteUrl}/demo.png`],
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
<html lang="en">
<body
className={`antialiased font-sans bg-[#1E4775] text-white relative`}
>
<div className="relative z-10">
 <ContextProvider cookies={cookies}>
 <Navigation />
 <FadeContent
 blur={false}
 duration={500}
 easing="ease-out"
 initialOpacity={0}
 >
 {children}
 </FadeContent>
 </ContextProvider>
 </div>
 </body>
 </html>
 );
}
