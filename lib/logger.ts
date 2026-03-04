/**
 * نظام تسجيل أخطاء مركزي - بديل لـ console.log في الإنتاج
 * يدعم مستويات مختلفة من التسجيل وإرسال للخدمات الخارجية
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';
type LogContext = Record<string, any>;

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  stack?: string;
  url?: string;
  userAgent?: string;
  userId?: string;
}

class Logger {
  private static instance: Logger;
  private logs: LogEntry[] = [];
  private maxLogs = 1000;
  private isDevelopment = process.env.NODE_ENV === 'development';

  private constructor() {
    // إرسال الأخطاء للخدمات الخارجية في الإنتاج
    if (!this.isDevelopment) {
      this.setupGlobalErrorHandlers();
    }
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private setupGlobalErrorHandlers(): void {
    // التقاط الأخطاء غير المعالجة
    window.addEventListener('error', (event) => {
      this.error('Unhandled Error', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack,
      });
    });

    // التقاط Promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.error('Unhandled Promise Rejection', {
        reason: event.reason,
        stack: event.reason?.stack,
      });
    });
  }

  private createLogEntry(level: LogLevel, message: string, context?: LogContext): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      url: window.location.href,
      userAgent: navigator.userAgent,
      userId: this.getCurrentUserId(),
    };
  }

  private getCurrentUserId(): string | undefined {
    try {
      // محاولة الحصول على userId من session أو localStorage
      const session = localStorage.getItem('next-auth.session-token');
      if (session) return 'authenticated-user';
      
      const userData = localStorage.getItem('user-data');
      if (userData) {
        const user = JSON.parse(userData);
        return user.id || user.serialNumber;
      }
      
      return undefined;
    } catch {
      return undefined;
    }
  }

  private log(level: LogLevel, message: string, context?: LogContext): void {
    const entry = this.createLogEntry(level, message, context);
    
    // إضافة للسجل المحلي
    this.logs.push(entry);
    
    // الحفاظ على حجم السجل
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // في وضع التطوير، استخدم console
    if (this.isDevelopment) {
      this.logToConsole(level, message, context);
    } else {
      // في الإنتاج، أرسل للخدمات الخارجية
      this.sendToExternalService(entry);
    }
  }

  private logToConsole(level: LogLevel, message: string, context?: LogContext): void {
    const timestamp = new Date().toLocaleTimeString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    
    switch (level) {
      case 'debug':
        console.debug(prefix, message, context);
        break;
      case 'info':
        console.info(prefix, message, context);
        break;
      case 'warn':
        console.warn(prefix, message, context);
        break;
      case 'error':
        console.error(prefix, message, context);
        break;
    }
  }

  private async sendToExternalService(entry: LogEntry): Promise<void> {
    try {
      // إرسال للخدمات الخارجية (Sentry, LogRocket, etc.)
      // حالياً، نخزن في localStorage للإرسال لاحقاً
      const pendingLogs = localStorage.getItem('bhd_pending_logs') || '[]';
      const logs = JSON.parse(pendingLogs);
      logs.push(entry);
      
      // الحفاظ على حجم السجل المعلق
      if (logs.length > 100) {
        logs.splice(0, logs.length - 100);
      }
      
      localStorage.setItem('bhd_pending_logs', JSON.stringify(logs));
      
      // محاولة الإرسال الفوري للأخطاء الحرجة
      if (entry.level === 'error') {
        await this.flushLogs();
      }
    } catch (error) {
      // فشل الإرسال - نخزن محلياً فقط
      console.warn('Failed to send log to external service:', error);
    }
  }

  private async flushLogs(): Promise<void> {
    try {
      const pendingLogs = localStorage.getItem('bhd_pending_logs');
      if (!pendingLogs) return;

      const logs = JSON.parse(pendingLogs);
      if (logs.length === 0) return;

      // هنا يمكن إرسال إلى خدمة خارجية
      // await fetch('/api/logs', { method: 'POST', body: JSON.stringify(logs) });
      
      // مسح السجل المعلق بعد الإرسال الناجح
      localStorage.removeItem('bhd_pending_logs');
    } catch (error) {
      console.warn('Failed to flush logs:', error);
    }
  }

  // واجهات عامة
  debug(message: string, context?: LogContext): void {
    this.log('debug', message, context);
  }

  info(message: string, context?: LogContext): void {
    this.log('info', message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.log('warn', message, context);
  }

  error(message: string, context?: LogContext): void {
    this.log('error', message, context);
  }

  // دوال مساعدة
  apiError(endpoint: string, error: any, context?: LogContext): void {
    this.error(`API Error: ${endpoint}`, {
      ...context,
      error: error.message || error,
      status: error.status,
      stack: error.stack,
    });
  }

  userAction(action: string, context?: LogContext): void {
    this.info(`User Action: ${action}`, context);
  }

  performance(metric: string, value: number, context?: LogContext): void {
    this.info(`Performance: ${metric}`, {
      ...context,
      value,
      unit: 'ms',
    });
  }

  // الحصول على السجلات
  getLogs(level?: LogLevel): LogEntry[] {
    return level 
      ? this.logs.filter(log => log.level === level)
      : [...this.logs];
  }

  // تصدير السجلات
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  // مسح السجلات
  clearLogs(): void {
    this.logs = [];
    localStorage.removeItem('bhd_pending_logs');
  }

  // الحصول على إحصائيات
  getStats(): Record<string, number> {
    const stats = {
      total: this.logs.length,
      debug: 0,
      info: 0,
      warn: 0,
      error: 0,
    };

    this.logs.forEach(log => {
      stats[log.level]++;
    });

    return stats;
  }
}

export const logger = Logger.getInstance();

// تصدير دوال مختصرة للاستخدام السهل
export const log = {
  debug: (message: string, context?: LogContext) => logger.debug(message, context),
  info: (message: string, context?: LogContext) => logger.info(message, context),
  warn: (message: string, context?: LogContext) => logger.warn(message, context),
  error: (message: string, context?: LogContext) => logger.error(message, context),
  apiError: (endpoint: string, error: any, context?: LogContext) => logger.apiError(endpoint, error, context),
  userAction: (action: string, context?: LogContext) => logger.userAction(action, context),
  performance: (metric: string, value: number, context?: LogContext) => logger.performance(metric, value, context),
};
