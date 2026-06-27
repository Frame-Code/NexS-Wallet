import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { FcmController } from './fcm.controller';
import { NotificationsService } from './notifications.service';

@Module({
  controllers: [NotificationsController, FcmController],
  providers: [NotificationsService],
})
export class NotificationsModule {}