"use client";

import React from"react";
import * as Select from"@radix-ui/react-select";
import {
 ChevronDown,
 ChevronUp,
 DollarSign,
 Euro,
 JapaneseYen,
 PoundSterling,
} from"lucide-react";

export type CurrencyCode ="USD" |"EUR" |"JPY" |"GBP";

export type CurrencyOption = {
 code: CurrencyCode;
 label: string;
 symbol: string;
};

const IconFor: Record<CurrencyCode, React.ReactNode> = {
 USD: <DollarSign className="w-3.5 h-3.5" />,
 EUR: <Euro className="w-3.5 h-3.5" />,
 JPY: <JapaneseYen className="w-3.5 h-3.5" />,
 GBP: <PoundSterling className="w-3.5 h-3.5" />,
};

interface Props {
 value: CurrencyCode;
 onValueChange: (v: CurrencyCode) => void;
 options: CurrencyOption[];
}

export default function CurrencySelect({
 value,
 onValueChange,
 options,
}: Props) {
 const current = options.find((o) => o.code === value);
 return (
 <Select.Root
 value={value}
 onValueChange={(v) => onValueChange(v as CurrencyCode)}
 >
 <Select.Trigger className="inline-flex items-center justify-between gap-4 bg-zinc-900/60 hover:outline-white/20 text-white text-xs px-2 py-1.5 min-w-[120px] h-8 whitespace-nowrap">
 <div className="inline-flex items-center gap-4">
 <span className="text-white/80 flex items-center justify-center">
 {IconFor[value as CurrencyCode]}
 </span>
 <span className="text-white/90">{current?.label ?? value}</span>
 </div>
 <Select.Icon>
 <ChevronDown className="w-3.5 h-3.5 text-white/60" />
 </Select.Icon>
 </Select.Trigger>
 <Select.Portal>
 <Select.Content
 position="popper"
 side="bottom"
 align="end"
 sideOffset={6}
 className="z-50 overflow-hidden bg-gray-900 border border-gray-700 shadow-xl"
 >
 <Select.ScrollUpButton className="flex items-center justify-center h-6 text-white/60">
 <ChevronUp className="w-4 h-4" />
 </Select.ScrollUpButton>
 <Select.Viewport className="p-1 min-w-[140px]">
 {options.map((opt) => (
 <Select.Item
 key={opt.code}
 value={opt.code}
 className="relative flex items-center gap-4 select-none px-2 py-1.5 text-xs text-white/90 data-[highlighted]:bg-white/10 data-[highlighted]:outline-none"
 >
 <span className="text-white/80 flex items-center justify-center">
 {IconFor[opt.code]}
 </span>
 <Select.ItemText>{opt.label}</Select.ItemText>
 </Select.Item>
 ))}
 </Select.Viewport>
 <Select.ScrollDownButton className="flex items-center justify-center h-6 text-white/60">
 <ChevronDown className="w-4 h-4" />
 </Select.ScrollDownButton>
 </Select.Content>
 </Select.Portal>
 </Select.Root>
 );
}
