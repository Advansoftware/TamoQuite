import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthUser } from '../common/current-user.decorator';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        // Fallback to cookie for browser sessions
        (req) => {
          const cookie: string = req?.headers?.cookie || '';
          const match = cookie.match(/cf_session=([^;]+)/);
          return match ? match[1] : null;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey:
        config.get<string>('JWT_SECRET') ||
        config.get<string>('SESSION_SECRET') ||
        'tamoquite-super-secret-key-12345',
    });
  }

  async validate(payload: { sub: string }): Promise<AuthUser> {
    const user = await this.authService.getUserById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('Não autenticado');
    }
    return user;
  }
}
