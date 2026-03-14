import { SetMetadata } from '@nestjs/common';

export const API_VERSION_KEY = 'apiVersion';

export interface ApiVersionOptions {
  version: string;
  deprecated?: boolean;
  deprecationMessage?: string;
  removedIn?: string;
}

export const ApiVersion = (version: string, options?: Partial<ApiVersionOptions>) => {
  const versionOptions: ApiVersionOptions = {
    version,
    deprecated: options?.deprecated || false,
    deprecationMessage: options?.deprecationMessage,
    removedIn: options?.removedIn,
  };

  return SetMetadata(API_VERSION_KEY, versionOptions);
};

export const ApiVersionDeprecated = (version: string, removedIn?: string, message?: string) => {
  return ApiVersion(version, {
    deprecated: true,
    deprecationMessage: message || `This API version is deprecated and will be removed in ${removedIn || 'a future version'}`,
    removedIn,
  });
};

export const CURRENT_API_VERSION = 'v1';
export const SUPPORTED_VERSIONS = ['v1'];
