import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import {
  initializeApp,
  getApps,
  cert,
  applicationDefault,
  App,
} from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

export const FIREBASE_APP = 'FIREBASE_APP';
export const FIREBASE_AUTH = 'FIREBASE_AUTH';
export const FIREBASE_DB = 'FIREBASE_DB';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: FIREBASE_APP,
      inject: [ConfigService],
      useFactory: (config: ConfigService): App => {
        if (getApps().length > 0) return getApps()[0];

        const projectId = config.get<string>('FIREBASE_PROJECT_ID');
        const clientEmail = config.get<string>('FIREBASE_CLIENT_EMAIL');
        const privateKey = config.get<string>('FIREBASE_PRIVATE_KEY')?.replace(/\\n/g, '\n');

        const hasServiceAccountCredentials = Boolean(
          projectId &&
            clientEmail &&
            privateKey &&
            privateKey.includes('BEGIN PRIVATE KEY') &&
            clientEmail.includes('@')
        );

        if (hasServiceAccountCredentials) {
          return initializeApp({
            credential: cert({
              projectId,
              clientEmail,
              privateKey,
            }),
          });
        }

        return initializeApp({
          credential: applicationDefault(),
          projectId: projectId || undefined,
        });
      },
    },
    {
      provide: FIREBASE_AUTH,
      inject: [FIREBASE_APP],
      useFactory: (app: App) => getAuth(app),
    },
    {
      provide: FIREBASE_DB,
      inject: [FIREBASE_APP],
      useFactory: (app: App) => getFirestore(app),
    },
  ],
  exports: [FIREBASE_APP, FIREBASE_AUTH, FIREBASE_DB],
})
export class FirebaseModule {}
