'use client';

import { useLocale } from 'next-intl';
import { useEffect, useState } from 'react';

interface Statistic {
  id: string;
  value: number;
  labelAr: string;
  labelEn: string;
  icon: string;
  color: string;
}

const statistics: Statistic[] = [
  {
    id: 'managed',
    value: 245,
    labelAr: 'عقار مُدار',
    labelEn: 'Managed Properties',
    icon: '🏢',
    color: 'from-blue-500 to-blue-600',
  },
  {
    id: 'sold',
    value: 128,
    labelAr: 'عقار مبيع',
    labelEn: 'Sold Properties',
    icon: '✅',
    color: 'from-green-500 to-green-600',
  },
  {
    id: 'built',
    value: 89,
    labelAr: 'عقار مبني',
    labelEn: 'Built Properties',
    icon: '🏗️',
    color: 'from-purple-500 to-purple-600',
  },
  {
    id: 'under-construction',
    value: 42,
    labelAr: 'قيد التنفيذ',
    labelEn: 'Under Construction',
    icon: '🚧',
    color: 'from-yellow-500 to-yellow-600',
  },
  {
    id: 'visitors',
    value: 15420,
    labelAr: 'زائر للموقع',
    labelEn: 'Website Visitors',
    icon: '👥',
    color: 'from-indigo-500 to-indigo-600',
  },
  {
    id: 'clients',
    value: 356,
    labelAr: 'عميل',
    labelEn: 'Clients',
    icon: '🤝',
    color: 'from-pink-500 to-pink-600',
  },
];

export default function Statistics() {
  const locale = useLocale();
  const [animatedValues, setAnimatedValues] = useState<Record<string, number>>({});

  useEffect(() => {
    // Animate numbers on mount
    statistics.forEach((stat) => {
      const duration = 2000; // 2 seconds
      const steps = 60;
      const increment = stat.value / steps;
      let current = 0;
      let step = 0;

      const timer = setInterval(() => {
        step++;
        current = Math.min(increment * step, stat.value);
        setAnimatedValues((prev) => ({
          ...prev,
          [stat.id]: Math.floor(current),
        }));

        if (step >= steps) {
          clearInterval(timer);
          setAnimatedValues((prev) => ({
            ...prev,
            [stat.id]: stat.value,
          }));
        }
      }, duration / steps);
    });
  }, []);

  const formatNumber = (num: number) => {
    if (num >= 1000) {
      return num.toLocaleString();
    }
    return num.toString();
  };

  return (
    <div className="relative z-20 w-full -mt-16 md:-mt-20">
      <div className="container mx-auto px-4">
        <div className="bg-white/95 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/30 p-4 md:p-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
            {statistics.map((stat) => (
              <div
                key={stat.id}
                className="text-center hover:scale-105 transition-transform duration-200"
              >
                <div className={`inline-flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-lg bg-gradient-to-br ${stat.color} text-white text-lg md:text-xl mb-2 shadow-md`}>
                  {stat.icon}
                </div>
                <div className="text-xl md:text-2xl font-bold text-gray-900 mb-1">
                  {animatedValues[stat.id] !== undefined 
                    ? formatNumber(animatedValues[stat.id])
                    : '0'}
                  {stat.id === 'visitors' && '+'}
                </div>
                <div className="text-xs md:text-sm text-gray-600 font-medium" style={{ lineHeight: '1.3' }}>
                  {locale === 'ar' ? stat.labelAr : stat.labelEn}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
