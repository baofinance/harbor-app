import { type Address } from "viem";

export const REFERRAL_DOMAIN = {
  name: "Harbor Referral",
  version: "1",
  chainId: 1,
} as const;

export type ReferralCodeCreateMessage = {
  referrer: Address;
  nonce: string;
  label: string;
};

export type ReferralBindMessage = {
  referred: Address;
  code: string;
  nonce: string;
};

export const REFERRAL_CODE_CREATE_TYPES = {
  ReferralCodeCreate: [
    { name: "referrer", type: "address" },
    { name: "nonce", type: "string" },
    { name: "label", type: "string" },
  ],
} as const;

export const REFERRAL_BIND_TYPES = {
  ReferralBind: [
    { name: "referred", type: "address" },
    { name: "code", type: "string" },
    { name: "nonce", type: "string" },
  ],
} as const;

export function buildReferralCodeCreateTypedData(message: ReferralCodeCreateMessage) {
  return {
    domain: REFERRAL_DOMAIN,
    primaryType: "ReferralCodeCreate",
    types: REFERRAL_CODE_CREATE_TYPES,
    message,
  } as const;
}

export function buildReferralBindTypedData(message: ReferralBindMessage) {
  return {
    domain: REFERRAL_DOMAIN,
    primaryType: "ReferralBind",
    types: REFERRAL_BIND_TYPES,
    message,
  } as const;
}
