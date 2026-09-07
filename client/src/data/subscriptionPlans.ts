import { Gem, type LucideIcon } from 'lucide-react';

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  period: string;
  description: string;
  icon: LucideIcon;
  color: string;
  bg: string;
  border: string;
  popular: boolean;
  features: string[];
  limitations: string[];
}

export const subscriptionPlans: SubscriptionPlan[] = [
  {
    id: 'basic',
    name: 'QnA Access Plan',
    price: 15,
    period: '/14 days',
    description: 'Full access to all features',
    icon: Gem,
    color: 'from-blue-500 to-blue-600',
    bg: 'bg-blue-50 dark:bg-blue-500/10',
    border: 'border-blue-200 dark:border-blue-800',
    popular: true,
    features: [
      'Access to all subjects',
      'Unlimited quizzes',
      'Unlimited mock exams',
      'Unlimited examinations',
      'Unlimited AI-generated questions',
      'Advanced analytics & reports',
      'Performance insights',
      'Priority support',
    ],
    limitations: [],
  },
];