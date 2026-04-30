import { getWeb3iconsNetworkId } from "@/config/web3iconsNetworks";

export type ChainLike = {
  chain?: {
    name?: string;
    logo?: string;
  };
};

export type NetworkFilterOption = {
  id: string;
  label: string;
  iconUrl?: string;
  networkId?: string;
};

const DEFAULT_CHAIN_NAME = "Ethereum";
const DEFAULT_CHAIN_LOGO = "icons/eth.png";

export function getMarketChainName(market: ChainLike): string {
  return market.chain?.name || DEFAULT_CHAIN_NAME;
}

export function buildNetworkFilterOptions<T>(
  items: T[],
  getMarket: (item: T) => ChainLike
): NetworkFilterOption[] {
  const seen = new Set<string>();
  const options: NetworkFilterOption[] = [];

  items.forEach((item) => {
    const market = getMarket(item);
    const name = getMarketChainName(market);
    if (seen.has(name)) return;
    seen.add(name);

    const logo = market.chain?.logo || DEFAULT_CHAIN_LOGO;
    const networkId = getWeb3iconsNetworkId(name);

    options.push({
      id: name,
      label: name,
      iconUrl: networkId
        ? undefined
        : logo.startsWith("/")
          ? logo
          : `/${logo}`,
      networkId,
    });
  });

  return options.sort((a, b) => a.label.localeCompare(b.label));
}

export function filterBySelectedNetworks<T>(
  items: T[],
  selectedNetworks: string[],
  getMarket: (item: T) => ChainLike
): T[] {
  if (selectedNetworks.length === 0) return items;
  return items.filter((item) =>
    selectedNetworks.includes(getMarketChainName(getMarket(item)))
  );
}

