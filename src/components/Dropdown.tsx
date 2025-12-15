"use client";

import { useState, useRef, useEffect, ReactNode } from "react";

interface Option {
 value: string;
 label: string;
}

interface DropdownProps {
 options: Option[];
 value: string;
 onChange: (value: string) => void;
 trigger: ReactNode;
}

export default function Dropdown({
 options,
 value,
 onChange,
 trigger,
}: DropdownProps) {
 const [isOpen, setIsOpen] = useState(false);
 const dropdownRef = useRef<HTMLDivElement>(null);

 const handleToggle = () => setIsOpen(!isOpen);

 const handleSelect = (optionValue: string) => {
 onChange(optionValue);
 setIsOpen(false);
 };

 useEffect(() => {
 const handleClickOutside = (event: MouseEvent) => {
 if (
 dropdownRef.current &&
 !dropdownRef.current.contains(event.target as Node)
 ) {
 setIsOpen(false);
 }
 };

 document.addEventListener("mousedown", handleClickOutside);
 return () => {
 document.removeEventListener("mousedown", handleClickOutside);
 };
 }, []);

 return (
 <div className="relative" ref={dropdownRef}>
 <div onClick={handleToggle} className="cursor-pointer">
 {trigger}
 </div>

 {isOpen && (
 <div className="absolute z-10 mt-2 w-56 origin-top-right right-0 bg-gray-900 border border-gray-700 shadow-xl focus:outline-none">
 <div
 className="p-1"
 role="menu"
 aria-orientation="vertical"
 aria-labelledby="options-menu"
 >
 {options.map((option) => (
 <button
 key={option.value}
 onClick={() => handleSelect(option.value)}
 className="w-full text-left flex justify-between items-center px-4 py-2 text-sm text-white hover:bg-gray-800 transition-colors"
 role="menuitem"
 >
 <span>{option.label}</span>
 {value === option.value && (
 <svg
 className="w-5 h-5 text-harbor"
 xmlns="http://www.w3.org/2000/svg"
 viewBox="0 0 20 20"
 fill="currentColor"
 aria-hidden="true"
 >
 <path
 fillRule="evenodd"
 d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
 clipRule="evenodd"
 />
 </svg>
 )}
 </button>
 ))}
 </div>
 </div>
 )}
 </div>
 );
}
