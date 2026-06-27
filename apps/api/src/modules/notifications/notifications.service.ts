import { Inject, Injectable, Logger } from '@nestjs/common';
import { FIREBASE_DB } from '../../firebase/firebase.module';
import { Firestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(@Inject(FIREBASE_DB) private readonly db: Firestore) {}

  async notifyUser(solanaAddress: string, event: any) {
    // 1. Buscar al usuario cuya direccion de Solana coincide
    const usersSnapshot = await this.db
      .collection('users')
      .where('addresses.solana', '==', solanaAddress)
      .limit(1)
      .get();

    if (usersSnapshot.empty) {
      this.logger.warn(`No se encontro usuario con direccion ${solanaAddress}`);
      return;
    }
    const uid = usersSnapshot.docs[0].id;

    // 2. Buscar su token de notificaciones push
    const tokenDoc = await this.db.collection('fcmTokens').doc(uid).get();
    const fcmToken = tokenDoc.exists ? tokenDoc.data()?.token : null;
    if (!fcmToken) {
      this.logger.warn(`Usuario ${uid} no tiene token FCM registrado`);
      return;
    }

    const lamports = event.nativeTransfers?.[0]?.amount ?? 0;
    const sol = (lamports / 1_000_000_000).toFixed(4);

    // 3. Enviar la notificacion push
    try {
      await getMessaging().send({
        token: fcmToken,
        notification: {
          title: 'Fondos recibidos',
          body: `Recibiste ${sol} SOL en tu wallet`,
        },
      });
      this.logger.log(`Notificacion enviada a usuario ${uid}`);
    } catch (err: any) {
      this.logger.error(`Error enviando notificacion a ${uid}: ${err.message}`);
    }
  }

  async registerToken(uid: string, token: string) {
  await this.db.collection('fcmTokens').doc(uid).set(
    { token, actualizadoEn: new Date() },
    { merge: true },
  );
  return { mensaje: 'Token registrado correctamente' };
  }
}
