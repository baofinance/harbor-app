"use client";

import { useState, useEffect } from "react";

interface TokenIconProps {
 src: string;
 alt: string;
 width: number;
 height: number;
 className?: string;
}

export default function TokenIcon({
 src,
 alt,
 width,
 height,
 className,
}: TokenIconProps) {
 const [imgSrc, setImgSrc] = useState(src);
 const [hasError, setHasError] = useState(false);

 useEffect(() => {
 // Reset error state when src changes
 setHasError(false);
 setImgSrc(src);
 
 // Check if the image exists, otherwise set placeholder
 const image = new window.Image();
 image.src = src;
 image.onload = () => {
   setImgSrc(src);
   setHasError(false);
 };
 image.onerror = () => {
   setImgSrc("/icons/placeholder.svg");
   setHasError(true);
 };
 }, [src]);

 // eslint-disable-next-line @next/next/no-img-element
 return (
 <img
 src={imgSrc}
 alt={alt}
 width={width}
 height={height}
 className={className}
 onError={() => {
   if (!hasError) {
     setImgSrc("/icons/placeholder.svg");
     setHasError(true);
   }
 }}
 />
 );
}
