import { httpClient } from '@lib/api/http-client';
import type { StorageValue } from '@lib/storage/schema';

export async function fetchPreferences() {
  return httpClient<StorageValue<'user.preferences'>>('/preferences');
}

export async function savePreferences(payload: StorageValue<'user.preferences'>) {
  return httpClient<void>('/preferences', {
    method: 'PUT',
    body: payload,
  });
}

export const preferencesService = {
  fetch: fetchPreferences,
  save: savePreferences,
};
