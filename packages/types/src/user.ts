// packages/types/src/user.ts
import type { MediaType } from "./media";

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  createdAt: string;
}

export interface UserProfile extends User {
  countries: { code: string; name: string }[];
  services: {
    providerId: number;
    name: string;
    logoPath: string;
    countryCode: string;
  }[];
}

export interface WatchlistItem {
  id: string;
  tmdbId: number;
  mediaType: MediaType;
  addedAt: string;
}

export interface WatchedItem {
  id: string;
  tmdbId: number;
  mediaType: MediaType;
  seasonNumber: number | null;
  watchedAt: string;
}

export interface UserRating {
  id: string;
  tmdbId: number;
  mediaType: MediaType;
  rating: number;
  ratedAt: string;
}
