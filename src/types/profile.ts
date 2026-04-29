export type Gender = 'male' | 'female';

export type ActivityLevel = 1.2 | 1.375 | 1.55 | 1.725;

export interface ProfileInput {
  height: number;
  weight: number;
  gender: Gender;
  age: number;
  activity: ActivityLevel;
  target_weight_kg?: number;
  waist_cm?: number;
  neck_cm?: number;
  hip_cm?: number;
}

export interface UserProfile extends ProfileInput {
  k_factor: number;
  last_updated: string;
  biometric_lock?: boolean;
}
