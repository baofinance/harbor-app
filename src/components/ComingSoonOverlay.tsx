import { ReactNode } from "react";

interface ComingSoonOverlayProps {
 children: ReactNode;
 className?: string;
}

export default function ComingSoonOverlay({
 children,
 className ="",
}: ComingSoonOverlayProps) {
 return (
 <div className={`relative ${className}`}>
 {children}
 <div className="absolute inset-0 bg-black/50 flex items-center justify-center cursor-not-allowed">
 <span className="text-white font-medium tracking-wider">
 Coming Soon
 </span>
 </div>
 </div>
 );
}
