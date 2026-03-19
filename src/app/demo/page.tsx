'use client';

import { useMemo } from 'react';
import DashboardV2 from '@/components/DashboardV2';
import { generateMockData } from '@/lib/mock-data';

export default function DemoPage() {
  const mockData = useMemo(() => generateMockData(), []);

  const handleReset = () => {
    window.location.href = '/';
  };

  return (
    <DashboardV2 data={mockData} onReset={handleReset} isOAuthDashboard={true} />
  );
}
