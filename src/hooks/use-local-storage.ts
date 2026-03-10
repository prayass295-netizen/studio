"use client";

import { useState, useEffect, useCallback } from 'react';

// A value of `undefined` means the value is still being loaded from localStorage.
// This is to prevent hydration mismatches.
export function useLocalStorage<T>(key: string, initialValue: T | undefined) {
  const [storedValue, setStoredValue] = useState<T | undefined>(undefined);

  useEffect(() => {
    // This effect runs only on the client, after hydration
    let value: T;
    try {
      const item = window.localStorage.getItem(key);
      value = item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(error);
      value = initialValue as T;
    }
    setStoredValue(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const setValue = useCallback(
    (value: T | ((val: T | undefined) => T)) => {
      try {
        const valueToStore = value instanceof Function ? value(storedValue) : value;
        setStoredValue(valueToStore);
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(key, JSON.stringify(valueToStore));
        }
      } catch (error) {
        console.error(error);
      }
    },
    [key, storedValue]
  );

  return [storedValue, setValue] as const;
}
