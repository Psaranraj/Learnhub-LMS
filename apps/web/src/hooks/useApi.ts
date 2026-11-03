import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { toApiError } from '../services/apiClient';

/**
 * Runs one service function and holds its request state: data, loading and error.
 * It knows nothing about endpoints; the service does.
 *
 *   const { data, loading, callAPI } = useApi(courseService.approve);
 *   await callAPI(id);        // returns the data, or null when the call failed
 */
export function useApi<A extends unknown[], T>(service: (...args: A) => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Always points to the newest service, so `callAPI` never needs to change.
  const serviceRef = useRef(service);
  useLayoutEffect(() => {
    serviceRef.current = service;
  });

  // Counts calls. Only the latest call updates the state, so a slow older response
  // cannot overwrite a newer one.
  const latestCall = useRef(0);

  /** Clears the last error, for example when a dialog closes. */
  const clear = useCallback(() => {
    setError(null);
    setCode(null);
    setFieldErrors({});
  }, []);

  const callAPI = useCallback(
    async (...args: A): Promise<T | null> => {
      const callId = ++latestCall.current;
      setLoading(true);
      clear();

      try {
        const result = await serviceRef.current(...args);
        if (callId === latestCall.current) {
          setData(result);
        }
        return result;
      } catch (e) {
        const err = toApiError(e);
        if (callId === latestCall.current) {
          setError(err.message);
          setCode(err.code);
          setFieldErrors(err.fieldErrors);
        }
        return null;
      } finally {
        if (callId === latestCall.current) {
          setLoading(false);
          setLoaded(true);
        }
      }
    },
    [clear],
  );

  /** Clears data and errors, for example when a form is reset. */
  const reset = useCallback(() => {
    setData(null);
    clear();
  }, [clear]);

  return {
    data,
    loading,
    loaded,
    error,
    code,
    fieldErrors,
    callAPI,
    clear,
    reset,
    setData,
    setError,
  };
}
