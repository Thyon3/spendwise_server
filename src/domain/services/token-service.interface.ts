export interface TokenPayload {
    userId: string;
    email: string;
}

export abstract class ITokenService {
    abstract generateToken(payload: TokenPayload): Promise<string>;
    abstract verifyToken(token: string): Promise<TokenPayload | null>;
}
