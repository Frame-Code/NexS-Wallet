import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { RegisterFcmTokenDto } from './dto/register-fcm-token.dto';
import { JwtAuthGuard } from '../auth/auth.guard';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class FcmController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('fcm-token')
  registerToken(@Body() dto: RegisterFcmTokenDto, @Req() req: any) {
    return this.notificationsService.registerToken(req.user.sub, dto.token);
  }
}