import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { PricesService } from './prices.service';
import { JwtAuthGuard } from '../auth/auth.guard';

@Controller('prices')
@UseGuards(JwtAuthGuard)
export class PricesController {
  constructor(private readonly pricesService: PricesService) {}

  @Get()
  async getPrices(@Query('ids') ids?: string | string[]) {
    const normalized = Array.isArray(ids)
      ? ids
      : typeof ids === 'string'
        ? ids.split(',')
        : [];

    return this.pricesService.getPrices(
      normalized.map((value) => value.trim()).filter(Boolean),
    );
  }
}
