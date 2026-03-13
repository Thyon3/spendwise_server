import { SetMetadata } from '@nestjs/common';

export const API_VERSION_KEY = 'api_version';
export const API_VERSION_DEPRECATED_KEY = 'api_version_deprecated';
export const API_VERSION_REMOVED_KEY = 'api_version_removed';

export const ApiVersion = (version: string, deprecated?: boolean) => {
  return SetMetadata(API_VERSION_KEY, { version, deprecated });
};

export const ApiVersionDeprecated = (version: string, removalVersion?: string) => {
  return SetMetadata(API_VERSION_DEPRECATED_KEY, { version, removalVersion });
};

export const ApiVersionRemoved = (version: string) => {
  return SetMetadata(API_VERSION_REMOVED_KEY, version);
};
