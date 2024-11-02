"use client";

import React, { useState } from "react";
import { ethers } from "ethers";
import { fetchABI, getContractInstance } from "@/utils/contract";
import styles from "./Interaction.module.css";

const Interaction: React.FC = () => {
  const [contractAddress, setContractAddress] = useState<string>("");
  const [selectedChain, setSelectedChain] = useState<string>("Sepolia");
  const [abi, setAbi] = useState<any[]>([]);
  const [error, setError] = useState<string>("");
  const [provider, setProvider] =
    useState<ethers.providers.Web3Provider | null>(null);
  const [contract, setContract] = useState<ethers.Contract | null>(null);
  const [inputValues, setInputValues] = useState<{ [key: string]: any }>({});

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
      const abi = await fetchABI(
        selectedChainData.api,
        contractAddress,
        "CRENXHXC69WUFZQVYP1I5QTMG5ZXH8P3Z8"
      );
      setAbi(abi);
      setError(""); // Clear any previous errors

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

    try {
      const tx = await contract[functionName](...params);
      await tx.wait();
      console.log("Transaction successful", tx);
    } catch (err) {
      setError(`Failed to execute function: ${err}`);
    }
  };

  return (
    <div>
      <h1>NFT Contract Interaction</h1>
      <input
        className={styles.inputElement}
        type="text"
        placeholder="NFT Contract Address"
        value={contractAddress}
        onChange={(e) => setContractAddress(e.target.value)}
      />
      <select
        className={styles.inputElement}
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

      {error && <p className={styles.error}>{error}</p>}

      {abi.length > 0 && (
        <div>
          <h2>Functions</h2>
          {abi.map((item: any) =>
            item.type === "function" &&
            item.stateMutability === "nonpayable" ? (
              <div key={item.name} className={styles.functionBlock}>
                <h3>{item.name}</h3>

                {item.inputs.length > 0 && (
                  <div>
                    {item.inputs.map((input: any) => (
                      <input
                        key={input.name}
                        className={styles.inputElement}
                        type="text"
                        placeholder={`${input.name} (${input.type})`}
                        onChange={(e) =>
                          handleInputChange(
                            item.name,
                            input.name,
                            e.target.value
                          )
                        }
                      />
                    ))}
                  </div>
                )}

                <button
                  className={styles.button}
                  onClick={() => handleFunctionCall(item.name, item.inputs)}
                >
                  Call {item.name}
                </button>
              </div>
            ) : null
          )}
        </div>
      )}
    </div>
  );
};

export default Interaction;
