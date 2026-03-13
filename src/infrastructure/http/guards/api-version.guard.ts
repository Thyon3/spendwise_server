import { Injectable, CanActivate, ExecutionContext, BadRequestException, NotFoundException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { API_VERSION_KEY, API_VERSION_DEPRECATED_KEY, API_VERSION_REMOVED_KEY } from '../decorators/api-version.decorator';

@Injectable()
export class ApiVersionGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    // Get requested version from header or query parameter
    const requestedVersion = this.getRequestedVersion(request);
    
    // Get supported versions for this endpoint
    const versionConfig = this.reflector.get(API_VERSION_KEY, context.getHandler()) ||
                          this.reflector.get(API_VERSION_KEY, context.getClass());

    if (!versionConfig) {
      return true; // No version restriction
    }

    const { version, deprecated } = versionConfig;

    // Check if version is removed
    const removedVersion = this.reflector.get(API_VERSION_REMOVED_KEY, context.getHandler()) ||
                          this.reflector.get(API_VERSION_REMOVED_KEY, context.getClass());

    if (removedVersion && requestedVersion === removedVersion) {
      throw new NotFoundException(`API version ${removedVersion} has been removed`);
    }

    // Check if requested version matches
    if (requestedVersion !== version) {
      throw new BadRequestException(`Unsupported API version. Expected: ${version}, Got: ${requestedVersion}`);
    }

    // Check for deprecation
    const deprecatedConfig = this.reflector.get(API_VERSION_DEPRECATED_KEY, context.getHandler()) ||
                             this.reflector.get(API_VERSION_DEPRECATED_KEY, context.getClass());

    if (deprecatedConfig || deprecated) {
      response.setHeader('X-API-Deprecated', 'true');
      response.setHeader('X-API-Deprecation-Message', 
        deprecatedConfig ? 
        `This API version is deprecated and will be removed in version ${deprecatedConfig.removalVersion}` :
        'This API version is deprecated'
      );
      
      if (deprecatedConfig?.removalVersion) {
        response.setHeader('X-API-Removal-Version', deprecatedConfig.removalVersion);
      }
    }

    // Add version headers
    response.setHeader('X-API-Version', version);
    response.setHeader('X-API-Supported-Versions', this.getSupportedVersions(context));

    return true;
  }

  private getRequestedVersion(request: any): string {
    // Try header first
    const headerVersion = request.headers['api-version'] || 
                         request.headers['x-api-version'];
    
    if (headerVersion) {
      return headerVersion;
    }

    // Try query parameter
    const queryVersion = request.query['api_version'] || 
                        request.query['v'];
    
    if (queryVersion) {
      return queryVersion;
    }

    // Try URL path
    const pathVersion = this.extractVersionFromPath(request.path);
    if (pathVersion) {
      return pathVersion;
    }

    // Default to v1
    return 'v1';
  }

  private extractVersionFromPath(path: string): string | null {
    const versionMatch = path.match(/^\/api\/(v\d+)/);
    return versionMatch ? versionMatch[1] : null;
  }

  private getSupportedVersions(context: ExecutionContext): string {
    // In a real implementation, you would collect all supported versions
    // For now, return a simple list
    return 'v1, v2, v3';
  }
}
