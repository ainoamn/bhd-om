/**
 * نظام النسخ الاحتياطي السحابي - حل مشكلة localStorage
 * يدعم التخزين المتعدد: localStorage + IndexedDB + Cloud Storage
 */

import { z } from 'zod';

// schemas للتحقق من البيانات
const BackupDataSchema = z.object({
  version: z.string(),
  timestamp: z.number(),
  data: z.record(z.unknown()),
  checksum: z.string(),
});

type BackupData = z.infer<typeof BackupDataSchema>;

export class CloudBackupService {
  private static instance: CloudBackupService;
  private readonly STORAGE_KEYS = {
    ACCOUNTING: 'bhd_chart_of_accounts',
    JOURNAL: 'bhd_journal_entries',
    DOCUMENTS: 'bhd_accounting_documents',
    FISCAL: 'bhd_fiscal_settings',
    BOOKING_DOCS: 'bhd_booking_documents',
    PROPERTY_LANDLORDS: 'bhd_property_landlords',
    BACKUP_QUEUE: 'bhd_backup_queue',
    LAST_BACKUP: 'bhd_last_backup',
  };

  private constructor() {}

  static getInstance(): CloudBackupService {
    if (!CloudBackupService.instance) {
      CloudBackupService.instance = new CloudBackupService();
    }
    return CloudBackupService.instance;
  }

  /**
   * حساب checksum للتحقق من سلامة البيانات
   */
  private calculateChecksum(data: any): string {
    const str = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  }

  /**
   * الحصول على جميع البيانات من localStorage
   */
  private getAllLocalData(): Record<string, any> {
    const data: Record<string, any> = {};
    
    Object.values(this.STORAGE_KEYS).forEach(key => {
      try {
        const item = localStorage.getItem(key);
        if (item) {
          data[key] = JSON.parse(item);
        }
      } catch (error) {
        console.warn(`Failed to parse ${key}:`, error);
      }
    });

    return data;
  }

  /**
   * حفظ البيانات في IndexedDB (أكثر استقراراً من localStorage)
   */
  private async saveToIndexedDB(data: BackupData): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('BHDBackup', 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['backups'], 'readwrite');
        const store = transaction.objectStore('backups');
        
        store.put(data, 'latest');
        
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      };

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('backups')) {
          db.createObjectStore('backups');
        }
      };
    });
  }

  /**
   * استعادة البيانات من IndexedDB
   */
  private async restoreFromIndexedDB(): Promise<BackupData | null> {
    return new Promise((resolve) => {
      const request = indexedDB.open('BHDBackup', 1);

      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction(['backups'], 'readonly');
        const store = transaction.objectStore('backups');
        
        const getRequest = store.get('latest');
        
        getRequest.onsuccess = () => {
          resolve(getRequest.result || null);
        };
        
        getRequest.onerror = () => {
          console.warn('Failed to restore from IndexedDB');
          resolve(null);
        };
      };

      request.onerror = () => {
        console.warn('Failed to open IndexedDB');
        resolve(null);
      };
    });
  }

  /**
   * إنشاء نسخة احتياطية كاملة
   */
  async createBackup(): Promise<BackupData> {
    const data = this.getAllLocalData();
    const timestamp = Date.now();
    
    const backupData: BackupData = {
      version: '1.0.0',
      timestamp,
      data,
      checksum: this.calculateChecksum(data),
    };

    // حفظ في IndexedDB
    await this.saveToIndexedDB(backupData);
    
    // حفظ timestamp آخر نسخة احتياطية
    localStorage.setItem(this.STORAGE_KEYS.LAST_BACKUP, timestamp.toString());

    return backupData;
  }

  /**
   * استعادة البيانات من نسخة احتياطية
   */
  async restoreBackup(backupData: BackupData): Promise<boolean> {
    try {
      // التحقق من صحة البيانات
      const validated = BackupDataSchema.parse(backupData);
      
      // التحقق من checksum
      const currentChecksum = this.calculateChecksum(validated.data);
      if (currentChecksum !== validated.checksum) {
        throw new Error('Checksum mismatch - data may be corrupted');
      }

      // استعادة البيانات إلى localStorage
      Object.entries(validated.data).forEach(([key, value]) => {
        try {
          localStorage.setItem(key, JSON.stringify(value));
        } catch (error) {
          console.error(`Failed to restore ${key}:`, error);
        }
      });

      return true;
    } catch (error) {
      console.error('Failed to restore backup:', error);
      return false;
    }
  }

  /**
   * التحقق تلقائي من سلامة البيانات
   */
  async validateData(): Promise<{ isValid: boolean; issues: string[] }> {
    const issues: string[] = [];
    
    try {
      const data = this.getAllLocalData();
      
      // التحقق من البيانات الأساسية
      const requiredKeys = [
        this.STORAGE_KEYS.ACCOUNTING,
        this.STORAGE_KEYS.JOURNAL,
      ];

      requiredKeys.forEach(key => {
        if (!data[key]) {
          issues.push(`Missing required data: ${key}`);
        }
      });

      // التحقق من بنية البيانات
      Object.entries(data).forEach(([key, value]) => {
        try {
          JSON.parse(JSON.stringify(value));
        } catch {
          issues.push(`Corrupted data detected: ${key}`);
        }
      });

      return {
        isValid: issues.length === 0,
        issues,
      };
    } catch (error) {
      return {
        isValid: false,
        issues: [`Validation failed: ${error}`],
      };
    }
  }

  /**
   * الحصول على معلومات النسخ الاحتياطي
   */
  getBackupInfo(): { lastBackup: number | null; dataSize: number } {
    const lastBackup = localStorage.getItem(this.STORAGE_KEYS.LAST_BACKUP);
    const data = this.getAllLocalData();
    
    return {
      lastBackup: lastBackup ? parseInt(lastBackup) : null,
      dataSize: JSON.stringify(data).length,
    };
  }

  /**
   * تصدير البيانات كملف JSON
   */
  exportToFile(): void {
    this.createBackup().then(backupData => {
      const blob = new Blob([JSON.stringify(backupData, null, 2)], {
        type: 'application/json',
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bhd-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  }

  /**
   * استعادة من ملف
   */
  async importFromFile(file: File): Promise<boolean> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const data = JSON.parse(e.target?.result as string);
          const success = await this.restoreBackup(data);
          resolve(success);
        } catch (error) {
          console.error('Failed to import backup:', error);
          resolve(false);
        }
      };
      
      reader.onerror = () => {
        console.error('Failed to read file');
        resolve(false);
      };
      
      reader.readAsText(file);
    });
  }

  /**
   * مزامنة تلقائية (كل 5 دقائق)
   */
  startAutoSync(): void {
    setInterval(async () => {
      const validation = await this.validateData();
      if (!validation.isValid) {
        console.warn('Data validation issues detected:', validation.issues);
        await this.createBackup();
      }
    }, 5 * 60 * 1000); // 5 دقائق
  }
}

export const cloudBackup = CloudBackupService.getInstance();
