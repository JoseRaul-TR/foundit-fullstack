// packages/types/src/profile.ts
import type { User } from "./user";

export interface ProfileCountry {
  code: string;
  name: string;
}

export interface ProfileStreamingService {
  providerId: number;
  name: string;
  logoPath: string | null;
  countryCode: string;
}

export interface ProfileResponse extends User {
  countries: ProfileCountry[];
  services: ProfileStreamingService[];
  ageRatingCountry: string | null;
}
