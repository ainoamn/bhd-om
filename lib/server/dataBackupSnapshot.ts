import type { PrismaClient } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import { seedPlansOnly } from '@/lib/server/dataResetKeepProperties';

export const SNAPSHOT_VERSION = 2 as const;

export type DatabaseSnapshotV2 = {
  version: typeof SNAPSHOT_VERSION;
  exportedAt: string;
  plans: Prisma.PlanGetPayload<object>[];
  users: Prisma.UserGetPayload<object>[];
  organizations: Prisma.OrganizationGetPayload<object>[];
  properties: Prisma.PropertyGetPayload<object>[];
  propertyBookings: Prisma.PropertyBookingGetPayload<object>[];
  serialCounters: Prisma.SerialCounterGetPayload<object>[];
  serialNumberHistories: Prisma.SerialNumberHistoryGetPayload<object>[];
  contactSubmissions: Prisma.ContactSubmissionGetPayload<object>[];
  bookingStorages: Prisma.BookingStorageGetPayload<object>[];
  bookingDocumentFiles: Array<
    Omit<Prisma.BookingDocumentFileGetPayload<object>, 'content'> & { contentBase64: string }
  >;
  addressBookContacts: Prisma.AddressBookContactGetPayload<object>[];
  siteContents: Prisma.SiteContentGetPayload<object>[];
  appSettings: Prisma.AppSettingGetPayload<object>[];
  projects: Prisma.ProjectGetPayload<object>[];
  tasks: Prisma.TaskGetPayload<object>[];
  documents: Prisma.DocumentGetPayload<object>[];
  accounts: Prisma.AccountGetPayload<object>[];
  transactions: Prisma.TransactionGetPayload<object>[];
  subscriptions: Prisma.SubscriptionGetPayload<object>[];
  subscriptionHistories: Prisma.SubscriptionHistoryGetPayload<object>[];
  subscriptionChangeRequests: Prisma.SubscriptionChangeRequestGetPayload<object>[];
  accountingAccounts: Prisma.AccountingAccountGetPayload<object>[];
  accountingJournalEntries: Prisma.AccountingJournalEntryGetPayload<object>[];
  accountingJournalLines: Prisma.AccountingJournalLineGetPayload<object>[];
  accountingDocuments: Prisma.AccountingDocumentGetPayload<object>[];
  accountingFiscalPeriods: Prisma.AccountingFiscalPeriodGetPayload<object>[];
  accountingAuditLogs: Prisma.AccountingAuditLogGetPayload<object>[];
  userAccountingRoles: Prisma.UserAccountingRoleGetPayload<object>[];
};

async function deleteAccountingAccountsLeavesTx(tx: Prisma.TransactionClient): Promise<void> {
  for (;;) {
    const leaf = await tx.accountingAccount.findFirst({
      where: { children: { none: {} } },
      select: { id: true },
    });
    if (!leaf) break;
    await tx.accountingAccount.delete({ where: { id: leaf.id } });
  }
}

/** مسح كامل للاستعادة من نسخة احتياطية (يشمل العقارات وجميع المستخدمين). */
export async function executeWipeAllForRestore(prisma: PrismaClient): Promise<void> {
  await prisma.$transaction(
    async (tx) => {
      await tx.propertyBooking.deleteMany();
      await tx.bookingStorage.deleteMany();
      await tx.bookingDocumentFile.deleteMany();
      await tx.contactSubmission.deleteMany();
      await tx.addressBookContact.deleteMany();

      await tx.subscriptionChangeRequest.deleteMany();
      await tx.subscriptionHistory.deleteMany();
      await tx.subscription.deleteMany();

      await tx.transaction.deleteMany();
      await tx.account.deleteMany();

      await tx.task.deleteMany();
      await tx.document.deleteMany();
      await tx.serialNumberHistory.deleteMany();
      await tx.project.deleteMany();

      await tx.property.deleteMany();

      await tx.user.updateMany({ data: { organizationId: null } });
      await tx.organization.deleteMany();

      await tx.siteContent.deleteMany();
      await tx.appSetting.deleteMany();

      await tx.accountingJournalLine.deleteMany();
      await tx.accountingJournalEntry.deleteMany();
      await tx.accountingDocument.deleteMany();
      await tx.accountingAuditLog.deleteMany();
      await tx.accountingFiscalPeriod.deleteMany();
      await tx.userAccountingRole.deleteMany();
      await deleteAccountingAccountsLeavesTx(tx);

      await tx.user.deleteMany();
      await tx.plan.deleteMany();
    },
    { timeout: 300_000, maxWait: 120_000 }
  );
}

export async function exportDatabaseSnapshot(prisma: PrismaClient): Promise<DatabaseSnapshotV2> {
  const files = await prisma.bookingDocumentFile.findMany();
  return {
    version: SNAPSHOT_VERSION,
    exportedAt: new Date().toISOString(),
    plans: await prisma.plan.findMany(),
    users: await prisma.user.findMany(),
    organizations: await prisma.organization.findMany(),
    properties: await prisma.property.findMany(),
    propertyBookings: await prisma.propertyBooking.findMany(),
    serialCounters: await prisma.serialCounter.findMany(),
    serialNumberHistories: await prisma.serialNumberHistory.findMany(),
    contactSubmissions: await prisma.contactSubmission.findMany(),
    bookingStorages: await prisma.bookingStorage.findMany(),
    bookingDocumentFiles: files.map((r) => {
      const { content, ...rest } = r;
      return {
        ...rest,
        contentBase64: Buffer.from(content).toString('base64'),
      };
    }),
    addressBookContacts: await prisma.addressBookContact.findMany(),
    siteContents: await prisma.siteContent.findMany(),
    appSettings: await prisma.appSetting.findMany(),
    projects: await prisma.project.findMany(),
    tasks: await prisma.task.findMany(),
    documents: await prisma.document.findMany(),
    accounts: await prisma.account.findMany(),
    transactions: await prisma.transaction.findMany(),
    subscriptions: await prisma.subscription.findMany(),
    subscriptionHistories: await prisma.subscriptionHistory.findMany(),
    subscriptionChangeRequests: await prisma.subscriptionChangeRequest.findMany(),
    accountingAccounts: await prisma.accountingAccount.findMany(),
    accountingJournalEntries: await prisma.accountingJournalEntry.findMany(),
    accountingJournalLines: await prisma.accountingJournalLine.findMany(),
    accountingDocuments: await prisma.accountingDocument.findMany(),
    accountingFiscalPeriods: await prisma.accountingFiscalPeriod.findMany(),
    accountingAuditLogs: await prisma.accountingAuditLog.findMany(),
    userAccountingRoles: await prisma.userAccountingRole.findMany(),
  };
}

function sortAccountsForInsert(
  rows: Prisma.AccountingAccountGetPayload<object>[]
): Prisma.AccountingAccountGetPayload<object>[] {
  const byId = new Map(rows.map((r) => [r.id, r]));
  const result: Prisma.AccountingAccountGetPayload<object>[] = [];
  const visited = new Set<string>();
  function visit(id: string) {
    if (visited.has(id)) return;
    const row = byId.get(id);
    if (!row) return;
    if (row.parentId) visit(row.parentId);
    visited.add(id);
    result.push(row);
  }
  for (const r of rows) visit(r.id);
  return result;
}

/** استعادة كاملة من لقطة — يمسح القاعدة أولاً. */
export async function importDatabaseSnapshot(prisma: PrismaClient, data: DatabaseSnapshotV2): Promise<void> {
  if (data.version !== SNAPSHOT_VERSION) {
    throw new Error(`Unsupported snapshot version: ${data.version}`);
  }

  await executeWipeAllForRestore(prisma);

  await prisma.$transaction(
    async (tx) => {
      if (data.plans.length) {
        await tx.plan.createMany({ data: data.plans });
      } else {
        await seedPlansOnly(tx);
      }

      if (data.users.length) {
        const usersStripped = data.users.map((u) => ({ ...u, organizationId: null as string | null }));
        await tx.user.createMany({ data: usersStripped });
      }

      if (data.organizations.length) {
        await tx.organization.createMany({ data: data.organizations });
      }

      for (const u of data.users) {
        if (u.organizationId) {
          await tx.user.update({
            where: { id: u.id },
            data: { organizationId: u.organizationId },
          });
        }
      }

      if (data.properties.length) {
        await tx.property.createMany({ data: data.properties });
      }

      if (data.propertyBookings.length) {
        await tx.propertyBooking.createMany({ data: data.propertyBookings });
      }

      if (data.serialCounters.length) {
        await tx.serialCounter.createMany({ data: data.serialCounters });
      }

      if (data.serialNumberHistories.length) {
        await tx.serialNumberHistory.createMany({ data: data.serialNumberHistories });
      }

      if (data.contactSubmissions.length) {
        await tx.contactSubmission.createMany({ data: data.contactSubmissions });
      }

      if (data.bookingStorages.length) {
        await tx.bookingStorage.createMany({ data: data.bookingStorages });
      }

      for (const f of data.bookingDocumentFiles) {
        const { contentBase64, ...rest } = f;
        await tx.bookingDocumentFile.create({
          data: {
            ...rest,
            content: Buffer.from(contentBase64, 'base64'),
          },
        });
      }

      if (data.addressBookContacts.length) {
        await tx.addressBookContact.createMany({
          data: data.addressBookContacts.map((r) => ({
            ...r,
            data: r.data as Prisma.InputJsonValue,
          })),
        });
      }

      if (data.siteContents.length) {
        await tx.siteContent.createMany({ data: data.siteContents });
      }

      if (data.appSettings.length) {
        await tx.appSetting.createMany({ data: data.appSettings });
      }

      if (data.projects.length) {
        await tx.project.createMany({ data: data.projects });
      }

      if (data.tasks.length) {
        await tx.task.createMany({ data: data.tasks });
      }

      if (data.documents.length) {
        await tx.document.createMany({ data: data.documents });
      }

      if (data.accounts.length) {
        await tx.account.createMany({ data: data.accounts });
      }

      if (data.transactions.length) {
        await tx.transaction.createMany({ data: data.transactions });
      }

      if (data.subscriptions.length) {
        await tx.subscription.createMany({ data: data.subscriptions });
      }

      if (data.subscriptionHistories.length) {
        await tx.subscriptionHistory.createMany({ data: data.subscriptionHistories });
      }

      if (data.subscriptionChangeRequests.length) {
        await tx.subscriptionChangeRequest.createMany({ data: data.subscriptionChangeRequests });
      }

      const accSorted = sortAccountsForInsert(data.accountingAccounts);
      for (const a of accSorted) {
        await tx.accountingAccount.create({ data: a });
      }

      if (data.accountingJournalEntries.length) {
        await tx.accountingJournalEntry.createMany({ data: data.accountingJournalEntries });
      }

      if (data.accountingJournalLines.length) {
        await tx.accountingJournalLine.createMany({ data: data.accountingJournalLines });
      }

      if (data.accountingDocuments.length) {
        await tx.accountingDocument.createMany({ data: data.accountingDocuments });
      }

      if (data.accountingFiscalPeriods.length) {
        await tx.accountingFiscalPeriod.createMany({ data: data.accountingFiscalPeriods });
      }

      if (data.accountingAuditLogs.length) {
        await tx.accountingAuditLog.createMany({ data: data.accountingAuditLogs });
      }

      if (data.userAccountingRoles.length) {
        await tx.userAccountingRole.createMany({ data: data.userAccountingRoles });
      }
    },
    { timeout: 300_000, maxWait: 120_000 }
  );
}
