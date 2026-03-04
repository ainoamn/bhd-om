'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Icon from '@/components/icons/Icon';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { log } from '@/lib/logger';

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  category: 'financial' | 'operational' | 'analytical' | 'compliance';
  icon: keyof typeof import('@/lib/icons').icons;
  fields: ReportField[];
  filters: ReportFilter[];
  schedule?: ReportSchedule;
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

interface ReportSchedule {
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
  }, []);

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
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#8B6F47] focus:border-[#8B6F47] text-gray-900"
            placeholder={field.name}
          />
        );
      
      case 'number':
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#8B6F47] focus:border-[#8B6F47] text-gray-900"
            placeholder={field.name}
          />
        );
      
      case 'date':
        return (
          <input
            type="date"
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#8B6F47] focus:border-[#8B6F47] text-gray-900"
          />
        );
      
      case 'select':
        return (
          <select
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#8B6F47] focus:border-[#8B6F47] text-gray-900"
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
              className="w-4 h-4 rounded border-gray-300 text-[#8B6F47] focus:ring-[#8B6F47]"
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
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#8B6F47] focus:border-[#8B6F47] text-gray-900"
          />
        );
      
      case 'select':
        return (
          <select
            value={value}
            onChange={(e) => handleFilterChange(filter.id, e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#8B6F47] focus:border-[#8B6F47] text-gray-900"
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
              className="w-24 px-3 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#8B6F47] focus:border-[#8B6F47] text-gray-900"
            />
            <span>-</span>
            <input
              type="number"
              placeholder="إلى"
              value={value?.max || ''}
              onChange={(e) => handleFilterChange(filter.id, { ...value, max: e.target.value })}
              className="w-24 px-3 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#8B6F47] focus:border-[#8B6F47] text-gray-900"
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
    <div className="space-y-6 p-6">
      <AdminPageHeader
        title={ar ? 'التقارير' : 'Reports'}
        subtitle={ar ? 'إنشاء تقارير مخصصة وذكية' : 'Create custom and smart reports'}
      />

      {/* Tabs */}
      <div className="admin-card overflow-hidden rounded-2xl">
        <div className="border-b border-gray-200 bg-gray-50/50">
          <nav className="flex gap-1 p-2" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-3 px-4 rounded-xl font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'bg-[#8B6F47] text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-200/70 hover:text-gray-900'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon name={tab.icon as any} className="w-4 h-4" />
                  {ar ? tab.labelAr : tab.labelEn}
                </div>
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
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
                        ? 'border-[#8B6F47] bg-[#8B6F47]/5'
                        : 'border-gray-200 hover:border-[#8B6F47]/50 hover:bg-gray-50'
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
                      className="inline-flex items-center gap-2 px-5 py-3 rounded-xl font-semibold bg-[#8B6F47] text-white hover:bg-[#6B5535] transition-colors disabled:opacity-60"
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
                                  className="p-2 rounded-lg text-[#8B6F47] hover:bg-[#8B6F47]/10 transition-colors"
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
            <div className="text-center py-12 text-gray-500">
              <span className="w-14 h-14 rounded-xl bg-[#8B6F47]/10 flex items-center justify-center mx-auto mb-3">
                <Icon name="plus" className="w-7 h-7 text-[#8B6F47]" />
              </span>
              <p className="text-lg font-medium text-gray-700 mb-1">{ar ? 'منشئ التقارير المخصص' : 'Custom report builder'}</p>
              <p>{ar ? 'قريباً - يمكنك إنشاء تقارير مخصصة بالكامل' : 'Coming soon — build fully custom reports'}</p>
            </div>
          )}

          {activeTab === 'scheduled' && (
            <div className="text-center py-12 text-gray-500">
              <span className="w-14 h-14 rounded-xl bg-[#8B6F47]/10 flex items-center justify-center mx-auto mb-3">
                <Icon name="calendar" className="w-7 h-7 text-[#8B6F47]" />
              </span>
              <p className="text-lg font-medium text-gray-700 mb-1">{ar ? 'التقارير المجدولة' : 'Scheduled reports'}</p>
              <p>{ar ? 'قريباً - إدارة التقارير المجدولة تلقائياً' : 'Coming soon — manage automated report schedules'}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
