/**
 * Hook for managing anonymous user tracking
 */

import { useEffect, useState, useCallback } from 'react';
import { getOrCreateDeviceId, getSettings } from '@/lib/storage';
import api from '@/lib/api';

interface AnonymousUserData {
  device_id: string;
  first_seen: string;
  last_seen: string;
  timezone_name: string;
  notifications_enabled: boolean;
}

interface UseAnonymousUserReturn {
  deviceId: string | null;
  isRegistered: boolean;
  isLoading: boolean;
  error: Error | null;
  register: () => Promise<void>;
  sync: () => Promise<void>;
}

/**
 * Hook to manage anonymous user device ID and registration
 */
export function useAnonymousUser(): UseAnonymousUserReturn {
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Register new anonymous user with backend
   */
  const register = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const settings = getSettings();

      const response = await api.anonymous.register({
        timezone_name: settings.timezone,
        notifications_enabled: settings.notificationsEnabled,
      });

      const data = response as AnonymousUserData;
      setDeviceId(data.device_id);
      setIsRegistered(true);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to register');
      setError(error);
      console.error('Failed to register anonymous user:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Sync local data with backend
   */
  const sync = useCallback(async () => {
    if (!deviceId) return;

    try {
      await api.anonymous.sync(deviceId);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to sync');
      console.error('Failed to sync anonymous data:', error);
      // Don't set error state for sync failures - they're not critical
    }
  }, [deviceId]);

  /**
   * Initialize device ID on mount
   */
  useEffect(() => {
    const initializeDeviceId = async () => {
      try {
        setIsLoading(true);

        // Get or create device ID from localStorage
        const localDeviceId = getOrCreateDeviceId();
        setDeviceId(localDeviceId);

        // Try to sync with backend to verify registration
        try {
          await api.anonymous.sync(localDeviceId);
          setIsRegistered(true);
        } catch {
          // If sync fails (user not registered), register them
          console.log('User not registered, registering now...');
          await register();
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Initialization failed');
        setError(error);
        console.error('Failed to initialize device ID:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeDeviceId();
  }, [register]);

  /**
   * Periodic sync (every 5 minutes when page is visible)
   */
  useEffect(() => {
    if (!deviceId || !isRegistered) return;

    const interval = setInterval(
      () => {
        if (document.visibilityState === 'visible') {
          sync();
        }
      },
      5 * 60 * 1000
    ); // 5 minutes

    return () => clearInterval(interval);
  }, [deviceId, isRegistered, sync]);

  /**
   * Sync when page becomes visible
   */
  useEffect(() => {
    if (!deviceId || !isRegistered) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        sync();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [deviceId, isRegistered, sync]);

  return {
    deviceId,
    isRegistered,
    isLoading,
    error,
    register,
    sync,
  };
}

export default useAnonymousUser;
