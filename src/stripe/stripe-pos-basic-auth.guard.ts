import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';

/** Same users and behavior as `express-basic-auth` in the original Express POS server. */
const USERS: Record<string, string> = {
  receptionist: 'clinicpass',
  admin: 'optimalemd',
};

@Injectable()
export class StripePosBasicAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse();
    const auth = req.headers['authorization'];
    if (!auth?.startsWith('Basic ')) {
      res.setHeader(
        'WWW-Authenticate',
        'Basic realm="Stripe POS", charset="UTF-8"',
      );
      throw new UnauthorizedException();
    }

    const decoded = Buffer.from(auth.slice(6), 'base64').toString('utf8');
    const sep = decoded.indexOf(':');
    const user = sep >= 0 ? decoded.slice(0, sep) : decoded;
    const pass = sep >= 0 ? decoded.slice(sep + 1) : '';

    if (USERS[user] === pass) {
      return true;
    }

    res.setHeader(
      'WWW-Authenticate',
      'Basic realm="Stripe POS", charset="UTF-8"',
    );
    throw new UnauthorizedException();
  }
}
