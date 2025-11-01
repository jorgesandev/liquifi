// Contract addresses (update after deployment)
export const CONTRACTS = {
  INFT: process.env.NEXT_PUBLIC_INFT_CONTRACT_ADDRESS || "",
  VAULT: process.env.NEXT_PUBLIC_VAULT_CONTRACT_ADDRESS || "",
} as const;

// ABIs will be imported from /abi folder after compilation
export const INFT_ABI = [] as const;
export const VAULT_ABI = [] as const;

// Helper to load ABIs dynamically
export async function loadABI(contractName: string) {
  try {
    const abi = await import(`@/abi/${contractName}.json`);
    return abi.default || abi;
  } catch (error) {
    console.warn(`ABI not found for ${contractName}, using empty array`);
    return [];
  }
}

