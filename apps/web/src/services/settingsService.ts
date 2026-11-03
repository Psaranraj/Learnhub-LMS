import type { SettingsInput } from '@learnhub/shared';
import { apiClient } from './apiClient';

export type Settings = Omit<SettingsInput, 'removeLogo'> & { hasLogo: boolean; updatedAt: string };

// LLD 3, settings (admin). Multipart because the logo is optional.
export const settingsService = {
  get: () => apiClient.get<{ settings: Settings }>('/settings').then((r) => r.data.settings),
  save: (input: SettingsInput, logo: File | null) => {
    const form = new FormData();
    for (const [k, v] of Object.entries(input)) form.append(k, String(v));
    if (logo) form.append('file', logo);
    return apiClient.patch<{ settings: Settings }>('/settings', form).then((r) => r.data.settings);
  },
  /** Public. The version query makes the browser load a newly saved logo. */
  logoUrl: (version: string) => `${apiClient.defaults.baseURL}/settings/logo?v=${encodeURIComponent(version)}`,
  certificateLogoUrl: (certificateId: number) => `${apiClient.defaults.baseURL}/certificates/${certificateId}/logo`,
};
