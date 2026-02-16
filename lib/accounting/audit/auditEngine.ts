/**
 * Audit & Compliance Engine
 * Immutable Audit Trail - لا تعديل بدون أثر تدقيقي
 * كل إجراء: موقّت | مرتبط بمستخدم | مرتبط بسبب | قابل للتتبع
 */

import type { AuditLogEntry, AuditAction } from '../domain/types';
import { getStored, saveStored } from '../data/storage';
import { STORAGE_KEYS } from '../data/storage';

function generateId(): string {
  return `AUD-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function appendAuditLog(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): AuditLogEntry {
  const full: AuditLogEntry = {
    ...entry,
    id: generateId(),
    timestamp: new Date().toISOString(),
  };
  const logs = getStored<AuditLogEntry>(STORAGE_KEYS.AUDIT);
  logs.push(full);
  saveStored(STORAGE_KEYS.AUDIT, logs);
  return full;
}

export function getAuditLog(filters?: {
  entityType?: string;
  entityId?: string;
  action?: AuditAction;
  fromDate?: string;
  toDate?: string;
}): AuditLogEntry[] {
  let logs = getStored<AuditLogEntry>(STORAGE_KEYS.AUDIT);
  if (filters?.entityType) logs = logs.filter((l) => l.entityType === filters.entityType);
  if (filters?.entityId) logs = logs.filter((l) => l.entityId === filters.entityId);
  if (filters?.action) logs = logs.filter((l) => l.action === filters.action);
  if (filters?.fromDate) logs = logs.filter((l) => l.timestamp >= filters.fromDate!);
  if (filters?.toDate) logs = logs.filter((l) => l.timestamp <= filters.toDate!);
  return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export function getEntityAuditChain(entityId: string, entityType: string): AuditLogEntry[] {
  return getAuditLog({ entityId, entityType });
}
