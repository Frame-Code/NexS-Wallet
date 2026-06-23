import { Injectable, BadRequestException } from '@nestjs/common';
import { Connection, PublicKey } from '@solana/web3.js';
import { ethers } from 'ethers';

interface IChainStrategy {
  broadcast(rawTx: string): Promise<string>;
  getHistory(address: string): Promise<any>;
}

class SolanaStrategy implements IChainStrategy {
  async broadcast(rawTx: string): Promise<string> {
    const conn = new Connection(process.env.HELIUS_RPC_URL!);
    const sig = await conn.sendRawTransaction(Buffer.from(rawTx, 'base64'));
    await conn.confirmTransaction(sig, 'confirmed');
    return sig;
  }
  
  async getHistory(address: string) {
    const conn = new Connection(process.env.HELIUS_RPC_URL!);
    const pubKey = new PublicKey(address);
    const signatures = await conn.getSignaturesForAddress(pubKey, { limit: 20 });
    return { address, chain: 'solana', transactions: signatures };
  }
}

class BnbStrategy implements IChainStrategy {
  async broadcast(rawTx: string): Promise<string> {
    // Implementación usando tu variable ALCHEMY_BNB_URL
    const provider = new ethers.JsonRpcProvider(process.env.ALCHEMY_BNB_URL);
    const tx = await provider.broadcastTransaction(rawTx);
    return tx.hash;
  }

  async getHistory(address: string) {
    // BscScan permite consultas sin API Key con límite (1 req/sec)
    const apiKey = process.env.BSCSCAN_API_KEY || ''; 
    const url = `https://api.bscscan.com/api?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=1&offset=20&sort=desc&apikey=${apiKey}`;
    
    try {
      const response = await fetch(url);
      const data: any = await response.json();
      
      return { 
        address, 
        chain: 'bnb', 
        transactions: data.status === '1' ? data.result : [] 
      };
    } catch (error: any) {
      throw new Error(`Error al obtener historial de BNB: ${error.message}`);
    }
  }
}

class BitcoinStrategy implements IChainStrategy {
  async broadcast(rawTx: string): Promise<string> {
    try {
      // Implementación usando tu variable ALCHEMY_BTC_URL
      const response = await fetch(process.env.ALCHEMY_BTC_URL!, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '1.0',
          id: 'wallet_broadcast',
          method: 'sendrawtransaction',
          params: [rawTx]
        })
      });
      
      const data: any = await response.json();
      
      if (data.error) {
        throw new Error(data.error.message);
      }
      return data.result; 
    } catch (error: any) {
      throw new Error(`Error en broadcast de Bitcoin: ${error.message}`);
    }
  }

  async getHistory(address: string) {
    const url = `https://mempool.space/api/address/${address}/txs`;
    
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Network response was not ok');
      
      const transactions = await response.json();
      
      return { 
        address, 
        chain: 'bitcoin', 
        transactions: transactions 
      };
    } catch (error: any) {
      throw new Error(`Error al obtener historial de Bitcoin: ${error.message}`);
    }
  }
}

@Injectable()
export class TransactionsService {
  private strategies: Record<string, IChainStrategy>;

  constructor() {
    this.strategies = {
      'solana': new SolanaStrategy(),
      'bnb': new BnbStrategy(),
      'bitcoin': new BitcoinStrategy(),
    };
  }

  async broadcast(chain: string, rawTx: string): Promise<string> {
    const strategy = this.strategies[chain];
    if (!strategy) throw new BadRequestException(`La red ${chain} no está soportada.`);
    
    return await strategy.broadcast(rawTx);
  }

  async getTransactionHistory(chain: string, address: string) {
    const strategy = this.strategies[chain];
    if (!strategy) throw new BadRequestException(`La red ${chain} no está soportada.`);
  }
}