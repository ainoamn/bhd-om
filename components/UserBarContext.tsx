'use client';

import { createContext, useContext } from 'react';

export const UserBarContext = createContext<boolean>(false);

export function useUserBar() {
  return useContext(UserBarContext);
}
