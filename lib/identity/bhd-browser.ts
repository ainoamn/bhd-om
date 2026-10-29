export type BhdIdentityUser = {
  id?: string;
  email?: string | null;
  name?: string | null;
  picture?: string | null;
};

export type BhdIdentityMeBody = {
  user?: BhdIdentityUser | null;
  token?: string;
};

export type BhdIdentityResult = {
  ok: boolean;
  status: number;
  body: BhdIdentityMeBody;
};

export type BhdCatalogBody = {
  apps?: Array<Record<string, unknown>>;
};

export type BhdIdentityApi = {
  me: () => Promise<BhdIdentityResult>;
  catalog: () => Promise<BhdCatalogBody>;
  productStart: (returnTo?: string) => string;
};

declare global {
  interface Window {
    BhdIdentity?: BhdIdentityApi;
  }
}

export function loadBhdIdentity(timeoutMs = 1200): Promise<BhdIdentityApi | null> {
  if (typeof window === 'undefined') return Promise.resolve(null);
  if (window.BhdIdentity) return Promise.resolve(window.BhdIdentity);
  return new Promise((resolve) => {
    const started = Date.now();
    const tick = () => {
      if (window.BhdIdentity) {
        resolve(window.BhdIdentity);
        return;
      }
      if (Date.now() - started >= timeoutMs) {
        resolve(null);
        return;
      }
      window.setTimeout(tick, 40);
    };
    tick();
  });
}
