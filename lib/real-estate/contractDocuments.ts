export type ContractDocumentCategory =
  | 'contract'
  | 'municipal'
  | 'identity'
  | 'all_documents';

export type ContractDocumentItem = {
  category: ContractDocumentCategory;
  titleAr: string;
  titleEn: string;
  name: string;
  fileId?: string;
  attachmentRelativePath?: string;
  storedOnDisk?: boolean;
};

export const CONTRACT_DOCUMENT_SLOTS: {
  category: ContractDocumentCategory;
  titleAr: string;
  titleEn: string;
}[] = [
  { category: 'contract', titleAr: 'عقد الإيجار', titleEn: 'Tenancy contract' },
  { category: 'municipal', titleAr: 'استمارة بلدية', titleEn: 'Municipal form' },
  { category: 'identity', titleAr: 'هوية المستأجر', titleEn: 'Tenant ID' },
];

export function documentsFromPayload(payload: Record<string, unknown> | undefined): ContractDocumentItem[] {
  if (!payload) return [];
  let raw: unknown[] = [];
  if (Array.isArray(payload.propertyDocumentsBundle)) {
    raw = payload.propertyDocumentsBundle;
  } else if (typeof payload.propertyDocumentsBundleJson === 'string') {
    try {
      const parsed = JSON.parse(payload.propertyDocumentsBundleJson);
      if (Array.isArray(parsed)) raw = parsed;
    } catch {
      raw = [];
    }
  }
  return raw
    .filter((d) => d && typeof d === 'object')
    .map((d) => {
      const row = d as Record<string, unknown>;
      const category = String(row.category || 'contract') as ContractDocumentCategory;
      return {
        category,
        titleAr: String(row.titleAr || row.labelAr || row.name || ''),
        titleEn: String(row.titleEn || row.labelEn || row.name || ''),
        name: String(row.name || row.attachmentName || row.titleAr || row.titleEn || ''),
        fileId: row.fileId ? String(row.fileId) : row.attachmentFileId ? String(row.attachmentFileId) : undefined,
        attachmentRelativePath: row.attachmentRelativePath
          ? String(row.attachmentRelativePath)
          : row.relativePath
            ? String(row.relativePath)
            : undefined,
        storedOnDisk: !!(row.storedOnDisk || row.fileId || row.attachmentRelativePath || row.relativePath),
      };
    });
}

export function documentsToPayloadBundle(docs: ContractDocumentItem[]): Record<string, unknown>[] {
  return docs.map((d) => ({
    category: d.category,
    titleAr: d.titleAr,
    titleEn: d.titleEn,
    name: d.name,
    attachmentName: d.name,
    fileId: d.fileId,
    attachmentFileId: d.fileId,
    attachmentRelativePath: d.attachmentRelativePath,
    relativePath: d.attachmentRelativePath,
    storedOnDisk: !!d.storedOnDisk,
  }));
}

export function mergeDocumentsIntoPayload(
  payload: Record<string, unknown>,
  docs: ContractDocumentItem[]
): Record<string, unknown> {
  const bundle = documentsToPayloadBundle(docs);
  const hasCombined = bundle.some((d) => d.category === 'all_documents');
  const mandatoryPresent = new Set(
    bundle.filter((d) => d.category !== 'all_documents').map((d) => d.category)
  );
  const mandatoryComplete =
    hasCombined || ['contract', 'municipal', 'identity'].every((k) => mandatoryPresent.has(k));
  return {
    ...payload,
    propertyDocumentsBundle: bundle,
    propertyDocumentsBundleJson: JSON.stringify(bundle),
    propertyDocumentsComplete: mandatoryComplete,
    propertyDocumentsCompletedAt: mandatoryComplete ? new Date().toISOString() : payload.propertyDocumentsCompletedAt,
  };
}

export function upsertDocument(
  docs: ContractDocumentItem[],
  item: ContractDocumentItem
): ContractDocumentItem[] {
  const next = docs.filter((d) => d.category !== item.category);
  return [...next, item];
}
