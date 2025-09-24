import { beforeEach, describe, expect, it, vi } from 'vitest';

const httpClientMock = vi.fn();

vi.mock('@lib/api/http-client', () => ({
  httpClient: httpClientMock,
}));

describe('preferencesService', () => {
  beforeEach(() => {
    httpClientMock.mockReset();
  });

  it('fetches preferences via shared http client', async () => {
    httpClientMock.mockResolvedValueOnce({ theme: 'dark' });
    const { fetchPreferences, preferencesService } = await import('@lib/services/preferences');

    const result = await fetchPreferences();

    expect(httpClientMock).toHaveBeenCalledWith('/preferences');
    expect(result).toEqual({ theme: 'dark' });

    await preferencesService.fetch();
    expect(httpClientMock).toHaveBeenCalledTimes(2);
  });

  it('persists preferences with PUT payload', async () => {
    const { savePreferences, preferencesService } = await import('@lib/services/preferences');

    httpClientMock.mockResolvedValueOnce(undefined);
    const payload = {
      theme: 'light',
      redactions: [],
      telemetry: true,
    } as unknown as import('@lib/storage/schema').StorageValue<'user.preferences'>;

    await savePreferences(payload);

    expect(httpClientMock).toHaveBeenCalledWith('/preferences', {
      method: 'PUT',
      body: payload,
    });

    await preferencesService.save(payload);
    expect(httpClientMock).toHaveBeenCalledTimes(2);
  });
});
