export const PREFERENCES_REPOSITORY = Symbol('PREFERENCES_REPOSITORY');

export interface UserPreferences {
  pregnancyMode: boolean;
  riskAlerts: boolean;
  locale: string;
}

export interface PreferencesRepositoryPort {
  getOrCreate(userId: string): Promise<UserPreferences>;
  update(
    userId: string,
    changes: Partial<UserPreferences>,
  ): Promise<UserPreferences>;
  requestAccountDeletion(userId: string, scheduledAt: Date): Promise<Date>;
}
