import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { BroadcastDto } from './dto/broadcast.dto';
import { JwtAuthGuard } from '../auth/auth.guard'; 

@UseGuards(JwtAuthGuard)
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post('broadcast')
  async broadcastTransaction(@Body() body: BroadcastDto) {
    return await this.transactionsService.broadcast(
      body.chain as 'solana' | 'bnb' | 'bitcoin', 
      body.rawTx
    );
  }

  @Get(':chain/:address')
  async getTransactionHistory(
    @Param('chain') chain: string,
    @Param('address') address: string,
  ) {
    return await this.transactionsService.getTransactionHistory(
      chain as 'solana' | 'bnb' | 'bitcoin',
      address
    );
  }
}