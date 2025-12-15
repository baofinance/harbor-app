"use client";
import { useEffect, useState, ReactNode } from "react";

interface FadeContentProps {
 children: ReactNode;
 blur?: boolean;
 duration?: number;
 easing?: string;
 delay?: number;
 threshold?: number;
 initialOpacity?: number;
 className?: string;
}

const FadeContent: React.FC<FadeContentProps> = ({
 children,
 blur = false,
 duration = 1000,
 easing ="ease-out",
 delay = 0,
 threshold = 0.1,
 initialOpacity = 0,
 className ="",
}) => {
 const [inView, setInView] = useState(false);

 useEffect(() => {
 // Simple fade-in on mount - no intersection observer needed for layout content
 const timer = setTimeout(() => {
 setInView(true);
 }, delay);

 return () => {
 clearTimeout(timer);
 };
 }, [delay]);

 return (
 <div
 className={className}
 style={{
 opacity: inView ? 1 : initialOpacity,
 transition: `opacity ${duration}ms ${easing}, filter ${duration}ms ${easing}`,
 filter: blur ? (inView ?"blur(0px)" :"blur(10px)") :"none",
 }}
 >
 {children}
 </div>
 );
};

export default FadeContent;
