"use client";

import { createConfig, http } from "wagmi";
import { arbitrumSepolia } from "wagmi/chains";
import { injected } from "wagmi/connectors";

const alchemyApiKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
const alchemyPolicyId = process.env.NEXT_PUBLIC_ALCHEMY_POLICY_ID;

if (!alchemyApiKey) {
  throw new Error("NEXT_PUBLIC_ALCHEMY_API_KEY is not set");
}

// Construct Alchemy RPC URL
const alchemyUrl = alchemyPolicyId
  ? `https://arb-sepolia.g.alchemy.com/v2/${alchemyApiKey}?policyId=${alchemyPolicyId}`
  : `https://arb-sepolia.g.alchemy.com/v2/${alchemyApiKey}`;

export const wagmiConfig = createConfig({
  chains: [arbitrumSepolia],
  connectors: [injected()],
  transports: {
    [arbitrumSepolia.id]: http(alchemyUrl),
  },
});

