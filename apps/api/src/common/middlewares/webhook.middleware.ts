import {Request, Response, NextFunction} from 'express'
import { Injectable, Logger, NestMiddleware, UnauthorizedException } from "@nestjs/common";
import { createHmac, timingSafeEqual } from 'crypto'

@Injectable()
export class WebhookMiddleware implements NestMiddleware{
    private readonly logger = new Logger(WebhookMiddleware.name)

    use(req: Request, res: Response, next: NextFunction) {
        //Helius envia el hash en el header Authorization, Alchemy en el header X-Alchemy-Signature
        const baseSignature = (req.headers['authorization']) ?? (req.headers['x-alchemy-signature'])
        
        if(!baseSignature) {
            this.logger.warn('No se encontro firma en el webhook');
            throw new UnauthorizedException('Missing webhook signature');
        }

        const signature = baseSignature.toString();
        const isAlchemy = req.originalUrl.includes('alchemy');
        const secret = isAlchemy? process.env['ALCHEMY_WEBHOOK_SECRET'] : process.env['HELIUS_WEBHOOK_SECRET'];

        if(!secret) {
            this.logger.error('WEBHOOK SECRET no ha sido configurado');
            throw new UnauthorizedException('Webhook secret not configured');
        }

        //Validar firma de la request del Webhook
        const body = req.body;
        const hashExpected = createHmac('sha256', secret).update(body).digest('hex');

        const sigBuffer = Buffer.from(signature, 'hex');
        const expectedBuffer = Buffer.from(hashExpected, 'hex');

        //Valida si el largo de la firma y el contenido de la misma firma no es igual
        if(sigBuffer.length !== expectedBuffer.length || !timingSafeEqual(sigBuffer, expectedBuffer)) {
            this.logger.warn(`Firma invalida en webhook: ${req.path}`);
            throw new UnauthorizedException('Invalid webhook signature');
        }

        next();
    }
    
}