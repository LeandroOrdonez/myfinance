import React, { useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLocation } from 'react-router-dom';
import clsx from 'clsx';

interface GreetingVariation {
  morning: string[];
  afternoon: string[];
  evening: string[];
  night: string[];
}

const greetingVariations: GreetingVariation = {
  morning: [
    "Good morning",
    "Rise and shine",
    "Morning",
    "Hello",
    "Welcome back"
  ],
  afternoon: [
    "Good afternoon",
    "Hi there",
    "Hello",
    "Hey",
    "Welcome back"
  ],
  evening: [
    "Good evening",
    "Evening",
    "Hi",
    "Hello",
    "Welcome back"
  ],
  night: [
    "Good night",
    "Working late",
    "Hello night owl",
    "Hi",
    "Welcome back"
  ]
};

// Get page title based on current view
const getPageTitle = (currentView: string) => {
  const pageInfo: Record<string, { title: string; subtitle: string }> = {
    'dashboard': { title: 'Home', subtitle: 'Your financial situation at a glance' },
    'analytics': { title: 'Analytics', subtitle: 'Your financial insights at a glance' },
    'transactions': { title: 'Transactions', subtitle: 'Track your money movements' },
    'financial-health': { title: 'Financial Health', subtitle: 'Improving your financial wellbeing' },
    'projections': { title: 'Financial Projections', subtitle: 'Visualize your financial future' },
    'anomalies': { title: 'Anomaly Detection', subtitle: 'Monitor unusual transaction patterns' },
  };

  const info = pageInfo[currentView];
  if (!info) return { title: 'MyFinance', subtitle: 'Smart money management' };

  return info;
};

export const UserGreeting: React.FC = () => {
  const { userName } = useAuth();
  const location = useLocation();
  const currentView = location.pathname.split('/')[1] || 'dashboard';

  const { greeting } = useMemo(() => {
    const now = new Date();
    const hour = now.getHours();

    let timeOfDay: keyof GreetingVariation;
    if (hour >= 5 && hour < 12) {
      timeOfDay = 'morning';
    } else if (hour >= 12 && hour < 17) {
      timeOfDay = 'afternoon';
    } else if (hour >= 17 && hour < 22) {
      timeOfDay = 'evening';
    } else {
      timeOfDay = 'night';
    }

    // Get a random greeting from the appropriate time of day
    const variations = greetingVariations[timeOfDay];
    const randomIndex = Math.floor(Math.random() * variations.length);
    const greeting = variations[randomIndex];

    return { greeting, timeOfDay };
  }, []);

  const pageInfo = getPageTitle(currentView);

  if (!userName) {
    return (
      <div>
        <h1 className="text-xl font-bold text-[var(--color-text-primary)]">
          {pageInfo.title}
        </h1>
        <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{pageInfo.subtitle}</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className={clsx(
        "text-xl font-bold text-[var(--color-text-primary)]",
        "flex items-baseline gap-2"
      )}>
        {greeting},
        <span className="text-accent">{userName}</span>
      </h1>
      <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{pageInfo.subtitle}</p>
    </div>
  );
};
