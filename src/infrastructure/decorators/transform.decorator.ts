import { SetMetadata } from '@nestjs/common';

export const TRANSFORM_KEY = 'transform';

export const Transform = (transformFn: (value: any) => any) => {
  return SetMetadata(TRANSFORM_KEY, transformFn);
};

export const Trim = () => Transform((value: any) => {
  if (typeof value === 'string') {
    return value.trim();
  }
  return value;
});

export const ToLowerCase = () => Transform((value: any) => {
  if (typeof value === 'string') {
    return value.toLowerCase();
  }
  return value;
});

export const ToUpperCase = () => Transform((value: any) => {
  if (typeof value === 'string') {
    return value.toUpperCase();
  }
  return value;
});
