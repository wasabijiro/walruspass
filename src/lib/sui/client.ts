import { getFullnodeUrl } from "@mysten/sui.js/client";

export const networks = {
  testnet: { url: getFullnodeUrl("testnet") },
  mainnet: { url: getFullnodeUrl("mainnet") },
};
