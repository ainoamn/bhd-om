'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Icon from '@/components/icons/Icon';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import { smartAnalytics } from '@/lib/analytics/smartAnalytics';
import { log } from '@/lib/logger';

interface ChartData {
  revenue: { date: string; value: number }[];
  properties: { date: string; value: number }[];
  users: { date: string; value: number }[];
  performance: { metric: string; value: number; trend: 'up' | 'down' | 'stable' }[];
}

interface ChartConfig {
  type: 'line' | 'bar' | 'pie' | 'area';
  title: string;
  data: any[];
  options?: any;
}

export default function AnalyticsCharts() {
  const params = useParams();
  const locale = (params?.locale as string) || 'ar';
  const ar = locale === 'ar';
  const [chartData, setChartData] = useState<ChartData>({
    revenue: [],
    properties: [],
    users: [],
    performance: [],
  });
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [selectedChart, setSelectedChart] = useState<string>('revenue');
  const [loading, setLoading] = useState(true);
  const [predictions, setPredictions] = useState<any[]>([]);

  useEffect(() => {
    loadChartData();
  }, [selectedPeriod]);

  const loadChartData = async () => {
    setLoading(true);
    try {
      // تحميل البيانات من localStorage أو API
      const revenueData = loadRevenueData();
      const propertiesData = loadPropertiesData();
      const usersData = loadUsersData();
      const performanceData = loadPerformanceData();

      setChartData({
        revenue: revenueData,
        properties: propertiesData,
        users: usersData,
        performance: performanceData,
      });

      // توليد التنبؤات
      const revenuePredictions = generatePredictions(revenueData);
      setPredictions(revenuePredictions);

      log.info('Analytics charts loaded successfully', { 
        period: selectedPeriod,
        dataPoints: revenueData.length 
      });
    } catch (error) {
      log.error('Failed to load chart data', { error });
    } finally {
      setLoading(false);
    }
  };

  const loadRevenueData = () => {
    // محاكاة تحميل بيانات الإيرادات
    const days = getPeriodDays(selectedPeriod);
    const data = [];
    const now = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      
      // إضافة بعض العشوائية والاتجاه
      const baseValue = 50000 + (days - i) * 500;
      const randomVariation = (Math.random() - 0.5) * 10000;
      const weekendBonus = (date.getDay() === 0 || date.getDay() === 6) ? 8000 : 0;
      
      data.push({
        date: date.toISOString().split('T')[0],
        value: Math.max(0, baseValue + randomVariation + weekendBonus),
      });
    }
    
    return data;
  };

  const loadPropertiesData = () => {
    const days = getPeriodDays(selectedPeriod);
    const data = [];
    const now = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      
      const baseValue = 150 + Math.sin(i / 7) * 20;
      const randomVariation = (Math.random() - 0.5) * 30;
      
      data.push({
        date: date.toISOString().split('T')[0],
        value: Math.max(100, baseValue + randomVariation),
      });
    }
    
    return data;
  };

  const loadUsersData = () => {
    const days = getPeriodDays(selectedPeriod);
    const data = [];
    const now = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      
      const baseValue = 80 + (days - i) * 0.5;
      const randomVariation = (Math.random() - 0.5) * 20;
      const weekdayFactor = (date.getDay() >= 1 && date.getDay() <= 5) ? 1.2 : 0.8;
      
      data.push({
        date: date.toISOString().split('T')[0],
        value: Math.max(50, (baseValue + randomVariation) * weekdayFactor),
      });
    }
    
    return data;
  };

  const loadPerformanceData = () => {
    return [
      { metric: 'سرعة الموقع', value: 95, trend: 'up' as const },
      { metric: 'معدل التحويل', value: 3.2, trend: 'up' as const },
      { metric: 'رضا العملاء', value: 87, trend: 'stable' as const },
      { metric: 'معدل الخطأ', value: 0.8, trend: 'down' as const },
      { metric: 'زمن الاستجابة', value: 2.4, trend: 'down' as const },
      { metric: 'معدل الإشغال', value: 78.5, trend: 'up' as const },
    ];
  };

  const generatePredictions = (data: any[]) => {
    if (data.length < 10) return [];
    
    try {
      const dataPoints = data.map(d => ({
        timestamp: new Date(d.date),
        value: d.value,
      }));
      
      const prediction = smartAnalytics.predictFuture(dataPoints, 30, 'exponential');
      
      return [
        {
          type: 'revenue',
          title: 'توقعات الإيرادات لشهر',
          value: prediction.prediction,
          confidence: prediction.confidence,
          upperBound: prediction.upperBound,
          lowerBound: prediction.lowerBound,
        }
      ];
    } catch (error) {
      log.error('Failed to generate predictions', { error });
      return [];
    }
  };

  const getPeriodDays = (period: string): number => {
    switch (period) {
      case '7d': return 7;
      case '30d': return 30;
      case '90d': return 90;
      case '1y': return 365;
      default: return 30;
    }
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('ar-OM', {
      style: 'currency',
      currency: 'OMR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatNumber = (value: number): string => {
    return new Intl.NumberFormat('ar-OM').format(value);
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return 'chevronUp';
      case 'down': return 'chevronDown';
      case 'stable': return 'chevronRight';
      default: return 'chevronRight';
    }
  };

  const getTrendColor = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return 'text-green-600';
      case 'down': return 'text-red-600';
      case 'stable': return 'text-gray-600';
      default: return 'text-gray-600';
    }
  };

  const renderChart = () => {
    switch (selectedChart) {
      case 'revenue':
        return <RevenueChart data={chartData.revenue} predictions={predictions} />;
      case 'properties':
        return <PropertiesChart data={chartData.properties} />;
      case 'users':
        return <UsersChart data={chartData.users} />;
      case 'performance':
        return <PerformanceChart data={chartData.performance} />;
      default:
        return <RevenueChart data={chartData.revenue} predictions={predictions} />;
    }
  };

  const chartTabs = [
    { id: 'revenue' as const, labelAr: 'الإيرادات', labelEn: 'Revenue', icon: 'chartBar' },
    { id: 'properties' as const, labelAr: 'العقارات', labelEn: 'Properties', icon: 'building' },
    { id: 'users' as const, labelAr: 'المستخدمون', labelEn: 'Users', icon: 'users' },
    { id: 'performance' as const, labelAr: 'الأداء', labelEn: 'Performance', icon: 'cog' },
  ];

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <AdminPageHeader title={ar ? 'التحليلات' : 'Analytics'} subtitle={ar ? 'تحليلات وإحصائيات متقدمة' : 'Advanced analytics and statistics'} />
        <div className="flex items-center justify-center h-64 admin-card rounded-2xl">
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#8B6F47] border-t-transparent mx-auto mb-3" />
            <p className="text-gray-600">{ar ? 'جاري تحميل التحليلات...' : 'Loading analytics...'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <AdminPageHeader
        title={ar ? 'التحليلات' : 'Analytics'}
        subtitle={ar ? 'تحليلات وإحصائيات متقدمة حسب الفترة المحددة' : 'Advanced analytics and statistics for the selected period'}
      />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700">{ar ? 'الفترة:' : 'Period:'}</label>
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value as '7d' | '30d' | '90d' | '1y')}
            className="px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#8B6F47] focus:border-[#8B6F47] text-gray-900 bg-white"
          >
            <option value="7d">{ar ? 'آخر 7 أيام' : 'Last 7 days'}</option>
            <option value="30d">{ar ? 'آخر 30 يوم' : 'Last 30 days'}</option>
            <option value="90d">{ar ? 'آخر 90 يوم' : 'Last 90 days'}</option>
            <option value="1y">{ar ? 'آخر سنة' : 'Last year'}</option>
          </select>
        </div>
      </div>

      {/* Chart Tabs */}
      <div className="admin-card overflow-hidden rounded-2xl">
        <div className="border-b border-gray-200 bg-gray-50/50">
          <nav className="flex gap-1 p-2 flex-wrap" aria-label="Tabs">
            {chartTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedChart(tab.id)}
                className={`py-3 px-4 rounded-xl font-medium text-sm transition-colors ${
                  selectedChart === tab.id
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

        <div className="p-6">
          {renderChart()}
        </div>
      </div>

      {/* Predictions Panel */}
      {predictions.length > 0 && (
        <div className="admin-card p-6 rounded-2xl bg-[#8B6F47]/5 border-[#8B6F47]/20">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-10 h-10 rounded-xl bg-[#8B6F47]/10 flex items-center justify-center">
              <Icon name="sparkles" className="w-5 h-5 text-[#8B6F47]" />
            </span>
            {ar ? 'التنبؤات الذكية' : 'Smart predictions'}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {predictions.map((prediction, index) => (
              <div key={index} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">{prediction.title}</h4>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    prediction.confidence >= 80 ? 'bg-emerald-100 text-emerald-800' :
                    prediction.confidence >= 60 ? 'bg-amber-100 text-amber-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {prediction.confidence}% {ar ? 'دقة' : 'confidence'}
                  </span>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">{ar ? 'القيمة المتوقعة:' : 'Expected value:'}</span>
                    <span className="font-semibold text-gray-900">
                      {selectedChart === 'revenue' ? formatCurrency(prediction.value) : formatNumber(prediction.value)}
                    </span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600">{ar ? 'النطاق:' : 'Range:'}</span>
                    <span className="text-gray-700">
                      {selectedChart === 'revenue' 
                        ? `${formatCurrency(prediction.lowerBound)} - ${formatCurrency(prediction.upperBound)}`
                        : `${formatNumber(prediction.lowerBound)} - ${formatNumber(prediction.upperBound)}`
                      }
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Chart Components
function RevenueChart({ data, predictions }: { data: any[], predictions: any[] }) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ar-OM', {
      style: 'currency',
      currency: 'OMR',
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="space-y-4">
      <div className="h-80 bg-gray-50 rounded-lg flex items-center justify-center">
        <div className="text-center text-gray-500">
          <Icon name="chartBar" className="w-16 h-16 mx-auto mb-4" />
          <p className="text-lg font-medium mb-2">رسم بياني للإيرادات</p>
          <p className="text-sm">يمكن إضافة Chart.js أو Recharts لعرض رسوم بيانية تفاعلية</p>
          <div className="mt-4 text-sm space-y-1">
            <p>📈 إجمالي الإيرادات: {formatCurrency(data.reduce((sum, d) => sum + d.value, 0))}</p>
            <p>📊 متوسط يومي: {formatCurrency(data.reduce((sum, d) => sum + d.value, 0) / data.length)}</p>
            {predictions.length > 0 && (
              <p>🔮 التوقع الشهري: {formatCurrency(predictions[0].value)}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function PropertiesChart({ data }: { data: any[] }) {
  return (
    <div className="h-80 bg-gray-50 rounded-lg flex items-center justify-center">
      <div className="text-center text-gray-500">
        <Icon name="building" className="w-16 h-16 mx-auto mb-4" />
        <p className="text-lg font-medium">رسم بياني للعقارات</p>
        <p className="text-sm mt-2">إجمالي العقارات: {data.length}</p>
      </div>
    </div>
  );
}

function UsersChart({ data }: { data: any[] }) {
  return (
    <div className="h-80 bg-gray-50 rounded-lg flex items-center justify-center">
      <div className="text-center text-gray-500">
        <Icon name="users" className="w-16 h-16 mx-auto mb-4" />
        <p className="text-lg font-medium">رسم بياني للمستخدمين</p>
        <p className="text-sm mt-2">متوسط المستخدمين: {Math.round(data.reduce((sum, d) => sum + d.value, 0) / data.length)}</p>
      </div>
    </div>
  );
}

function PerformanceChart({ data }: { data: any[] }) {
  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return 'chevronUp';
      case 'down': return 'chevronDown';
      case 'stable': return 'chevronRight';
      default: return 'chevronRight';
    }
  };

  const getTrendColor = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return 'text-green-600';
      case 'down': return 'text-red-600';
      case 'stable': return 'text-gray-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="space-y-4">
      {data.map((metric, index) => (
        <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${
              metric.trend === 'up' ? 'bg-green-100' :
              metric.trend === 'down' ? 'bg-red-100' : 'bg-gray-100'
            }`}>
              <Icon name={getTrendIcon(metric.trend) as any} className={`w-4 h-4 ${getTrendColor(metric.trend)}`} />
            </div>
            <span className="font-medium text-gray-900">{metric.metric}</span>
          </div>
          <span className="text-lg font-semibold text-gray-900">{metric.value}%</span>
        </div>
      ))}
    </div>
  );
}
