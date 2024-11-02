"use client";

import React, { useState } from "react";
import { ethers } from "ethers";
import { fetchABI, getContractInstance } from "@/utils/contract";
import styles from "./Interaction.module.css"; // Ensure you have a CSS module for styling
import { useKlaster } from "@/utils/KlasterContext";
import {
  buildMultichainReadonlyClient,
  buildTokenMapping,
  MultichainTokenMapping,
  MultichainClient,
  deployment,
  encodeBridgingOps,
  rawTx,
  getTokenAddressForChainId,
  buildItx,
  singleTx,
} from "klaster-sdk";
import { parseUnits, encodeFunctionData, erc20Abi } from "viem";
import { liFiBrigePlugin } from "./Plugin";
import { acrossBridgePlugin } from "./across-bridge-plugin";
import { nitroBridgePlugin } from "./nitro-bridge-plugin";
import {
  arbitrum,
  base,
  optimism,
  polygon,
  scroll,
  optimismSepolia,
  arbitrumSepolia,
  sepolia,
  baseSepolia,
} from "viem/chains";
import { useWalletClient } from "wagmi";

const Interaction: React.FC = () => {
  const { klaster } = useKlaster();
  const [contractAddress, setContractAddress] = useState<string>("");
  const [selectedChain, setSelectedChain] = useState<string>("Sepolia");
  const [abi, setAbi] = useState<any[]>([]);
  const [error, setError] = useState<string>("");
  const [provider, setProvider] =
    useState<ethers.providers.Web3Provider | null>(null);
  const [contract, setContract] = useState<ethers.Contract | null>(null);
  const [inputValues, setInputValues] = useState<{ [key: string]: any }>({});
  const { data: signer } = useWalletClient();

  const chains = [
    { name: "Ethereum", api: "https://api.etherscan.io/api" },
    { name: "Sepolia", api: "https://api-sepolia.etherscan.io/api" },
    { name: "Polygon", api: "https://api.polygonscan.com/api" },
    // Add more chains as needed
  ];

  const handleFetchABI = async () => {
    const selectedChainData = chains.find(
      (chain) => chain.name === selectedChain
    );

    if (!selectedChainData) {
      setError(`Invalid chain selected: ${selectedChain}`);
      return;
    }

    try {
      // Fetch ABI using the chain's API endpoint and contract address
      const abi = await fetchABI(
        selectedChainData.api,
        contractAddress,
        "CRENXHXC69WUFZQVYP1I5QTMG5ZXH8P3Z8"
      );
      setAbi(abi);
      setError(""); // Clear any previous errors

      // Initialize ethers provider and contract instance
      //@ts-ignore
      const web3Provider = new ethers.providers.Web3Provider(window.ethereum);
      await web3Provider.send("eth_requestAccounts", []);
      const signer = web3Provider.getSigner();
      const contractInstance = getContractInstance(
        contractAddress,
        abi,
        signer
      );
      setProvider(web3Provider);
      setContract(contractInstance);
    } catch (err) {
      setError(`Failed to fetch ABI: ${err}`);
    }
  };

  const handleInputChange = (
    functionName: string,
    inputName: string,
    value: any
  ) => {
    setInputValues((prev) => ({
      ...prev,
      [functionName]: {
        ...prev[functionName],
        [inputName]: value,
      },
    }));
  };

  const handleFunctionCall = async (functionName: string, inputs: any[]) => {
    if (!contract) {
      setError("Contract is not initialized");
      return;
    }

    const params = inputs.map(
      (input: any) => inputValues[functionName]?.[input.name] || ""
    );

    // Check if the function is payable and handle the value accordingly
    const isPayable = inputs.some((input: any) => input.type === "payable");
    console.log("isPayable: ", isPayable);

    try {
      const tx = isPayable
        ? await contract[functionName](...params, {
            value: ethers.utils.parseEther(
              inputValues[functionName]?.value || "0"
            ),
          })
        : await contract[functionName](...params);
      await tx.wait();
      console.log("Transaction successful", tx);
    } catch (err) {
      setError(`Failed to execute function: ${err}`);
    }
  };

  async function setupKluster() {
    console.log(klaster.account.uniqueAddresses[0]);

    const mcClient = buildMultichainReadonlyClient(
      [
        optimism,
        base,
        polygon,
        arbitrum,
        scroll,
        optimismSepolia,
        arbitrumSepolia,
        baseSepolia,
        sepolia,
      ].map((x) => {
        return {
          chainId: x.id,
          rpcUrl: x.rpcUrls.default.http[0],
        };
      })
    );

    // const mcUSDC = buildTokenMapping([
    //   deployment(optimism.id, "0x0b2c639c533813f4aa9d7837caf62653d097ff85"),
    //   deployment(arbitrum.id, "0xaf88d065e77c8cC2239327C5EDb3A432268e5831"),
    // ]);

    const mcUSDC = buildTokenMapping([
      deployment(optimism.id, "0x0b2c639c533813f4aa9d7837caf62653d097ff85"),
      deployment(base.id, "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"),
      deployment(arbitrum.id, "0xaf88d065e77c8cC2239327C5EDb3A432268e5831"),
      deployment(polygon.id, "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174"),
    ]);

    const intersectTokenAndClients = (
      token: MultichainTokenMapping,
      mcClient: MultichainClient
    ) => {
      return token.filter((deployment) =>
        mcClient.chainsRpcInfo
          .map((info) => info.chainId)
          .includes(deployment.chainId)
      );
    };

    // Store the intersection of the Klaster provided token and the chains your project is using.
    const mUSDC = intersectTokenAndClients(mcUSDC, mcClient);
    const uBalance = await mcClient.getUnifiedErc20Balance({
      tokenMapping: mUSDC,
      account: klaster.account,
    });

    console.log(uBalance.balance);
    console.log(uBalance.breakdown); // Breakdown of balances across each separate blockchain

    const bridgingOps = await encodeBridgingOps({
      tokenMapping: mUSDC,
      account: klaster.account,
      amount: uBalance.balance, // Don't send entire balance
      bridgePlugin: acrossBridgePlugin,
      client: mcClient,
      destinationChainId: polygon.id,
      unifiedBalance: uBalance,
    });

    console.log(bridgingOps);
    const recipient = "0xC881EE0FB15933E15cBD55338f01B2BC92D5532E";
    const destChainTokenAddress = getTokenAddressForChainId(mUSDC, polygon.id)!;
    const sendERC20Op = rawTx({
      gasLimit: 100000n,
      to: destChainTokenAddress,
      data: encodeFunctionData({
        abi: erc20Abi,
        functionName: "transfer",
        args: [recipient, bridgingOps.totalReceivedOnDestination],
      }),
    });

    const iTx = buildItx({
      steps: bridgingOps.steps.concat(singleTx(polygon.id, sendERC20Op)),
      feeTx: klaster.encodePaymentFee(base.id, "USDC"),
    });

    const quote = await klaster.getQuote(iTx);
    console.log("quote: ", quote.itxHash);

    const signed = await signer?.signMessage({
      message: {
        raw: quote.itxHash,
      },
      account: klaster.account.uniqueAddresses[0],
    });

    const result = await klaster.execute(quote, signed);
    console.log("result: ", result);
  }

  return (
    <div className={styles.container}>
      <button onClick={setupKluster}>klas</button>
      <h1 className={styles.title}>NFT Contract Interaction</h1>
      <input
        className={styles.inputElement}
        type="text"
        placeholder="NFT Contract Address"
        value={contractAddress}
        onChange={(e) => setContractAddress(e.target.value)}
      />
      <select
        className={styles.selectElement}
        onChange={(e) => setSelectedChain(e.target.value)}
        value={selectedChain}
      >
        {chains.map((chain) => (
          <option key={chain.name} value={chain.name}>
            {chain.name}
          </option>
        ))}
      </select>
      <button className={styles.button} onClick={handleFetchABI}>
        Fetch ABI
      </button>

      {error && <p style={{ color: "red" }}>{error}</p>}

      {abi.length > 0 && (
        <div>
          <h2>Functions</h2>
          <div className={styles.functionsContainer}>
            {abi.map((item: any) =>
              item.type === "function" &&
              item.stateMutability === "nonpayable" ? (
                <div key={item.name} className={styles.functionBlock}>
                  <h3>{item.name}</h3>

                  {/* Dynamically render input fields for function arguments */}
                  {item.inputs.length > 0 && (
                    <div>
                      {item.inputs.map((input: any) => (
                        <input
                          key={input.name}
                          type="text"
                          placeholder={`${input.name} (${input.type})`}
                          onChange={(e) =>
                            handleInputChange(
                              item.name,
                              input.name,
                              e.target.value
                            )
                          }
                          className={styles.inputElement}
                        />
                      ))}
                    </div>
                  )}

                  <button
                    onClick={() => handleFunctionCall(item.name, item.inputs)}
                    className={styles.button}
                  >
                    {item.name}
                  </button>
                </div>
              ) : null
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Interaction;
