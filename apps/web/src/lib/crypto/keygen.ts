import * as bip39 from 'bip39';
import { HDKey } from '@scure/bip32';
import { Keypair } from '@solana/web3.js';
import * as bitcoin from 'bitcoinjs-lib';
import { ethers } from 'ethers';

export interface WalletAddresses {
  solana: string;
  bitcoin: string;
  bnb: string;
}

export function generateMnemonic(): string {
  return bip39.generateMnemonic(128);
}

export function validateMnemonic(mnemonic: string): boolean {
  return bip39.validateMnemonic(mnemonic);
}

export async function deriveAddresses(mnemonic: string): Promise<WalletAddresses> {
  const seed = await bip39.mnemonicToSeed(mnemonic);
  const root = HDKey.fromMasterSeed(seed);

  const solKey = root.derive("m/44'/501'/0'/0'");
  if (!solKey.privateKey) {
    throw new Error('No se pudo derivar la clave privada de Solana');
  }
  const solana = Keypair.fromSeed(solKey.privateKey).publicKey.toBase58();

  const { ECPairFactory } = await import('ecpair');
  const ecc = await import('tiny-secp256k1');
  const ECPair = ECPairFactory(ecc);

  const btcKey = root.derive("m/44'/0'/0'/0/0");
  if (!btcKey.privateKey) {
    throw new Error('No se pudo derivar la clave privada de Bitcoin');
  }
  const btcPair = ECPair.fromPrivateKey(Buffer.from(btcKey.privateKey));
  const { address: btcAddress } = bitcoin.payments.p2pkh({
    pubkey: Buffer.from(btcPair.publicKey),
  });
  if (!btcAddress) {
    throw new Error('No se pudo generar la dirección de Bitcoin');
  }

  const bnbKey = root.derive("m/44'/60'/0'/0/0");
  if (!bnbKey.privateKey) {
    throw new Error('No se pudo derivar la clave privada de BNB Chain');
  }
  const bnb = new ethers.Wallet(
    '0x' + Buffer.from(bnbKey.privateKey).toString('hex')
  ).address;

  return {
    solana,
    bitcoin: btcAddress,
    bnb,
  };
}