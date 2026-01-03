import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ITokenService, TokenPayload } from '../../../domain/services/token-service.interface';

@Injectable()
export class JwtTokenService implements ITokenService {
    constructor(private readonly jwtService: JwtService) { }

    async generateToken(payload: TokenPayload): Promise<string> {
        return this.jwtService.signAsync(payload);
    }

    async verifyToken(token: string): Promise<TokenPayload | null> {
        try {
            return await this.jwtService.verifyAsync(token);
        } catch {
            return null;
        }
    }
}
