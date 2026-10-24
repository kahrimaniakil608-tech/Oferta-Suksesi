export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Listing {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  category: string;
  location: string;
  images: string[];
  userId: string;
  status: ListingStatus;
  createdAt: Date;
  updatedAt: Date;
}

export type ListingStatus = 'active' | 'inactive' | 'sold' | 'expired';

export interface Category {
  id: string;
  name: string;
  slug: string;
  parentId?: string;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
  meta?: PaginationMeta;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
