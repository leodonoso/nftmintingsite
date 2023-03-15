import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider, WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';
import type { FC, ReactNode } from 'react';
import React, { useMemo } from 'react';

import greeksGif from '../public/cool-cats.gif';
import phase2Header from '../public/phase-2-wl-token-header.png';
import MintButton from './MintButton';

export const App: FC = () => {
    return (
        <Context>
            <Content />
        </Context>
    );
};

const Context: FC<{ children: ReactNode }> = ({ children }) => {
    // The network can be set to 'devnet', 'testnet', or 'mainnet-beta'.
    const network = WalletAdapterNetwork.Devnet;

    // You can also provide a custom RPC endpoint.
    const endpoint = useMemo(() => clusterApiUrl(network), [network]);

    const wallets = useMemo(
        () => [
            new PhantomWalletAdapter,
            new SolflareWalletAdapter
        ],
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [network]
    );

    return (
        <ConnectionProvider endpoint={endpoint}>
            <WalletProvider wallets={wallets} autoConnect>
                <WalletModalProvider>{children}</WalletModalProvider>
            </WalletProvider>
        </ConnectionProvider>
    );
};

const Content: FC = () => {
    return (
    <>
        <nav className='nav'>
            <div className='div'>
                <WalletMultiButton />
            </div>
        </nav>
        <section className='mint'>
            <div className='card'>
                <img className='header' src={phase2Header} alt="Phase 2 Whitelist Token Mint" />
                <div className='img-container'>
                    <img className='greeks' src={greeksGif} alt="NFTs to Mint" />
                </div>
                <MintButton />
            </div>
        </section>
    </>
    );
};