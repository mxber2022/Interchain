import { ethers } from "ethers";

/**
 * Fetch the ABI from the selected chain's API.
 */
export const fetchABI = async (
  apiUrl: string,
  contractAddress: string,
  apiKey: string
): Promise<any[]> => {
  const url = `${apiUrl}?module=contract&action=getabi&address=${contractAddress}&apikey=${apiKey}`;

  const response = await fetch(url);
  const data = await response.json();

  if (data.status !== "1") {
    throw new Error(data.result || "Failed to fetch ABI");
  }

  return JSON.parse(data.result);
};

/**
 * Get a contract instance from the ABI and signer.
 */
export const getContractInstance = (
  contractAddress: string,
  abi: any[],
  signer: ethers.Signer
) => {
  return new ethers.Contract(contractAddress, abi, signer);
};
