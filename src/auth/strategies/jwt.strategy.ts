import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || '',
    });
  }

  async validate(payload: any) {
    const { sub: id, userType } = payload;
    
    if (!id || !userType) {
      throw new UnauthorizedException('Invalid token payload');
    }

    let account;
    
    if (userType === 'user') {
      // Validate user (patient)
      account = await this.prisma.user.findUnique({
        where: { id },
      });
      
      if (!account || !account.isActive) {
        throw new UnauthorizedException('User not found or inactive');
      }
      
      // Remove password from response
      const { password, ...userWithoutPassword } = account;
      return { ...userWithoutPassword, userType: 'user' };
      
    } else if (userType === 'doctor') {
      // Validate doctor
      account = await this.prisma.doctor.findUnique({
        where: { id },
      });
      
      if (!account || !account.isActive) {
        throw new UnauthorizedException('Doctor not found or inactive');
      }
      
      // Remove password from response
      const { password, ...doctorWithoutPassword } = account;
      return { ...doctorWithoutPassword, userType: 'doctor' };
      
    } else {
      throw new UnauthorizedException('Invalid user type in token');
    }
  }
}
