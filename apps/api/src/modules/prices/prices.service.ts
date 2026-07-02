import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class PricesService {
  private readonly logger = new Logger(PricesService.name);

  async getPrices(
    ids: string[],
  ): Promise<Record<string, { usd: number; usd_24h_change: number }>> {
    if (!ids.length) {
      return {};
    }

    try {
      const { data } = await axios.get(
        'https://api.coingecko.com/api/v3/simple/price',
        {
          params: {
            ids: ids.join(','),
            vs_currencies: 'usd',
            include_24hr_change: true,
          },
          headers: {
            ...(process.env.COINGECKO_API_KEY
              ? { 'x-cg-demo-api-key': process.env.COINGECKO_API_KEY }
              : {}),
          },
          timeout: 5000,
        },
      );

      return this.normalizePriceData(data, ids);
    } catch (error) {
      this.logger.warn(
        `CoinGecko failed, trying fallback... ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return this.fallback(ids);
    }
  }

  private normalizePriceData(
    payload: unknown,
    ids: string[],
  ): Record<string, { usd: number; usd_24h_change: number }> {
    const normalized: Record<string, { usd: number; usd_24h_change: number }> =
      {};

    if (!payload || typeof payload !== 'object') {
      return normalized;
    }

    for (const [key, value] of Object.entries(payload as Record<string, unknown>)) {
      if (!ids.includes(key)) {
        continue;
      }

      const raw = value as Record<string, unknown>;
      normalized[key] = {
        usd: typeof raw.usd === 'number' ? raw.usd : 0,
        usd_24h_change:
          typeof raw.usd_24h_change === 'number'
            ? raw.usd_24h_change
            : 0,
      };
    }

    return normalized;
  }

  private async fallback(
    ids: string[],
  ): Promise<Record<string, { usd: number; usd_24h_change: number }>> {
    try {
      const { data } = await axios.get(
        'https://api.coinstats.app/public/v1/coins',
        {
          params: {
            currency: 'USD',
            skip: 0,
            limit: 100,
          },
          headers: process.env.COINSTATS_API_KEY
            ? {
                'X-API-KEY': process.env.COINSTATS_API_KEY,
              }
            : undefined,
          timeout: 5000,
        },
      );

      const items = Array.isArray(data?.coins)
        ? data.coins
        : Array.isArray(data)
          ? data
          : Array.isArray(data?.data)
            ? data.data
            : [];

      const fallbackResult: Record<string, { usd: number; usd_24h_change: number }> =
        {};

      for (const item of items) {
        const id =
          item?.id ||
          item?.slug ||
          (typeof item?.symbol === 'string'
            ? item.symbol.toLowerCase()
            : undefined);

        if (!id || !ids.includes(id)) {
          continue;
        }

        fallbackResult[id] = {
          usd: Number(item?.price ?? item?.usd ?? 0),
          usd_24h_change: Number(
            item?.priceChange1h ??
              item?.percentChange24h ??
              item?.usd_24h_change ??
              0,
          ),
        };
      }

      if (Object.keys(fallbackResult).length) {
        return fallbackResult;
      }
    } catch (error) {
      this.logger.error(
        'CoinStats fallback failed',
        error instanceof Error ? error.message : String(error),
      );
    }

    throw new Error('All price providers failed');
  }
}
