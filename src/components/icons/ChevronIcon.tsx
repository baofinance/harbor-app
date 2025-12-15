import { ChevronDownIcon } from "@heroicons/react/24/outline";

export function ChevronIcon({
 expanded,
 className ="",
 }: {
 expanded: boolean;
 className?: string;
}) {
 return (
 <ChevronDownIcon
 className={`${className} transition-transform duration-200 ${
 expanded ?"rotate-180" :""
 }`}
 />
 );
}
