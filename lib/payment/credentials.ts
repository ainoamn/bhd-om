/**
 * حل credentials لبوابات الدفع — DB أولاً ثم env
 */
import { prisma } from '@/lib/prisma';
import type { PaymentGatewayConfig } from '@prisma/client';
import type { PaymentProvider } from './manager';

export interface ResolvedGatewayConfig {
  isEnabled: boolean;
  sandbox: boolean;
  apiKey: string;
  apiSecret: string;
  merchantId: string;
  storeKey: string;
  outletRef: string;
  profileId: string;
  entityId: string;
  accessToken: string;
  publicKey: string;
  source: 'db' | 'env' | 'runtime';
}

const runtimeConfigs = new Map<PaymentProvider, ResolvedGatewayConfig>();

const ENV_BY_PROVIDER: Record<PaymentProvider, Partial<ResolvedGatewayConfig>> = {
  thawani: {
    apiSecret: process.env.THAWANI_SECRET_KEY,
    publicKey: process.env.THAWANI_PUBLISHABLE_KEY,
    sandbox: process.env.THAWANI_SANDBOX !== 'false',
  },
  stripe: {
    apiSecret: process.env.STRIPE_SECRET_KEY,
    publicKey: process.env.STRIPE_PUBLISHABLE_KEY,
    sandbox: process.env.STRIPE_SANDBOX === 'true',
  },
  paypal: {
    apiKey: process.env.PAYPAL_CLIENT_ID,
    apiSecret: process.env.PAYPAL_CLIENT_SECRET,
    sandbox: process.env.PAYPAL_SANDBOX !== 'false',
  },
  telr: {
    merchantId: process.env.TELR_STORE_ID,
    apiSecret: process.env.TELR_AUTH_KEY,
    sandbox: process.env.TELR_SANDBOX === 'true',
  },
  cmi: {
    merchantId: process.env.CMI_MERCHANT_ID,
    apiSecret: process.env.CMI_API_KEY,
    storeKey: process.env.CMI_STORE_KEY,
    sandbox: process.env.CMI_SANDBOX !== 'false',
  },
  'network-intl': {
    apiSecret: process.env.NI_API_KEY,
    outletRef: process.env.NI_OUTLET_REF,
    sandbox: process.env.NI_SANDBOX !== 'false',
  },
  hyperpay: {
    entityId: process.env.HYPERPAY_ENTITY_ID,
    accessToken: process.env.HYPERPAY_ACCESS_TOKEN,
    sandbox: process.env.HYPERPAY_SANDBOX !== 'false',
  },
  payfort: {
    merchantId: process.env.PAYFORT_MERCHANT_IDENTIFIER,
    accessToken: process.env.PAYFORT_ACCESS_CODE,
    sandbox: process.env.PAYFORT_SANDBOX !== 'false',
  },
  myfatoorah: {
    apiSecret: process.env.MF_API_KEY,
    sandbox: process.env.MF_SANDBOX !== 'false',
  },
  paytabs: {
    profileId: process.env.PAYTABS_PROFILE_ID,
    apiSecret: process.env.PAYTABS_SERVER_KEY,
    publicKey: process.env.PAYTABS_CLIENT_KEY,
    sandbox: process.env.PAYTABS_SANDBOX !== 'false',
  },
  tap: {
    apiSecret: process.env.TAP_SECRET_KEY,
    publicKey: process.env.TAP_PUBLIC_KEY,
    sandbox: process.env.TAP_SANDBOX !== 'false',
  },
};

function emptyConfig(): ResolvedGatewayConfig {
  return {
    isEnabled: false,
    sandbox: true,
    apiKey: '',
    apiSecret: '',
    merchantId: '',
    storeKey: '',
    outletRef: '',
    profileId: '',
    entityId: '',
    accessToken: '',
    publicKey: '',
    source: 'env',
  };
}

function str(value: string | null | undefined): string {
  return (value || '').trim();
}

function hasCredentials(config: ResolvedGatewayConfig): boolean {
  return !!(
    config.apiSecret ||
    config.apiKey ||
    config.merchantId ||
    config.accessToken ||
    config.storeKey
  );
}

function mapDbRow(row: PaymentGatewayConfig): ResolvedGatewayConfig {
  return {
    isEnabled: row.isEnabled,
    sandbox: row.sandbox,
    apiKey: str(row.apiKey),
    apiSecret: str(row.apiSecret),
    merchantId: str(row.merchantId),
    storeKey: str(row.storeKey),
    outletRef: str(row.outletRef),
    profileId: str(row.profileId),
    entityId: str(row.entityId),
    accessToken: str(row.accessToken),
    publicKey: str(row.publicKey),
    source: 'db',
  };
}

function mapEnv(provider: PaymentProvider): ResolvedGatewayConfig {
  const env = ENV_BY_PROVIDER[provider] || {};
  const config = emptyConfig();
  config.source = 'env';
  config.isEnabled = hasCredentials({
    ...config,
    apiKey: str(env.apiKey),
    apiSecret: str(env.apiSecret),
    merchantId: str(env.merchantId),
    accessToken: str(env.accessToken),
    storeKey: str(env.storeKey),
  });
  config.sandbox = env.sandbox ?? true;
  config.apiKey = str(env.apiKey);
  config.apiSecret = str(env.apiSecret);
  config.merchantId = str(env.merchantId);
  config.storeKey = str(env.storeKey);
  config.outletRef = str(env.outletRef);
  config.profileId = str(env.profileId);
  config.entityId = str(env.entityId);
  config.accessToken = str(env.accessToken);
  config.publicKey = str(env.publicKey);
  return config;
}

export function setRuntimeGatewayConfig(
  provider: PaymentProvider,
  config: ResolvedGatewayConfig
): void {
  runtimeConfigs.set(provider, { ...config, source: 'runtime' });
}

export function clearRuntimeGatewayConfig(provider: PaymentProvider): void {
  runtimeConfigs.delete(provider);
}

export function getRuntimeGatewayConfig(
  provider: PaymentProvider
): ResolvedGatewayConfig | undefined {
  return runtimeConfigs.get(provider);
}

/** قراءة sync أثناء استدعاء البوابة (runtime → env) */
export function getGatewayField(
  provider: PaymentProvider,
  field: keyof ResolvedGatewayConfig
): string | boolean {
  const runtime = runtimeConfigs.get(provider);
  if (runtime && field in runtime) {
    const value = runtime[field];
    if (typeof value === 'boolean') return value;
    return str(String(value ?? ''));
  }
  const env = mapEnv(provider);
  const value = env[field];
  if (typeof value === 'boolean') return value;
  return str(String(value ?? ''));
}

export async function resolveGatewayConfig(
  provider: PaymentProvider
): Promise<ResolvedGatewayConfig> {
  const runtime = runtimeConfigs.get(provider);
  if (runtime) return runtime;

  const row = await prisma.paymentGatewayConfig.findUnique({ where: { provider } });
  if (row) return mapDbRow(row);
  return mapEnv(provider);
}

export async function isGatewayActive(provider: PaymentProvider): Promise<boolean> {
  const config = await resolveGatewayConfig(provider);
  return config.isEnabled && hasCredentials(config);
}

export function hasGatewayCredentials(config: ResolvedGatewayConfig): boolean {
  return hasCredentials(config);
}

export function isMaskedSecret(value: string | undefined): boolean {
  return !!value && value.includes('****');
}
