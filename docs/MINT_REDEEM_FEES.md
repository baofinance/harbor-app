# Harbor Protocol: Mint & Redeem Fees by Collateral Ratio Bands

This document shows the fee structure for all production markets based on collateral ratio bands.

**Last Updated:** 2026-01-05

---

## ETH/fxUSD

**Minter Contract:** [0xd6E2F8e57b4aFB51C6fA4cbC012e1cE6aEad989F](https://etherscan.io/address/0xd6E2F8e57b4aFB51C6fA4cbC012e1cE6aEad989F)

**Current Collateral Ratio:** 196.46%

### Mint Pegged Token (haETH/haBTC) Fees

| Collateral Ratio Range | Fee |
|------------------------|-----|
| 0.00% - 131.00% | 100.0000% |
| 131.00% - 140.00% | 1.0000% |
| ≥ 140.00% | 0.5000% |

### Redeem Pegged Token (haETH/haBTC) Fees

| Collateral Ratio Range | Fee |
|------------------------|-----|
| 0.00% - 100.00% | Not Allowed |
| 100.00% - 110.00% | Not Allowed |
| 110.00% - 120.00% | 0.0000% |
| 120.00% - 140.00% | 0.6000% |
| ≥ 140.00% | 0.8000% |

### Mint Leveraged Token (hsFXUSD-ETH/hsFXUSD-BTC/hsSTETH-BTC) Fees

| Collateral Ratio Range | Fee |
|------------------------|-----|
| 0.00% - 100.00% | Not Allowed |
| 100.00% - 110.00% | Not Allowed |
| 110.00% - 120.00% | 0.0000% |
| 120.00% - 140.00% | 2.0000% |
| ≥ 140.00% | 7.0000% |

### Redeem Leveraged Token (hsFXUSD-ETH/hsFXUSD-BTC/hsSTETH-BTC) Fees

| Collateral Ratio Range | Fee |
|------------------------|-----|
| 0.00% - 110.00% | 100.0000% |
| 110.00% - 140.00% | 1.5000% |
| ≥ 140.00% | 1.2000% |

---

## BTC/fxUSD

**Minter Contract:** [0x33e32ff4d0677862fa31582CC654a25b9b1e4888](https://etherscan.io/address/0x33e32ff4d0677862fa31582CC654a25b9b1e4888)

**Current Collateral Ratio:** 195.62%

### Mint Pegged Token (haETH/haBTC) Fees

| Collateral Ratio Range | Fee |
|------------------------|-----|
| 0.00% - 131.00% | 100.0000% |
| 131.00% - 140.00% | 1.0000% |
| ≥ 140.00% | 0.5000% |

### Redeem Pegged Token (haETH/haBTC) Fees

| Collateral Ratio Range | Fee |
|------------------------|-----|
| 0.00% - 100.00% | Not Allowed |
| 100.00% - 110.00% | Not Allowed |
| 110.00% - 120.00% | 0.0000% |
| 120.00% - 140.00% | 0.6000% |
| ≥ 140.00% | 0.8000% |

### Mint Leveraged Token (hsFXUSD-ETH/hsFXUSD-BTC/hsSTETH-BTC) Fees

| Collateral Ratio Range | Fee |
|------------------------|-----|
| 0.00% - 100.00% | Not Allowed |
| 100.00% - 110.00% | Not Allowed |
| 110.00% - 120.00% | 0.0000% |
| 120.00% - 140.00% | 2.0000% |
| ≥ 140.00% | 7.0000% |

### Redeem Leveraged Token (hsFXUSD-ETH/hsFXUSD-BTC/hsSTETH-BTC) Fees

| Collateral Ratio Range | Fee |
|------------------------|-----|
| 0.00% - 110.00% | 100.0000% |
| 110.00% - 140.00% | 1.5000% |
| ≥ 140.00% | 1.2000% |

---

## BTC/stETH

**Minter Contract:** [0xF42516EB885E737780EB864dd07cEc8628000919](https://etherscan.io/address/0xF42516EB885E737780EB864dd07cEc8628000919)

**Current Collateral Ratio:** 195.44%

### Mint Pegged Token (haETH/haBTC) Fees

| Collateral Ratio Range | Fee |
|------------------------|-----|
| 0.00% - 131.00% | 100.0000% |
| 131.00% - 140.00% | 1.0000% |
| ≥ 140.00% | 0.5000% |

### Redeem Pegged Token (haETH/haBTC) Fees

| Collateral Ratio Range | Fee |
|------------------------|-----|
| 0.00% - 100.00% | Not Allowed |
| 100.00% - 110.00% | Not Allowed |
| 110.00% - 120.00% | 0.0000% |
| 120.00% - 140.00% | 0.6000% |
| ≥ 140.00% | 0.8000% |

### Mint Leveraged Token (hsFXUSD-ETH/hsFXUSD-BTC/hsSTETH-BTC) Fees

| Collateral Ratio Range | Fee |
|------------------------|-----|
| 0.00% - 100.00% | Not Allowed |
| 100.00% - 110.00% | Not Allowed |
| 110.00% - 120.00% | 0.0000% |
| 120.00% - 140.00% | 2.0000% |
| ≥ 140.00% | 7.0000% |

### Redeem Leveraged Token (hsFXUSD-ETH/hsFXUSD-BTC/hsSTETH-BTC) Fees

| Collateral Ratio Range | Fee |
|------------------------|-----|
| 0.00% - 110.00% | 100.0000% |
| 110.00% - 140.00% | 1.5000% |
| ≥ 140.00% | 1.2000% |

---

## Notes

- Fees are dynamic and depend on the current collateral ratio of each market.
- Higher collateral ratios = lower fees (incentivizes minting when ratio is high).
- Lower collateral ratios = higher fees (incentivizes redeeming when ratio is low).
- Fees are calculated based on which collateral ratio band the current ratio falls into.
- The current collateral ratio shown is the ratio at the time this document was generated.
- "Not Allowed" indicates that the operation is effectively blocked at that collateral ratio (fee is set to maximum uint256).

