import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class IpWhitelistGuard implements CanActivate {
  private readonly whitelistedIPs: string[];

  constructor(private configService: ConfigService) {
    const ips = this.configService.get<string>('WHITELISTED_IPS', '');
    this.whitelistedIPs = ips.split(',').map(ip => ip.trim()).filter(Boolean);
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const clientIP = this.getClientIP(request);

    // Skip whitelist check in development or if no whitelist is configured
    if (process.env.NODE_ENV !== 'production' || this.whitelistedIPs.length === 0) {
      return true;
    }

    if (!this.isIPWhitelisted(clientIP)) {
      throw new ForbiddenException(`IP ${clientIP} is not whitelisted`);
    }

    return true;
  }

  private getClientIP(request: Request): string {
    const forwarded = request.headers['x-forwarded-for'] as string;
    const realIP = request.headers['x-real-ip'] as string;
    
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    
    if (realIP) {
      return realIP;
    }
    
    return request.connection.remoteAddress || 
           request.socket.remoteAddress || 
           (request.connection as any)?.socket?.remoteAddress || 
           'unknown';
  }

  private isIPWhitelisted(ip: string): boolean {
    return this.whitelistedIPs.some(whitelistedIP => {
      // Support CIDR notation and exact matches
      if (whitelistedIP.includes('/')) {
        return this.isIPInCIDR(ip, whitelistedIP);
      }
      return ip === whitelistedIP || ip.startsWith(whitelistedIP);
    });
  }

  private isIPInCIDR(ip: string, cidr: string): boolean {
    const [network, prefixLength] = cidr.split('/');
    const ipInt = this.ipToInteger(ip);
    const networkInt = this.ipToInteger(network);
    const mask = (0xffffffff << (32 - parseInt(prefixLength))) >>> 0;
    
    return (ipInt & mask) === (networkInt & mask);
  }

  private ipToInteger(ip: string): number {
    return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet), 0) >>> 0;
  }
}
