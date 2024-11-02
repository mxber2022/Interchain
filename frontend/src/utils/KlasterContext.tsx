"use client";
import React, { createContext, useContext, useEffect, useState } from "react";
import { initKlaster, loadBicoV2Account, klasterNodeHost } from "klaster-sdk";
import { useAccount } from "wagmi";
import { Address } from "viem";

// Define KlasterContextType (replace 'any' with the actual type if available)
interface KlasterContextType {
  klaster: any | null; // Replace 'any' with the actual type of klaster if you know it
}

const KlasterContext = createContext<KlasterContextType | undefined>(undefined);

export const KlasterProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [klaster, setKlaster] = useState<any | null>(null); // Use the actual type instead of 'any'
  const { address } = useAccount();
  console.log("address: ", address);

  useEffect(() => {
    if (address) {
      console.log("useEffect triggered with address: ", address);
      const initializeKlaster = async () => {
        try {
          const accountInitData = loadBicoV2Account({
            owner: address as Address,
          });

          const klasterInstance = await initKlaster({
            accountInitData,
            nodeUrl: klasterNodeHost.default,
          });

          console.log("klasterInstance: ", klasterInstance);
          setKlaster(klasterInstance);
        } catch (error) {
          console.error("Failed to initialize klaster:", error);
        }
      };

      initializeKlaster();
    }
  }, [address]); // Added 'address' to the dependency array

  return (
    <KlasterContext.Provider value={{ klaster }}>
      {children}
    </KlasterContext.Provider>
  );
};

// Custom hook for using KlasterContext
export const useKlaster = () => {
  const context = useContext(KlasterContext);
  if (context === undefined) {
    throw new Error("useKlaster must be used within a KlasterProvider");
  }
  return context;
};
