import React, { useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLocation } from 'react-router-dom';

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
  switch (currentView) {
    case 'analytics':
      return <><span>Analytics</span>&nbsp;&middot;&nbsp;<span className="italic">Your financial insights at a glance</span></>;
    case 'transactions':
      return <><span>Transactions</span>&nbsp;&middot;&nbsp;<span className="italic">Track your money movements</span></>;
    case 'financial-health':
      return <><span>Financial Health</span>&nbsp;&middot;&nbsp;<span className="italic">Improving your financial wellbeing</span></>;
    case 'projections':
      return <><span>Financial Projections</span>&nbsp;&middot;&nbsp;<span className="italic">Visualize your financial future</span></>;
    default:
      return 'Smart money management';
  }
};

export const UserGreeting: React.FC = () => {
  const { userName } = useAuth();
  const location = useLocation();
  const currentView = location.pathname.split('/')[1];
  
  const { greeting, timeOfDay } = useMemo(() => {
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
  


  if (!userName) {
    return <h1 className="text-2xl font-bold text-gray-800 dark:text-white">{getPageTitle(currentView)}</h1>;
  }
  
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
        {greeting}, {userName}
      </h1>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        {getPageTitle(currentView)}
      </p>
    </div>
  );
};
