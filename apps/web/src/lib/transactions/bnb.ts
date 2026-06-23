import { ethers } from 'ethers';
import { loadMnemonic } from '../crypto/vault';
import * as bip39 from 'bip39';
import { HDKey } from '@scure/bip32';

export async function buildAndSignBNB(pin: string, to: string, amountBNB: string): Promise<string> {
  
  const mnemonic = await loadMnemonic(pin);

  const seed = await bip39.mnemonicToSeed(mnemonic);
  const root = HDKey.fromMasterSeed(seed);
  const bnbKey = root.derive("m/44'/60'/0'/0/0");

  const privateKeyHex = '0x' + Buffer.from(bnbKey.privateKey!).toString('hex');
  const wallet = new ethers.Wallet(privateKeyHex);

  const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_ALCHEMY_BNB_URL!);
  const walletConnected = wallet.connect(provider);

  const nonce = await provider.getTransactionCount(walletConnected.address);
  const feeData = await provider.getFeeData();

  const isProd = process.env.NODE_ENV === 'production';

  // 2. Asignamos 56 si es producción (Mainnet) o 97 si es desarrollo (Testnet)
  const resolvedChainId = isProd ? 56 : 97;

  const tx = {
    to: to,
    value: ethers.parseEther(amountBNB),
    nonce: nonce,
    gasLimit: 21000,
    gasPrice: feeData.gasPrice,
    chainId: resolvedChainId  
  };

  const signedTx = await walletConnected.signTransaction(tx);

  return signedTx;
}