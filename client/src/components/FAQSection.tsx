import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

export interface FAQItem {
  question: string;
  answer: string;
}

const defaultFaqs: FAQItem[] = [
  {
    question: 'What is Passco?',
    answer:
      'Passco is a JHS self-examination platform designed for Ghanaian students in JHS 1, JHS 2 and JHS 3. Practice with objective questions across 8 subjects — Mathematics, Science, English Language, Social Studies, ICT, RME, Creative Arts and Career Technology — and get instant results, grades and detailed feedback.',
  },
  {
    question: 'How much does Passco cost?',
    answer:
      'Passco offers a 3-day free premium trial so you can explore all features before subscribing. After the trial, a subscription is GH₵15 every 14 days, which unlocks unlimited mock tests, full-length examinations, detailed analytics and more.',
  },
  {
    question: 'Which class levels are supported?',
    answer:
      'Passco supports all three junior high levels: JHS 1, JHS 2 and JHS 3. Choose your class level during registration and you can select your class again each time you set up an assessment.',
  },
  {
    question: 'What types of assessments can I take?',
    answer:
      'Four modes: Quiz, Mock Test (10 questions · 7 minutes), Examination (20 questions · 15 minutes) and Likely BECE (50 questions · 50 minutes). Each assessment is made up of objective questions that mirror real BECE-style conditions.',
  },
  {
    question: 'How do I see my results?',
    answer:
      'Results appear instantly after you submit. You get a percentage score, a grade from A+ to F, a pass/fail indicator, a question-by-question review with the correct answers, and a confetti celebration when you pass.',
  },
  {
    question: 'Can I track my progress over time?',
    answer:
      'Yes. Your dashboard and analytics pages show your scores over time, subject-wise performance, strengths and weaknesses, learning streak, achievements and your position on the weekly leaderboard.',
  },
  {
    question: 'Can I retake an assessment?',
    answer:
      'Absolutely. You can retake any subject or mode as many times as you want. Retakes help reinforce learning and your improvement is tracked automatically.',
  },
  {
    question: 'How do I pay and is my payment secure?',
    answer:
      'Subscriptions are processed securely through Paystack, which supports mobile money and card payments in Ghana. Your card details never touch our servers.',
  },
  {
    question: 'What happens if my subscription expires?',
    answer:
      'Your account automatically returns to the free plan. You can resubscribe at any time from the Subscription page to regain full access instantly.',
  },
];

export default function FAQSection({ faqs = defaultFaqs }: { faqs?: FAQItem[] }) {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-3">
      {faqs.map((faq, i) => {
        const isOpen = open === i;
        return (
          <div
            key={faq.question}
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white transition-colors dark:border-slate-800 dark:bg-slate-900"
          >
            <button
              onClick={() => setOpen(isOpen ? null : i)}
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
            >
              <span className="text-sm font-semibold text-slate-900 dark:text-white">{faq.question}</span>
              <ChevronDown
                className={`h-5 w-5 shrink-0 text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180 text-indigo-500' : ''}`}
              />
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                >
                  <p className="px-5 pb-5 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{faq.answer}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}