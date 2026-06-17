import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FirebaseModule } from './firebase/firebase.module';
import { AuthController } from './modules/auth/auth.controller';
import { WebhookMiddleware } from './common/middlewares/webhook.middleware';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), FirebaseModule],
  controllers: [AuthController],
})
export class AppModule implements NestModule{

  configure(consumer: MiddlewareConsumer) {
    consumer
    .apply(WebhookMiddleware)
    .forRoutes('webhooks/helius', 'webhooks/alchemy');
  }
  
}
