'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Icon from '@/components/icons/Icon';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import AdminToolbar from '@/components/admin/AdminToolbar';
import { log } from '@/lib/logger';
import {
  CUSTOM_REPORT_SOURCES,
  downloadCsv,
  fetchCustomReportRows,
  rowsToCsv,
  type CustomReportSource,
} from '@/lib/admin/customReportExport';
import {
  deleteReportSchedule,
  hydrateReportSchedulesFromServer,
  listReportSchedules,
  markScheduleRun,
  REPORT_SCHEDULES_EVENT,
  upsertReportSchedule,
  type ReportSchedule,
  type ReportScheduleFrequency,
} from '@/lib/data/reportSchedules';

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  category: 'financial' | 'operational' | 'analytical' | 'compliance';
  icon: keyof typeof import('@/lib/icons').icons;
  fields: ReportField[];
  filters: ReportFilter[];
  schedule?: TemplateReportSchedule;
}

interface ReportField {
  id: string;
  name: string;
  type: 'text' | 'number' | 'date' | 'select' | 'checkbox' | 'multiselect';
  required: boolean;
  options?: string[];
}

interface ReportFilter {
  id: string;
  name: string;
  type: 'date' | 'select' | 'multiselect' | 'range';
  options?: string[];
}

interface TemplateReportSchedule {
  enabled: boolean;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  recipients: string[];
  format: 'pdf' | 'excel' | 'csv';
}

interface GeneratedReport {
  id: string;
  templateId: string;
  name: string;
  generatedAt: Date;
  status: 'generating' | 'completed' | 'failed';
  fileUrl?: string;
  size?: number;
}

export default function AdvancedReports() {
  const params = useParams();
  const locale = (params?.locale as string) || 'ar';
  const ar = locale === 'ar';
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [reportData, setReportData] = useState<Record<string, any>>({});
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [generatedReports, setGeneratedReports] = useState<GeneratedReport[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<'templates' | 'custom' | 'scheduled' | 'history'>('templates');
  const [customSource, setCustomSource] = useState<CustomReportSource>('bookings');
  const [customColumns, setCustomColumns] = useState<string[]>(() =>
    CUSTOM_REPORT_SOURCES.bookings.columns.map((c) => c.id)
  );
  const [customBusy, setCustomBusy] = useState(false);
  const [schedules, setSchedules] = useState<ReportSchedule[]>(() => listReportSchedules());
  const [scheduleForm, setScheduleForm] = useState({
    nameAr: '',
    nameEn: '',
    source: 'bookings' as CustomReportSource,
    frequency: 'weekly' as ReportScheduleFrequency,
    recipientEmail: '',
  });

  const reportTemplates: ReportTemplate[] = [
    {
      id: 'financial-summary',
      name: 'تقرير مالي شامل',
      description: 'تقرير شامل بالإيرادات والمصروفات والأرباح',
      category: 'financial',
      icon: 'chartBar',
      fields: [
        { id: 'period', name: 'الفترة', type: 'select', required: true, options: ['شهري', 'ربع سنوي', 'سنوي'] },
        { id: 'include-charts', name: 'تضمين الرسوم البيانية', type: 'checkbox', required: false },
        { id: 'currency', name: 'العملة', type: 'select', required: true, options: ['ر.ع', 'ر.س', '$'] },
      ],
      filters: [
        { id: 'date-range', name: 'نطاق التاريخ', type: 'date' },
        { id: 'account-type', name: 'نوع الحساب', type: 'select', options: ['الكل', 'الإيرادات', 'المصروفات'] },
      ],
      schedule: {
        enabled: true,
        frequency: 'monthly',
        recipients: ['manager@bhd-om.com'],
        format: 'pdf',
      },
    },
    {
      id: 'property-performance',
      name: 'أداء العقارات',
      description: 'تحليل أداء جميع العقارات والإشغال',
      category: 'operational',
      icon: 'building',
      fields: [
        { id: 'metrics', name: 'المقاييس', type: 'multiselect', required: true, options: ['الإشغال', 'الإيرادات', 'الصيانة', 'التقييمات'] },
        { id: 'comparison', name: 'مقارنة فترية', type: 'checkbox', required: false },
      ],
      filters: [
        { id: 'property-type', name: 'نوع العقار', type: 'select', options: ['الكل', 'سكني', 'تجاري', 'أرض'] },
        { id: 'status', name: 'الحالة', type: 'select', options: ['الكل', 'نشط', 'مؤجر', 'معروض'] },
        { id: 'location', name: 'الموقع', type: 'select', options: ['الكل', 'مسقط', 'صلالة', 'نزوى'] },
      ],
    },
    {
      id: 'user-analytics',
      name: 'تحليل المستخدمين',
      description: 'تقرير تفصيلي عن نشاط المستخدمين',
      category: 'analytical',
      icon: 'users',
      fields: [
        { id: 'user-type', name: 'نوع المستخدم', type: 'select', required: true, options: ['الكل', 'عملاء', 'ملاك', 'موظفين'] },
        { id: 'activity-level', name: 'مستوى النشاط', type: 'select', required: false, options: ['الكل', 'نشط', 'خامل'] },
      ],
      filters: [
        { id: 'registration-date', name: 'تاريخ التسجيل', type: 'date' },
        { id: 'last-login', name: 'آخر تسجيل دخول', type: 'date' },
      ],
    },
    {
      id: 'compliance-audit',
      name: 'تقرير الامتثال',
      description: 'تقرير التدقيق والامتثال التنظيمي',
      category: 'compliance',
      icon: 'shieldCheck',
      fields: [
        { id: 'audit-type', name: 'نوع التدقيق', type: 'select', required: true, options: ['أمن', 'خصوصية', 'مالي', 'تشغيلي'] },
        { id: 'risk-level', name: 'مستوى المخاطرة', type: 'select', required: false, options: ['منخفض', 'متوسط', 'عالي'] },
      ],
      filters: [
        { id: 'department', name: 'القسم', type: 'select', options: ['الكل', 'المالية', 'التقنية', 'الموارد البشرية'] },
      ],
    },
  ];

  useEffect(() => {
    loadGeneratedReports();
    void hydrateReportSchedulesFromServer();
    const onSchedules = () => setSchedules(listReportSchedules());
    window.addEventListener(REPORT_SCHEDULES_EVENT, onSchedules);
    return () => window.removeEventListener(REPORT_SCHEDULES_EVENT, onSchedules);
  }, []);

  useEffect(() => {
    setCustomColumns(CUSTOM_REPORT_SOURCES[customSource].columns.map((c) => c.id));
  }, [customSource]);

  const loadGeneratedReports = () => {
    try {
      const reports = JSON.parse(localStorage.getItem('generated_reports') || '[]');
      setGeneratedReports(reports);
    } catch (error) {
      log.error('Failed to load generated reports', { error });
    }
  };

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    setReportData({});
    setFilters({});
  };

  const handleFieldChange = (fieldId: string, value: any) => {
    setReportData(prev => ({
      ...prev,
      [fieldId]: value,
    }));
  };

  const handleFilterChange = (filterId: string, value: any) => {
    setFilters(prev => ({
      ...prev,
      [filterId]: value,
    }));
  };

  const generateReport = async () => {
    if (!selectedTemplate) return;

    setIsGenerating(true);
    try {
      const template = reportTemplates.find((t: ReportTemplate) => t.id === selectedTemplate);
      if (!template) return;

      // محاكاة إنشاء التقرير
      const reportDataForGeneration = {
        templateId: selectedTemplate,
        fields: reportData,
        filters: filters,
        generatedAt: new Date(),
      };

      // إنشاء معرف فريد للتقرير
      const reportId = `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const newReport: GeneratedReport = {
        id: reportId,
        templateId: selectedTemplate,
        name: template.name,
        generatedAt: new Date(),
        status: 'generating',
      };

      // إضافة التقرير للقائمة
      const updatedReports = [newReport, ...generatedReports];
      setGeneratedReports(updatedReports);
      localStorage.setItem('generated_reports', JSON.stringify(updatedReports));

      // محاكاة اكتمال الإنشاء
      setTimeout(() => {
        const completedReport = {
          ...newReport,
          status: 'completed' as const,
          fileUrl: `/reports/${reportId}.pdf`,
          size: Math.floor(Math.random() * 500000) + 100000, // 100KB - 600KB
        };

        const finalReports = updatedReports.map(r => 
          r.id === reportId ? completedReport : r
        );
        
        setGeneratedReports(finalReports);
        localStorage.setItem('generated_reports', JSON.stringify(finalReports));
        
        log.info('Report generated successfully', { 
          reportId, 
          templateId: selectedTemplate 
        });
      }, 3000);

    } catch (error) {
      log.error('Failed to generate report', { error });
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadReport = (report: GeneratedReport) => {
    if (report.fileUrl) {
      // محاكاة التحميل
      const link = document.createElement('a');
      link.href = report.fileUrl;
      link.download = `${report.name}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      log.userAction('report_download', { reportId: report.id });
    }
  };

  const deleteReport = (reportId: string) => {
    const updatedReports = generatedReports.filter(r => r.id !== reportId);
    setGeneratedReports(updatedReports);
    localStorage.setItem('generated_reports', JSON.stringify(updatedReports));
    
    log.userAction('report_delete', { reportId });
  };

  const pushGeneratedCsvReport = (name: string, size: number) => {
    const reportId = `csv_${Date.now()}`;
    const entry: GeneratedReport = {
      id: reportId,
      templateId: 'custom',
      name,
      generatedAt: new Date(),
      status: 'completed',
      size,
    };
    const updated = [entry, ...generatedReports];
    setGeneratedReports(updated);
    localStorage.setItem('generated_reports', JSON.stringify(updated));
    return reportId;
  };

  const runCustomExport = async (source: CustomReportSource, columnIds: string[], reportName: string) => {
    const rows = await fetchCustomReportRows(source);
    const csv = rowsToCsv(rows, columnIds);
    const size = downloadCsv(`${reportName.replace(/\s+/g, '-')}.csv`, csv);
    pushGeneratedCsvReport(reportName, size);
  };

  const generateCustomReport = async () => {
    if (customColumns.length === 0) return;
    setCustomBusy(true);
    try {
      const label = ar ? CUSTOM_REPORT_SOURCES[customSource].labelAr : CUSTOM_REPORT_SOURCES[customSource].labelEn;
      await runCustomExport(customSource, customColumns, `${label} — ${new Date().toISOString().slice(0, 10)}`);
    } catch (error) {
      log.error('Custom report export failed', { error });
      alert(ar ? 'فشل تصدير التقرير' : 'Report export failed');
    } finally {
      setCustomBusy(false);
    }
  };

  const saveSchedule = () => {
    if (!scheduleForm.nameAr.trim() || !scheduleForm.recipientEmail.trim()) {
      alert(ar ? 'أدخل الاسم والبريد' : 'Enter name and email');
      return;
    }
    const id = `sched_${Date.now()}`;
    upsertReportSchedule({
      id,
      nameAr: scheduleForm.nameAr.trim(),
      nameEn: scheduleForm.nameEn.trim() || scheduleForm.nameAr.trim(),
      source: scheduleForm.source,
      columnIds: CUSTOM_REPORT_SOURCES[scheduleForm.source].columns.map((c) => c.id),
      frequency: scheduleForm.frequency,
      recipientEmail: scheduleForm.recipientEmail.trim(),
      enabled: true,
      updatedAt: new Date().toISOString(),
    });
    setScheduleForm({ nameAr: '', nameEn: '', source: 'bookings', frequency: 'weekly', recipientEmail: '' });
    setSchedules(listReportSchedules());
  };

  const runScheduleNow = async (schedule: ReportSchedule) => {
    try {
      const label = ar ? schedule.nameAr : schedule.nameEn || schedule.nameAr;
      await runCustomExport(schedule.source, schedule.columnIds, label);
      markScheduleRun(schedule.id);
      setSchedules(listReportSchedules());
    } catch {
      alert(ar ? 'فشل تشغيل الجدولة' : 'Scheduled run failed');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat('ar-OM', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const getStatusIcon = (status: GeneratedReport['status']) => {
    switch (status) {
      case 'generating': return 'cog';
      case 'completed': return 'check';
      case 'failed': return 'x';
      default: return 'documentText';
    }
  };

  const getStatusColor = (status: GeneratedReport['status']) => {
    switch (status) {
      case 'generating': return 'text-blue-600 bg-blue-100';
      case 'completed': return 'text-green-600 bg-green-100';
      case 'failed': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const renderTemplateField = (field: ReportField) => {
    const value = reportData[field.id] || '';

    switch (field.type) {
      case 'text':
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            className="admin-input"
            placeholder={field.name}
          />
        );
      
      case 'number':
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            className="admin-input"
            placeholder={field.name}
          />
        );
      
      case 'date':
        return (
          <input
            type="date"
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            className="admin-input"
          />
        );
      
      case 'select':
        return (
          <select
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            className="admin-input"
          >
            <option value="">{field.name}</option>
            {field.options?.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        );
      
      case 'checkbox':
        return (
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={value}
              onChange={(e) => handleFieldChange(field.id, e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 admin-accent-text focus:ring-[color:var(--admin-primary)]"
            />
            <span>{field.name}</span>
          </label>
        );
      
      default:
        return null;
    }
  };

  const renderFilter = (filter: ReportFilter) => {
    const value = filters[filter.id] || '';

    switch (filter.type) {
      case 'date':
        return (
          <input
            type="date"
            value={value}
            onChange={(e) => handleFilterChange(filter.id, e.target.value)}
            className="admin-input"
          />
        );
      
      case 'select':
        return (
          <select
            value={value}
            onChange={(e) => handleFilterChange(filter.id, e.target.value)}
            className="admin-input"
          >
            <option value="">{filter.name}</option>
            {filter.options?.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        );
      
      case 'range':
        return (
          <div className="flex items-center gap-2">
            <input
              type="number"
              placeholder="من"
              value={value?.min || ''}
              onChange={(e) => handleFilterChange(filter.id, { ...value, min: e.target.value })}
              className="admin-input w-24"
            />
            <span>-</span>
            <input
              type="number"
              placeholder="إلى"
              value={value?.max || ''}
              onChange={(e) => handleFilterChange(filter.id, { ...value, max: e.target.value })}
              className="admin-input w-24"
            />
          </div>
        );
      
      default:
        return null;
    }
  };

  const selectedTemplateData = reportTemplates.find(t => t.id === selectedTemplate);

  const tabs = [
    { id: 'templates' as const, labelAr: 'قوالب التقارير', labelEn: 'Report templates', icon: 'documentText' },
    { id: 'custom' as const, labelAr: 'تقرير مخصص', labelEn: 'Custom report', icon: 'plus' },
    { id: 'scheduled' as const, labelAr: 'التقارير المجدولة', labelEn: 'Scheduled reports', icon: 'calendar' },
    { id: 'history' as const, labelAr: 'سجل التقارير', labelEn: 'Report history', icon: 'archive' },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={ar ? 'التقارير' : 'Reports'}
        subtitle={ar ? 'إنشاء تقارير مخصصة وذكية' : 'Create custom and smart reports'}
      />

      {/* Tabs */}
      <div className="admin-card overflow-hidden rounded-2xl">
        <nav className="admin-tabs-nav" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`admin-tab-btn${activeTab === tab.id ? ' admin-tab-btn--active' : ''}`}
            >
              <Icon name={tab.icon as keyof typeof import('@/lib/icons').icons} className="w-4 h-4" />
              {ar ? tab.labelAr : tab.labelEn}
            </button>
          ))}
        </nav>

        {/* Tab Content */}
        <div className="admin-tab-panel">
          {activeTab === 'templates' && (
            <div className="space-y-6">
              {/* Template Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {reportTemplates.map((template) => (
                  <div
                    key={template.id}
                    onClick={() => handleTemplateSelect(template.id)}
                    className={`border-2 rounded-xl p-4 cursor-pointer transition-all ${
                      selectedTemplate === template.id
                        ? 'admin-accent-border admin-accent-bg-soft'
                        : 'border-gray-200 hover:border-[color:rgb(var(--admin-primary-rgb)/0.5)] hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`p-2 rounded-lg ${
                        template.category === 'financial' ? 'bg-green-100 text-green-600' :
                        template.category === 'operational' ? 'bg-blue-100 text-blue-600' :
                        template.category === 'analytical' ? 'bg-purple-100 text-purple-600' :
                        'bg-orange-100 text-orange-600'
                      }`}>
                        <Icon name={template.icon} className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{template.name}</h3>
                        <p className="text-sm text-gray-600">{template.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Report Configuration */}
              {selectedTemplateData && (
                <div className="space-y-6 p-4 rounded-xl bg-gray-50/50 border border-gray-100">
                  <h3 className="text-lg font-semibold text-gray-900">{ar ? 'إعدادات التقرير' : 'Report settings'}</h3>
                  
                  {/* Fields */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-700">{ar ? 'الحقول' : 'Fields'}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedTemplateData.fields.map((field) => (
                        <div key={field.id} className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">
                            {field.name}
                            {field.required && <span className="text-red-500">*</span>}
                          </label>
                          {renderTemplateField(field)}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Filters */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-700">{ar ? 'الفلاتر' : 'Filters'}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedTemplateData.filters.map((filter) => (
                        <div key={filter.id} className="space-y-2">
                          <label className="block text-sm font-medium text-gray-700">{filter.name}</label>
                          {renderFilter(filter)}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Generate Button */}
                  <div className="flex justify-end">
                    <button
                      onClick={generateReport}
                      disabled={isGenerating}
                      className="admin-btn-primary disabled:opacity-60"
                    >
                      {isGenerating ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                          {ar ? 'جاري الإنشاء...' : 'Generating...'}
                        </>
                      ) : (
                        <>
                          <Icon name="documentText" className="w-4 h-4" />
                          {ar ? 'إنشاء التقرير' : 'Generate report'}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-4">
              {generatedReports.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Icon name="documentText" className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                  <p>{ar ? 'لا توجد تقارير تم إنشاؤها' : 'No reports generated yet'}</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-gray-200">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-700 font-semibold">
                      <tr>
                        <th className="px-4 py-3 rounded-tl-xl">{ar ? 'اسم التقرير' : 'Report name'}</th>
                        <th className="px-4 py-3">{ar ? 'تاريخ الإنشاء' : 'Generated'}</th>
                        <th className="px-4 py-3">{ar ? 'الحالة' : 'Status'}</th>
                        <th className="px-4 py-3">{ar ? 'الحجم' : 'Size'}</th>
                        <th className="px-4 py-3 rounded-tr-xl">{ar ? 'الإجراءات' : 'Actions'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {generatedReports.map((report) => (
                        <tr key={report.id} className="hover:bg-gray-50/50">
                          <td className="px-4 py-3 font-medium text-gray-900">{report.name}</td>
                          <td className="px-4 py-3 text-gray-600">{formatDate(report.generatedAt)}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(report.status)}`}>
                              <Icon name={getStatusIcon(report.status) as any} className="w-3 h-3" />
                              {report.status === 'generating' ? (ar ? 'قيد الإنشاء' : 'Generating') :
                               report.status === 'completed' ? (ar ? 'مكتمل' : 'Completed') : (ar ? 'فشل' : 'Failed')}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-600">{report.size ? formatFileSize(report.size) : '—'}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {report.status === 'completed' && (
                                <button
                                  onClick={() => downloadReport(report)}
                                  className="p-2 rounded-lg admin-accent-text admin-accent-bg-soft-hover transition-colors"
                                  title={ar ? 'تحميل' : 'Download'}
                                >
                                  <Icon name="externalLink" className="w-4 h-4" />
                                </button>
                              )}
                              <button
                                onClick={() => deleteReport(report.id)}
                                className="p-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                                title={ar ? 'حذف' : 'Delete'}
                              >
                                <Icon name="x" className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'custom' && (
            <div className="space-y-6">
              <p className="text-sm text-gray-600">
                {ar
                  ? 'اختر مصدر البيانات والأعمدة ثم صدّر CSV — يُحفظ في سجل التقارير.'
                  : 'Pick a data source and columns, then export CSV — saved to report history.'}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">{ar ? 'مصدر البيانات' : 'Data source'}</label>
                  <select
                    value={customSource}
                    onChange={(e) => setCustomSource(e.target.value as CustomReportSource)}
                    className="admin-input w-full"
                  >
                    {(Object.keys(CUSTOM_REPORT_SOURCES) as CustomReportSource[]).map((key) => (
                      <option key={key} value={key}>
                        {ar ? CUSTOM_REPORT_SOURCES[key].labelAr : CUSTOM_REPORT_SOURCES[key].labelEn}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">{ar ? 'الأعمدة' : 'Columns'}</p>
                <div className="flex flex-wrap gap-3">
                  {CUSTOM_REPORT_SOURCES[customSource].columns.map((col) => (
                    <label key={col.id} className="inline-flex items-center gap-2 text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                      <input
                        type="checkbox"
                        checked={customColumns.includes(col.id)}
                        onChange={(e) => {
                          setCustomColumns((prev) =>
                            e.target.checked ? [...prev, col.id] : prev.filter((id) => id !== col.id)
                          );
                        }}
                      />
                      {ar ? col.labelAr : col.labelEn}
                    </label>
                  ))}
                </div>
              </div>
              <button
                type="button"
                disabled={customBusy || customColumns.length === 0}
                onClick={() => void generateCustomReport()}
                className="admin-btn admin-btn-primary inline-flex items-center gap-2"
              >
                <Icon name="documentText" className="w-4 h-4" />
                {customBusy ? (ar ? 'جاري التصدير...' : 'Exporting...') : ar ? 'تصدير CSV' : 'Export CSV'}
              </button>
            </div>
          )}

          {activeTab === 'scheduled' && (
            <div className="space-y-6">
              <div className="admin-card border border-gray-200">
                <div className="admin-card-header">
                  <h3 className="admin-card-title">{ar ? 'جدولة جديدة' : 'New schedule'}</h3>
                </div>
                <div className="admin-card-body grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    value={scheduleForm.nameAr}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, nameAr: e.target.value })}
                    className="admin-input w-full"
                    placeholder={ar ? 'اسم الجدولة (عربي)' : 'Schedule name (Arabic)'}
                  />
                  <input
                    type="email"
                    value={scheduleForm.recipientEmail}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, recipientEmail: e.target.value })}
                    className="admin-input w-full"
                    placeholder={ar ? 'البريد المستلم' : 'Recipient email'}
                  />
                  <select
                    value={scheduleForm.source}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, source: e.target.value as CustomReportSource })}
                    className="admin-input w-full"
                  >
                    {(Object.keys(CUSTOM_REPORT_SOURCES) as CustomReportSource[]).map((key) => (
                      <option key={key} value={key}>
                        {ar ? CUSTOM_REPORT_SOURCES[key].labelAr : CUSTOM_REPORT_SOURCES[key].labelEn}
                      </option>
                    ))}
                  </select>
                  <select
                    value={scheduleForm.frequency}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, frequency: e.target.value as ReportScheduleFrequency })}
                    className="admin-input w-full"
                  >
                    <option value="daily">{ar ? 'يومي' : 'Daily'}</option>
                    <option value="weekly">{ar ? 'أسبوعي' : 'Weekly'}</option>
                    <option value="monthly">{ar ? 'شهري' : 'Monthly'}</option>
                  </select>
                  <button type="button" onClick={saveSchedule} className="admin-btn admin-btn-primary md:col-span-2">
                    {ar ? 'حفظ الجدولة' : 'Save schedule'}
                  </button>
                </div>
              </div>
              {schedules.length === 0 ? (
                <p className="text-center text-gray-500 py-8">{ar ? 'لا توجد جداول محفوظة' : 'No saved schedules'}</p>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-gray-200">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-700 font-semibold">
                      <tr>
                        <th className="px-4 py-3 text-start">{ar ? 'الاسم' : 'Name'}</th>
                        <th className="px-4 py-3 text-start">{ar ? 'المصدر' : 'Source'}</th>
                        <th className="px-4 py-3 text-start">{ar ? 'التكرار' : 'Frequency'}</th>
                        <th className="px-4 py-3 text-start">{ar ? 'البريد' : 'Email'}</th>
                        <th className="px-4 py-3 text-start">{ar ? 'إجراءات' : 'Actions'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {schedules.map((s) => (
                        <tr key={s.id}>
                          <td className="px-4 py-3">{ar ? s.nameAr : s.nameEn || s.nameAr}</td>
                          <td className="px-4 py-3">{ar ? CUSTOM_REPORT_SOURCES[s.source].labelAr : CUSTOM_REPORT_SOURCES[s.source].labelEn}</td>
                          <td className="px-4 py-3">{s.frequency}</td>
                          <td className="px-4 py-3">{s.recipientEmail}</td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2">
                              <button type="button" onClick={() => void runScheduleNow(s)} className="admin-accent-text hover:underline text-xs">
                                {ar ? 'تشغيل الآن' : 'Run now'}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  deleteReportSchedule(s.id);
                                  setSchedules(listReportSchedules());
                                }}
                                className="text-red-600 hover:underline text-xs"
                              >
                                {ar ? 'حذف' : 'Delete'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
