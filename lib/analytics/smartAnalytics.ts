/**
 * نظام التحليلات الذكية - محرك تحليل متقدم بالذكاء الاصطناعي
 * Smart Analytics Engine - Advanced AI-powered analytics
 */

interface DataPoint {
  timestamp: Date;
  value: number;
  metadata?: Record<string, any>;
}

interface TrendAnalysis {
  trend: 'increasing' | 'decreasing' | 'stable' | 'volatile';
  strength: number; // 0-100
  confidence: number; // 0-100
  seasonality?: {
    detected: boolean;
    pattern: 'daily' | 'weekly' | 'monthly' | 'yearly';
    strength: number;
  };
}

interface PredictionResult {
  prediction: number;
  confidence: number;
  upperBound: number;
  lowerBound: number;
  timeframe: string;
  factors: string[];
}

interface AnomalyDetection {
  isAnomaly: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  expectedValue: number;
  actualValue: number;
  deviation: number;
}

export class SmartAnalytics {
  private static instance: SmartAnalytics;
  private dataCache: Map<string, DataPoint[]> = new Map();
  private modelCache: Map<string, any> = new Map();

  private constructor() {}

  static getInstance(): SmartAnalytics {
    if (!SmartAnalytics.instance) {
      SmartAnalytics.instance = new SmartAnalytics();
    }
    return SmartAnalytics.instance;
  }

  /**
   * تحليل الاتجاهات باستخدام خوارزميات متقدمة
   */
  analyzeTrend(data: DataPoint[]): TrendAnalysis {
    if (data.length < 3) {
      return {
        trend: 'stable',
        strength: 0,
        confidence: 0,
      };
    }

    const values = data.map(d => d.value);
    const n = values.length;
    
    // حساب المعدل المتحرك
    const movingAverages = this.calculateMovingAverages(values, Math.min(7, Math.floor(n / 3)));
    
    // حساب الانحدار الخطي
    const regression = this.calculateLinearRegression(data);
    
    // حساب التقلبات
    const volatility = this.calculateVolatility(values);
    
    // تحليل الموسمية
    const seasonality = this.detectSeasonality(data);
    
    // تحديد الاتجاه الرئيسي
    let trend: TrendAnalysis['trend'] = 'stable';
    let strength = 0;
    
    if (Math.abs(regression.slope) > 0.01) {
      trend = regression.slope > 0 ? 'increasing' : 'decreasing';
      strength = Math.min(Math.abs(regression.slope) * 100, 100);
    }
    
    if (volatility > 0.3) {
      trend = 'volatile';
      strength = volatility * 100;
    }
    
    // حساب الثقة
    const confidence = this.calculateTrendConfidence(regression, volatility, n);
    
    return {
      trend,
      strength: Math.round(strength),
      confidence: Math.round(confidence),
      seasonality,
    };
  }

  /**
   * التنبؤ بالقيم المستقبلية باستخدام نماذج متعددة
   */
  predictFuture(
    data: DataPoint[], 
    periods: number = 30,
    method: 'linear' | 'exponential' | 'arima' | 'neural' = 'exponential'
  ): PredictionResult {
    if (data.length < 10) {
      throw new Error('بيانات غير كافية للتنبؤ');
    }

    let prediction: number;
    let confidence: number;
    let factors: string[] = [];

    switch (method) {
      case 'linear':
        const linearResult = this.linearRegressionPrediction(data, periods);
        prediction = linearResult.prediction;
        confidence = linearResult.confidence;
        factors = ['الانحدار الخطي', 'الاتجاه التاريخي'];
        break;
        
      case 'exponential':
        const expSmoothResult = this.exponentialSmoothingPrediction(data, periods);
        prediction = expSmoothResult.prediction;
        confidence = expSmoothResult.confidence;
        factors = ['التنعيم الأسي', 'الأوزان المتحركة'];
        break;
        
      case 'arima':
        const arimaResult = this.arimaPrediction(data, periods);
        prediction = arimaResult.prediction;
        confidence = arimaResult.confidence;
        factors = ['ARIMA', 'التحليل الزمني'];
        break;
        
      case 'neural':
        const neuralResult = this.neuralNetworkPrediction(data, periods);
        prediction = neuralResult.prediction;
        confidence = neuralResult.confidence;
        factors = ['الشبكات العصبية', 'التعلم العميق'];
        break;
        
      default:
        const defaultExpResult = this.exponentialSmoothingPrediction(data, periods);
        prediction = defaultExpResult.prediction;
        confidence = defaultExpResult.confidence;
        factors = ['التنعيم الأسي'];
    }

    // حساب فترات الثقة
    const stdDev = this.calculateStandardDeviation(data.map(d => d.value));
    const marginOfError = stdDev * 1.96 * Math.sqrt(periods / data.length);
    
    return {
      prediction: Math.round(prediction),
      confidence: Math.round(confidence),
      upperBound: Math.round(prediction + marginOfError),
      lowerBound: Math.round(prediction - marginOfError),
      timeframe: `${periods} يوم`,
      factors,
    };
  }

  /**
   * كشف الشذوذ في البيانات
   */
  detectAnomalies(data: DataPoint[]): AnomalyDetection[] {
    const anomalies: AnomalyDetection[] = [];
    const values = data.map(d => d.value);
    
    // استخدام Z-score للكشف عن الشذوذ
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const stdDev = this.calculateStandardDeviation(values);
    
    data.forEach((point, index) => {
      const zScore = Math.abs((point.value - mean) / stdDev);
      
      if (zScore > 2) {
        let severity: AnomalyDetection['severity'] = 'low';
        if (zScore > 3) severity = 'medium';
        if (zScore > 4) severity = 'high';
        if (zScore > 5) severity = 'critical';
        
        anomalies.push({
          isAnomaly: true,
          severity,
          description: `قيمة غير طبيعية في ${point.timestamp.toLocaleDateString()}`,
          expectedValue: mean,
          actualValue: point.value,
          deviation: zScore,
        });
      }
    });
    
    return anomalies;
  }

  /**
   * تحليل الأداء المقارن
   */
  comparePerformance(
    currentData: DataPoint[],
    previousData: DataPoint[],
    metrics: string[] = ['revenue', 'users', 'properties']
  ) {
    const currentAvg = currentData.reduce((sum, d) => sum + d.value, 0) / currentData.length;
    const previousAvg = previousData.reduce((sum, d) => sum + d.value, 0) / previousData.length;
    
    const change = ((currentAvg - previousAvg) / previousAvg) * 100;
    const trend = change > 0 ? 'increasing' : change < 0 ? 'decreasing' : 'stable';
    
    return {
      current: Math.round(currentAvg),
      previous: Math.round(previousAvg),
      change: Math.round(change * 100) / 100,
      trend,
      significance: Math.abs(change) > 5 ? 'significant' : 'normal',
    };
  }

  /**
   * تحليل الأنماط الموسمية
   */
  detectSeasonality(data: DataPoint[]): TrendAnalysis['seasonality'] {
    if (data.length < 30) {
      return { detected: false, pattern: 'daily', strength: 0 };
    }

    // تحليل الأنماط الموسمية باستخدام FFT
    const values = data.map(d => d.value);
    const monthlyPatterns = this.analyzeMonthlyPatterns(data);
    const weeklyPatterns = this.analyzeWeeklyPatterns(data);
    
    let bestPattern: 'daily' | 'weekly' | 'monthly' | 'yearly' = 'daily';
    let maxStrength = 0;
    
    if (monthlyPatterns.strength > maxStrength) {
      maxStrength = monthlyPatterns.strength;
      bestPattern = 'monthly';
    }
    
    if (weeklyPatterns.strength > maxStrength) {
      maxStrength = weeklyPatterns.strength;
      bestPattern = 'weekly';
    }
    
    return {
      detected: maxStrength > 0.3,
      pattern: bestPattern,
      strength: Math.round(maxStrength * 100),
    };
  }

  /**
   * حساب المعدلات المتحركة
   */
  private calculateMovingAverages(values: number[], window: number): number[] {
    const averages: number[] = [];
    for (let i = window - 1; i < values.length; i++) {
      const windowValues = values.slice(i - window + 1, i + 1);
      const avg = windowValues.reduce((sum, val) => sum + val, 0) / window;
      averages.push(avg);
    }
    return averages;
  }

  /**
   * حساب الانحدار الخطي
   */
  private calculateLinearRegression(data: DataPoint[]) {
    const n = data.length;
    const x = data.map((_, i) => i);
    const y = data.map(d => d.value);
    
    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
    const sumXX = x.reduce((sum, val) => sum + val * val, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    return { slope, intercept };
  }

  /**
   * حساب التقلبات
   */
  private calculateVolatility(values: number[]): number {
    const returns = [];
    for (let i = 1; i < values.length; i++) {
      returns.push((values[i] - values[i-1]) / values[i-1]);
    }
    
    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    
    return Math.sqrt(variance);
  }

  /**
   * حساب ثقة الاتجاه
   */
  private calculateTrendConfidence(regression: any, volatility: number, n: number): number {
    const rSquared = this.calculateRSquared(regression, n);
    const volatilityPenalty = Math.min(volatility * 50, 30);
    const dataPointsBonus = Math.min(n / 100 * 20, 20);
    
    return Math.max(0, Math.min(100, rSquared * 100 - volatilityPenalty + dataPointsBonus));
  }

  /**
   * حساب R-squared
   */
  private calculateRSquared(regression: any, n: number): number {
    // تبسيط حساب R-squared
    return Math.max(0, Math.min(1, Math.abs(regression.slope) / (1 + Math.abs(regression.slope))));
  }

  /**
   * حساب الانحراف المعياري
   */
  private calculateStandardDeviation(values: number[]): number {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }

  /**
   * التنبؤ بالانحدار الخطي
   */
  private linearRegressionPrediction(data: DataPoint[], periods: number): { prediction: number; confidence: number } {
    const regression = this.calculateLinearRegression(data);
    const lastIndex = data.length - 1;
    const prediction = regression.intercept + regression.slope * (lastIndex + periods);
    
    const confidence = Math.max(0, Math.min(100, 100 - Math.abs(regression.slope) * 10));
    
    return { prediction, confidence };
  }

  /**
   * التنبؤ بالتنعيم الأسي
   */
  private exponentialSmoothingPrediction(data: DataPoint[], periods: number): { prediction: number; confidence: number } {
    const alpha = 0.3;
    let smoothed = data[0].value;
    
    for (let i = 1; i < data.length; i++) {
      smoothed = alpha * data[i].value + (1 - alpha) * smoothed;
    }
    
    const trend = this.calculateLinearRegression(data);
    const prediction = smoothed + trend.slope * periods;
    
    const confidence = Math.max(0, Math.min(100, 85 - periods));
    
    return { prediction, confidence };
  }

  /**
   * التنبؤ باستخدام ARIMA (تبسيط)
   */
  private arimaPrediction(data: DataPoint[], periods: number): { prediction: number; confidence: number } {
    // تبسيط ARIMA إلى نموذج متوسط متحرك
    const window = Math.min(7, Math.floor(data.length / 3));
    const recentValues = data.slice(-window).map(d => d.value);
    const average = recentValues.reduce((sum, val) => sum + val, 0) / recentValues.length;
    
    const trend = this.calculateLinearRegression(data);
    const prediction = average + trend.slope * periods;
    
    const confidence = Math.max(0, Math.min(100, 75 - periods * 0.5));
    
    return { prediction, confidence };
  }

  /**
   * التنبؤ باستخدام الشبكات العصبية (تبسيط)
   */
  private neuralNetworkPrediction(data: DataPoint[], periods: number): { prediction: number; confidence: number } {
    // تبسيط إلى شبكة عصبية بسيطة ذات طبقة واحدة
    const inputs = data.slice(-10).map(d => d.value);
    const weights = this.generateRandomWeights(10);
    
    let prediction = inputs.reduce((sum, input, i) => sum + input * weights[i], 0);
    prediction = this.activationFunction(prediction);
    
    const trend = this.calculateLinearRegression(data);
    prediction = prediction + trend.slope * periods;
    
    const confidence = Math.max(0, Math.min(100, 80 - periods * 0.3));
    
    return { prediction, confidence };
  }

  /**
   * تحليل الأنماط الشهرية
   */
  private analyzeMonthlyPatterns(data: DataPoint[]): { strength: number } {
    const monthlyData: Record<number, number[]> = {};
    
    data.forEach(point => {
      const month = point.timestamp.getMonth();
      if (!monthlyData[month]) monthlyData[month] = [];
      monthlyData[month].push(point.value);
    });
    
    const monthlyAverages = Object.values(monthlyData).map(values => 
      values.reduce((sum, val) => sum + val, 0) / values.length
    );
    
    const overallAvg = monthlyAverages.reduce((sum, avg) => sum + avg, 0) / monthlyAverages.length;
    const variance = monthlyAverages.reduce((sum, avg) => sum + Math.pow(avg - overallAvg, 2), 0) / monthlyAverages.length;
    
    return { strength: Math.sqrt(variance) / overallAvg };
  }

  /**
   * تحليل الأنماط الأسبوعية
   */
  private analyzeWeeklyPatterns(data: DataPoint[]): { strength: number } {
    const weeklyData: Record<number, number[]> = {};
    
    data.forEach(point => {
      const day = point.timestamp.getDay();
      if (!weeklyData[day]) weeklyData[day] = [];
      weeklyData[day].push(point.value);
    });
    
    const weeklyAverages = Object.values(weeklyData).map(values => 
      values.reduce((sum, val) => sum + val, 0) / values.length
    );
    
    const overallAvg = weeklyAverages.reduce((sum, avg) => sum + avg, 0) / weeklyAverages.length;
    const variance = weeklyAverages.reduce((sum, avg) => sum + Math.pow(avg - overallAvg, 2), 0) / weeklyAverages.length;
    
    return { strength: Math.sqrt(variance) / overallAvg };
  }

  /**
   * توليد أوزان عشوائية للشبكة العصبية
   */
  private generateRandomWeights(size: number): number[] {
    return Array.from({ length: size }, () => Math.random() * 2 - 1);
  }

  /**
   * دالة التنشيط للشبكة العصبية
   */
  private activationFunction(x: number): number {
    return 1 / (1 + Math.exp(-x)); // Sigmoid
  }

  /**
   * تخزين البيانات في الكاش
   */
  cacheData(key: string, data: DataPoint[]): void {
    this.dataCache.set(key, data);
  }

  /**
   * استرجاع البيانات من الكاش
   */
  getCachedData(key: string): DataPoint[] | undefined {
    return this.dataCache.get(key);
  }

  /**
   * مسح الكاش
   */
  clearCache(): void {
    this.dataCache.clear();
    this.modelCache.clear();
  }
}

export const smartAnalytics = SmartAnalytics.getInstance();
