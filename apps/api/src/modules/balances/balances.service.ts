import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

type Chain = 'solana' | 'bnb' | 'bitcoin';

type BalanceResponse = {
  address: string;
  chain: Chain;
  balance: number;
  symbol: string;
};

@Injectable()
export class BalancesService {
  private readonly logger = new Logger(BalancesService.name);

  async getBalance(address: string, chain?: string) {
    const resolvedChain = this.resolveChain(address, chain);

    try {
      const chainHandlers: Record<Chain, (address: string) => Promise<BalanceResponse>> = {
        solana: (addr) => this.getSolanaBalance(addr),
        bnb: (addr) => this.getBnbBalance(addr),
        bitcoin: (addr) => this.getBitcoinBalance(addr),
      };

      return await chainHandlers[resolvedChain](address);
    } catch (error) {
      this.logger.error(
        `Balance lookup failed for ${resolvedChain} ${address}`,
        error instanceof Error ? error.message : String(error),
      );
      throw new BadRequestException(
        `No se pudo obtener el balance para ${address}`,
      );
    }
  }

  private resolveChain(address: string, chain?: string): Chain {
    const normalizedChain = chain?.toLowerCase();
    if (
      normalizedChain === 'solana' ||
      normalizedChain === 'bnb' ||
      normalizedChain === 'bitcoin'
    ) {
      return normalizedChain;
    }

    if (/^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,62}$/.test(address)) {
      return 'bitcoin';
    }

    if (address.startsWith('0x') || /^0x[a-fA-F0-9]{40}$/.test(address)) {
      return 'bnb';
    }

    if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)) {
      return 'solana';
    }

    throw new BadRequestException('No se pudo inferir la cadena del address');
  }

  private async getSolanaBalance(address: string): Promise<BalanceResponse> {
    const { data } = await axios.post(
      process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
      {
        jsonrpc: '2.0',
        id: 1,
        method: 'getBalance',
        params: [address],
      },
      {
        timeout: 5000,
      },
    );

    const lamports = data?.result?.value ?? 0;
    return {
      address,
      chain: 'solana',
      balance: Number(lamports) / 1e9,
      symbol: 'SOL',
    };
  }

  private async getBnbBalance(address: string): Promise<BalanceResponse> {
    const { data } = await axios.post(
      process.env.BNB_RPC_URL || 'https://bsc-dataseed.binance.org/',
      {
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_getBalance',
        params: [address, 'latest'],
      },
      {
        timeout: 5000,
      },
    );

    const raw = data?.result;
    const normalized = typeof raw === 'string' && raw.startsWith('0x')
      ? raw
      : `0x${raw || '0'}`;
    const wei = BigInt(normalized);

    return {
      address,
      chain: 'bnb',
      balance: Number(wei) / 1e18,
      symbol: 'BNB',
    };
  }

  private async getBitcoinBalance(address: string): Promise<BalanceResponse> {
    const { data } = await axios.get(
      `https://api.blockcypher.com/v1/btc/main/addrs/${address}`,
      {
        timeout: 5000,
      },
    );

    const satoshis = data?.balance ?? 0;
    return {
      address,
      chain: 'bitcoin',
      balance: Number(satoshis) / 1e8,
      symbol: 'BTC',
    };
  }
}
