import React, { useCallback }  from 'react';
import { Metaplex, walletAdapterIdentity, bundlrStorage } from "@metaplex-foundation/js";
import { WalletNotConnectedError } from '@solana/wallet-adapter-base';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Keypair, ParsedAccountData, PublicKey, sendAndConfirmTransaction, SystemProgram, Transaction } from '@solana/web3.js';
import { createAssociatedTokenAccountInstruction, createMintToInstruction, createTransferInstruction, getAssociatedTokenAddress, getOrCreateAssociatedTokenAccount, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { MICKEYS_ARRAY } from '../public/mickeys'

const MINT_ADDRESS_FAKE_GREEKS = 'Bgskavu2mHHyKjzGHvXz12bxKWmsR9PSRGEaA7Tz6b8H';
const MINT_ADDRESS_WHITELIST = '7i1U974Ln84S4uBGTfWJD9EKf11AxWAWtuj9pNn34NKv';
const TRANSFER_AMOUNT = 10;

function MintButton() {

  // Declare booleans to check if user can mint
  let hasGreekNFT = false;
  let hasGreekTokens = false;
  let isMickey = false;

  const { connection } = useConnection();
  const { wallet, sendTransaction } = useWallet();

  async function getNumberDecimals(mintAddress: string):Promise<number> {
      const info = await connection.getParsedAccountInfo(new PublicKey(mintAddress));
      const result = (info.value?.data as ParsedAccountData).parsed.info.decimals as number;
      return result;
  }

  // Define function to check if user has a greek NFT
  async function checkIfTokenIsGreekNFT(accountData: {
    "isNative": boolean,
    "mint": string,
    "owner": string,
    "state": string,
    "tokenAmount": {
      "amount": string,
      "decimals": number,
      "uiAmount": number,
      "uiAmountString": string
    }
  }) {
      if (!wallet) {
        return
      }

      const metaplex = Metaplex.make(connection).use(walletAdapterIdentity(wallet.adapter)).use(bundlrStorage())

      const nft = await metaplex.nfts().findByMint({mintAddress: new PublicKey(accountData['mint'])})
      
      if(!nft.collection) {
        return false
      }
  
      if (nft.collection.address.toBase58() === 'DDMrUempSmfDuzSK2YDQKpKHoGF9Sr8ch2bFj9nhvCkq') {
        console.log('You have a fake greek NFT!')
        for (const mickey of MICKEYS_ARRAY) {
          if (nft.json?.name?.includes(mickey)) {
            isMickey = true
            console.log('This NFT is a Mickey! ', isMickey)
          }
        }
        return true
      }
      else {
        console.log("You don't have a fake greek!")
        return false
      }
    }

  const mintWhitelist = useCallback(async () => {
    if (!wallet) throw new WalletNotConnectedError();

    const USER_WALLET = wallet.adapter.publicKey?.toBase58()

    if (!USER_WALLET) {
        return
    }

    const accounts = await connection.getParsedProgramAccounts(
        TOKEN_PROGRAM_ID,
        {
          filters: [
            {
              dataSize: 165, // number of bytes
            },
            {
              memcmp: {
                offset: 32, // number of bytes
                bytes: USER_WALLET,
              },
            },
          ],
        }
      );
    
      console.log(
        `Found ${accounts.length} token account(s) for wallet ${USER_WALLET}: `
      );
    

    for(const account of accounts) {
        // Console Log All the Accounts for the owner wallet
        
        const accountData: {
            "isNative": boolean,
            "mint": string,
            "owner": string,
            "state": string,
            "tokenAmount": {
                "amount": string,
                "decimals": number,
                "uiAmount": number,
                "uiAmountString": string
            }
        } = (account.account.data as ParsedAccountData)["parsed"]["info"];

        console.log(
          `-- Token Account Address: ${account.pubkey.toString()} --`
        );
        console.log(`Mint: ${accountData["mint"]}`);
        console.log(
          `Amount: ${accountData["tokenAmount"]["uiAmount"]}`
        );

        if(hasGreekNFT && hasGreekTokens) {
            break
        }

        // Check for 10 greek tokens
        if (!(accountData['tokenAmount']['uiAmount'] === 1)) {
            if (accountData["mint"] === 'Bgskavu2mHHyKjzGHvXz12bxKWmsR9PSRGEaA7Tz6b8H' && accountData['tokenAmount']['uiAmount'] >= 10) {
              console.log(accountData['tokenAmount']['uiAmount'])
              console.log('Looping through token: ', accountData['mint'])
              console.log('You have enough tokens!')
              hasGreekTokens = true
            } else if (accountData["mint"] === 'Bgskavu2mHHyKjzGHvXz12bxKWmsR9PSRGEaA7Tz6b8H'){
              console.log('Not enough Greek Tokens! You need 10 per mint')
            }
          }

        // Check for greek NFT
        else {
            console.log(accountData['tokenAmount']['uiAmount'])
            console.log('Looping through token: ', accountData['mint'])
            const isTokenAGreek = await checkIfTokenIsGreekNFT(accountData)
            if (isTokenAGreek) {
              hasGreekNFT = true
              console.log('This is a greek NFT')
            }
          }
    }

    let canMintGreeks = hasGreekNFT && hasGreekTokens;
    console.log('Can mint greeks? ', canMintGreeks)

    console.log('Mint a whitelist token!');

    // Test Owner Wallet (My Wallet generated from secret key)
    let secret = Uint8Array.from([142,76,238,199,219,112,249,79,59,212,18,28,214,67,246,50,67,39,75,158,25,119,200,210,72,253,134,49,247,28,248,76,238,120,236,120,200,66,4,107,76,154,109,24,116,225,114,36,189,14,213,160,184,10,141,20,82,190,120,70,109,191,183,239]);

    const ownerWallet = Keypair.fromSecretKey(secret);

    console.log('Owner Wallet: ', ownerWallet.publicKey.toBase58());

    // Whitelist Token Address
    const whitelistAddress = new PublicKey(MINT_ADDRESS_WHITELIST);

    // Test User Wallet
    const userWallet = wallet.adapter.publicKey;

    if (!userWallet) {
        return
    }

    console.log('User Wallet: ', userWallet.toBase58())

    if (canMintGreeks) {
        // Get user Associated Token Address for Whitelist Token or create it

        const userWhitelistATA = await getAssociatedTokenAddress(
            new PublicKey(MINT_ADDRESS_WHITELIST),
            userWallet
        )
        
        // Check if this account exists
        const whitelistAccountInfo = await connection.getAccountInfo(userWhitelistATA);
        const accountExists = whitelistAccountInfo !== null; 
    
        console.log('Account Exists: ', accountExists)

        //Step 1
        console.log(`1 - Getting Source Token Account`);
        let sourceAccount = await getAssociatedTokenAddress(
            new PublicKey(MINT_ADDRESS_FAKE_GREEKS),
            userWallet
        );
        console.log(`    Source Account: ${sourceAccount.toBase58()}`);
    
        //Step 2
        console.log(`2 - Getting Destination Token Account`);
    
        let destinationAccount = await getAssociatedTokenAddress(
          new PublicKey(MINT_ADDRESS_FAKE_GREEKS),
          ownerWallet.publicKey
        )
    
        console.log(`    Destination Account: ${destinationAccount.toBase58()}`);
    
        //Step 3
        console.log(`3 - Fetching Number of Decimals for Mint: ${MINT_ADDRESS_FAKE_GREEKS}`);
        const numberDecimals = await getNumberDecimals(MINT_ADDRESS_FAKE_GREEKS);
        console.log(`    Number of Decimals: ${numberDecimals}`);
    
        //Step 4
        console.log(`4 - Setting Up The Instructions`);
    
        const tx = new Transaction();

        const ixCreateTransfer = createTransferInstruction(
            sourceAccount, // from ATA
            destinationAccount, // to ATA
            userWallet, // owner of the from account
            TRANSFER_AMOUNT * Math.pow(10, numberDecimals)
        )
        
        tx.add(ixCreateTransfer)

        if (!accountExists) {
          const ixCreateWhitelistAccount = createAssociatedTokenAccountInstruction(userWallet, userWhitelistATA, userWallet, new PublicKey(MINT_ADDRESS_WHITELIST))
          tx.add(ixCreateWhitelistAccount)
        }

        const ixMintTo = createMintToInstruction(
            whitelistAddress,
            userWhitelistATA,
            ownerWallet.publicKey,
            1
        )
        
        tx.add(ixMintTo)
    
        const signature = await sendTransaction(tx, connection, {signers: [ownerWallet]});
        
        console.log(
            '\x1b[32m', //Green Text
            `   Transaction Success!🎉`,
            `\n    https://explorer.solana.com/tx/${signature}?cluster=devnet`
        )
    }
  }, [wallet, sendTransaction, connection])

  return (
    <button onClick={mintWhitelist} className='mintBtn'>CLAIM WL TOKEN</button>
  )
}

export default MintButton