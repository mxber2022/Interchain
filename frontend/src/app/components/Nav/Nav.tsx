"use client";
import styles from "./Nav.module.css";
import Link from "next/link";
import { useAccount } from "wagmi";
import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import "@rainbow-me/rainbowkit/styles.css";
import { useKlaster } from "@/utils/KlasterContext";

function Nav() {
  const { address, isConnected } = useAccount();
  const { klaster } = useKlaster();

  const uniqueAddress =
    klaster?.account?.uniqueAddresses?.values().next().value || "Loading...";

  return (
    <nav className={styles.nav}>
      <div className={styles.nav__container}>
        <div className={styles.nav__left}>
          <div>
            <Link href="/" style={{ color: "black", textDecoration: "none" }}>
              <div className={`${styles.nav__logo} rajdhani-bold`}>
                TokenFlex
              </div>
            </Link>
          </div>

          <div>
            <Link
              href="/donate"
              style={{
                color: "black",
                textDecoration: "none",
              }}
            >
              {" "}
            </Link>
          </div>

          <div>
            <Link
              href=""
              style={{
                color: "black",
                textDecoration: "none",
              }}
            >
              AAWallet: {uniqueAddress}
            </Link>
          </div>
        </div>
        <div className={styles.nav__right}>
          <ConnectButton />
        </div>
      </div>
    </nav>
  );
}

export default Nav;
