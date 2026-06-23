import * as bitcoin from 'bitcoinjs-lib';
import { loadMnemonic } from '../crypto/vault';
import * as bip39 from 'bip39';
import { HDKey } from '@scure/bip32';
import { ECPairFactory } from 'ecpair';
import * as ecc from 'tiny-secp256k1';

const ECPair = ECPairFactory(ecc);

export async function buildAndSignBTC(
  pin: string, 
  to: string, 
  amountSatoshi: number, 
  utxos: any[]
): Promise<string> {
  const mnemonic = await loadMnemonic(pin);
  
  const seed = await bip39.mnemonicToSeed(mnemonic);
  const root = HDKey.fromMasterSeed(seed);
  
  // 1. Validar el entorno
  const isProd = process.env.NODE_ENV === 'production';

  // 2. Resolver la red y la ruta de derivación dependiendo del entorno
  // Mainnet usa '0', Testnet usa '1'
  const network = isProd ? bitcoin.networks.bitcoin : bitcoin.networks.testnet;
  const derivationPath = isProd ? "m/44'/0'/0'/0/0" : "m/44'/1'/0'/0/0";

  // Ruta de derivación dinámica
  const btcKey = root.derive(derivationPath);
  const keyPair = ECPair.fromPrivateKey(Buffer.from(btcKey.privateKey!));
  
  // Red dinámica en la creación del PSBT
  const psbt = new bitcoin.Psbt({ network });

  // Añadir los inputs (UTXOs)
  let inputSum = 0;
  utxos.forEach(utxo => {
    psbt.addInput({
      hash: utxo.txid,
      index: utxo.vout,
      nonWitnessUtxo: Buffer.from(utxo.rawTx, 'hex'),
    });
    inputSum += utxo.value;
  });

  // Añadir el output (el envío al destinatario)
  psbt.addOutput({
    address: to,
    value: amountSatoshi,
  });

  // 3. Resolver el fee dependiendo del ambiente
  let fee: number;
  if (isProd) {
    // TODO: En producción, calcular fee dinámico = feeRate * txSize
    // Por ahora dejamos 2500 como placeholder de producción
    fee = 2500; 
  } else {
    // Tarifa de minería plana para desarrollo y pruebas (en satoshis)
    fee = 1000; 
  }

  const change = inputSum - amountSatoshi - fee;
  
  if (change > 0) {
    // IMPORTANTE: Se actualizó la red a la variable dinámica aquí también
    const { address } = bitcoin.payments.p2pkh({ 
        pubkey: Buffer.from(keyPair.publicKey as any), 
        network 
    });
    
    psbt.addOutput({
      address: address!,
      value: change,
    });
  }

  // Firmar todos los inputs
  psbt.signAllInputs(keyPair as any);
  psbt.finalizeAllInputs();

  // Extraer y retornar la transacción serializada en formato hexadecimal
  return psbt.extractTransaction().toHex();
}