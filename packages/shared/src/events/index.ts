// ─── Redis pub/sub event channels & payload types ────────────────────────────
// 12 event types — covers all user-facing and admin notifications

export const EVENT_CHANNELS = {
  // Auth
  USER_REGISTERED: 'user.registered',
  USER_PASSWORD_RESET: 'user.password_reset',
  USER_SUSPENDED: 'user.suspended',

  // Listing lifecycle
  LISTING_AUTO_APPROVED: 'listing.auto_approved',
  LISTING_APPROVED: 'listing.approved',
  LISTING_REJECTED: 'listing.rejected',
  LISTING_EXPIRED: 'listing.expired',
  LISTING_EXPIRING_SOON: 'listing.expiring_soon',

  // Listing actions
  LISTING_GUEST_SUBMITTED: 'listing.guest_submitted',
  LISTING_REPORTED: 'listing.reported',

  // User features
  SAVED_SEARCH_NEW_RESULTS: 'saved_search.new_results',

  // Contact (analytics only, no email)
  LISTING_CONTACTED: 'listing.contacted',
} as const;

export type EventChannel = (typeof EVENT_CHANNELS)[keyof typeof EVENT_CHANNELS];

// ─── Payload types ───────────────────────────────────────────────────────────

export interface UserRegisteredPayload {
  userId: string;
  email: string;
  name: string;
}

export interface UserPasswordResetPayload {
  userId: string;
  email: string;
  resetToken: string;
  resetUrl: string;
}

export interface UserSuspendedPayload {
  userId: string;
  reason: string;
  suspendedUntil?: string;
}

export interface ListingAutoApprovedPayload {
  listingId: string;
  userId: string;
  title: string;
}

export interface ListingApprovedPayload {
  listingId: string;
  userId: string | null;
  isGuestListing: boolean;
  scoreIncrement: number;
}

export interface ListingRejectedPayload {
  listingId: string;
  userId: string | null;
  reason: string;
}

export interface ListingExpiredPayload {
  listingId: string;
  userId: string | null;
  title: string;
}

export interface ListingExpiringSoonPayload {
  listingId: string;
  userId: string | null;
  title: string;
  expiresAt: string;
}

export interface ListingGuestSubmittedPayload {
  listingId: string;
  guestName: string;
  guestPhone: string;
  guestEmail?: string;
  title: string;
}

export interface ListingReportedPayload {
  listingId: string;
  reportedBy: string;
  reason: string;
}

export interface SavedSearchNewResultsPayload {
  userId: string;
  searchId: string;
  searchName: string;
  newListingCount: number;
}

export interface ListingContactedPayload {
  listingId: string;
  contactType: string;
}

// ─── Union type for all payloads ─────────────────────────────────────────────

export type EventPayloadMap = {
  [EVENT_CHANNELS.USER_REGISTERED]: UserRegisteredPayload;
  [EVENT_CHANNELS.USER_PASSWORD_RESET]: UserPasswordResetPayload;
  [EVENT_CHANNELS.USER_SUSPENDED]: UserSuspendedPayload;
  [EVENT_CHANNELS.LISTING_AUTO_APPROVED]: ListingAutoApprovedPayload;
  [EVENT_CHANNELS.LISTING_APPROVED]: ListingApprovedPayload;
  [EVENT_CHANNELS.LISTING_REJECTED]: ListingRejectedPayload;
  [EVENT_CHANNELS.LISTING_EXPIRED]: ListingExpiredPayload;
  [EVENT_CHANNELS.LISTING_EXPIRING_SOON]: ListingExpiringSoonPayload;
  [EVENT_CHANNELS.LISTING_GUEST_SUBMITTED]: ListingGuestSubmittedPayload;
  [EVENT_CHANNELS.LISTING_REPORTED]: ListingReportedPayload;
  [EVENT_CHANNELS.SAVED_SEARCH_NEW_RESULTS]: SavedSearchNewResultsPayload;
  [EVENT_CHANNELS.LISTING_CONTACTED]: ListingContactedPayload;
};
