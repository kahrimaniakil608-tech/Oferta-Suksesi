export const APP_NAME = 'Oferta Suksesi';
export const DEFAULT_CURRENCY = 'ALL';
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_IMAGES_PER_LISTING = 10;

export const LISTING_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  SOLD: 'sold',
  EXPIRED: 'expired',
} as const;

export const SUPPORTED_IMAGE_FORMATS = ['jpg', 'jpeg', 'png', 'webp'] as const;
export const MAX_IMAGE_SIZE_MB = 10;
