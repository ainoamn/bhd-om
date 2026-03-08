'use client';

import { createContext, useContext } from 'react';

export type UserBarContextValue = {
  hasUserBar: boolean;
  barVisible: boolean;
  setBarVisible: (v: boolean) => void;
};

const defaultValue: UserBarContextValue = {
  hasUserBar: false,
  barVisible: false,
  setBarVisible: () => {},
};

export const UserBarContext = createContext<UserBarContextValue>(defaultValue);

export function useUserBar(): UserBarContextValue {
  return useContext(UserBarContext);
}
