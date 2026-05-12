"use client";

import { FilterMultiselectDropdown } from "@/components/FilterMultiselectDropdown";
import type { NetworkFilterOption } from "@/utils/networkFilter";

type IndexToolbarNetworkFilterProps = {
  value: string[];
  onChange: (next: string[]) => void;
  options: NetworkFilterOption[];
  minWidthClass?: string;
};

export default function IndexToolbarNetworkFilter({
  value,
  onChange,
  options,
  minWidthClass = "min-w-[235px]",
}: IndexToolbarNetworkFilterProps) {
  return (
    <FilterMultiselectDropdown
      label="Network"
      options={options}
      value={value}
      onChange={onChange}
      allLabel="All networks"
      groupLabel="NETWORKS"
      minWidthClass={minWidthClass}
    />
  );
}

