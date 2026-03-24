export interface SailMarketPnLData {
  costBasis: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  realizedPnL: number;
  isLoading: boolean;
  error?: string;
}
