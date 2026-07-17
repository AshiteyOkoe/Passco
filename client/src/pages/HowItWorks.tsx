import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { stagger, fadeUp } from '../utils/animations';
import { GraduationCap, ClipboardCheck, Award, BarChart3, ArrowRight, Check } from 'lucide-react';

const steps = [
  {
    icon: GraduationCap,
    title: '1. Pick Your Class & Subject',
    desc: 'Choose your JHS class level, select one of 8 subjects — Mathematics, Science, English, and more — then pick your difficulty mode.',
    details: [
      'Three class levels: JHS 1, JHS 2, and JHS 3',
      'Eight subjects aligned to the Ghanaian curriculum',
      'Three modes: Quiz (7 min), Mock Test (15 min), or Examination (50 min)',
      'Switch subjects and difficulties anytime',
    ],
    gradient: 'from-indigo-500 to-indigo-600',
  },
  {
    icon: ClipboardCheck,
    title: '2. Take the Assessment',
    desc: 'Answer timed multiple-choice questions curated by educators. Each test is designed to mirror real exam conditions.',
    details: [
      'Well-structured MCQs across all subjects',
      'Countdown timer keeps you on track',
      'Navigate freely between questions',
      'Flag questions to review before submitting',
    ],
    gradient: 'from-emerald-500 to-emerald-600',
  },
  {
    icon: Award,
    title: '3. Get Instant Results & Badges',
    desc: 'See your score the moment you submit. Get a full grade breakdown and earn achievement badges as you improve.',
    details: [
      'Grade scale: A+ to F with pass/fail indicator',
      'Question-by-question review with correct answers',
      'Unlock badges: First Step, High Achiever, Class Champion, and more',
      'Confetti celebration on passing scores',
    ],
    gradient: 'from-amber-500 to-amber-600',
  },
  {
    icon: BarChart3,
    title: '4. Track Your Progress',
    desc: 'Monitor your performance over time. See how you rank, which subjects you excel in, and where you need more practice.',
    details: [
      'Dashboard with quizzes taken, average score, and current rank',
      'Subject-wise performance breakdown',
      'Full results history with filtering',
      'Compare scores across attempts',
    ],
    gradient: 'from-violet-500 to-violet-600',
  },
];

export default function HowItWorks() {
  const { user } = useAuth();

  return (
    <div>
      {/* Hero */}
      <section className="border-b border-slate-200 bg-gradient-to-br from-indigo-50 to-white py-20 dark:border-slate-800 dark:from-slate-950 dark:to-slate-900">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <motion.div variants={stagger} initial="hidden" animate="visible">
            <motion.h1 variants={fadeUp} className="text-4xl font-bold text-slate-900 sm:text-5xl dark:text-white">
              How Passco Works
            </motion.h1>
            <motion.p variants={fadeUp} className="mt-4 text-lg text-slate-500 dark:text-slate-400">
              Four simple steps to prepare for your exams and track your progress.
            </motion.p>
            <motion.div variants={fadeUp} className="mt-8">
              <Link
                to={user ? '/assessment/setup' : '/register'}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:from-indigo-600 hover:to-indigo-700"
              >
                {user ? 'Take an Assessment' : 'Get Started'}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Steps */}
      <section className="py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="space-y-20">
            {steps.map((step, i) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.5 }}
                className={`grid gap-8 items-center ${i % 2 === 0 ? '' : 'md:direction-rtl'}`}
                style={{ direction: i % 2 === 0 ? 'ltr' as const : undefined }}
              >
                <div className={i % 2 === 0 ? 'md:order-1' : 'md:order-2'}>
                  <span className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold text-white bg-gradient-to-r ${step.gradient}`}>
                    Step {i + 1}
                  </span>
                  <h2 className="mt-4 text-2xl font-bold text-slate-900 dark:text-white">{step.title}</h2>
                  <p className="mt-3 text-slate-500 dark:text-slate-400">{step.desc}</p>
                  <ul className="mt-6 space-y-3">
                    {step.details.map((detail) => (
                      <li key={detail} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                        {detail}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className={`flex items-center justify-center ${i % 2 === 0 ? 'md:order-2' : 'md:order-1'}`}>
                  <div className={`flex h-32 w-32 items-center justify-center rounded-3xl bg-gradient-to-br ${step.gradient} shadow-xl`}>
                    <step.icon className="h-14 w-14 text-white" />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-slate-200 bg-slate-50 py-20 dark:border-slate-800 dark:bg-slate-950">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white">
              Ready to Start Learning?
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-slate-500 dark:text-slate-400">
              Join thousands of JHS students already using Passco to prepare smarter.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                to={user ? '/assessment/setup' : '/register'}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:from-indigo-600 hover:to-indigo-700"
              >
                {user ? 'Take an Assessment' : 'Get Started Free'}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
