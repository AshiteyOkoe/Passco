import { motion } from 'framer-motion';
import { stagger, fadeUp } from '../utils/animations';
import FAQSection from '../components/FAQSection';

export default function FAQ() {
  return (
    <div>
      <section className="border-b border-slate-200 bg-gradient-to-br from-indigo-50 to-white py-20 dark:border-slate-800 dark:from-slate-950 dark:to-slate-900">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <motion.div variants={stagger} initial="hidden" animate="visible">
            <motion.h1 variants={fadeUp} className="text-4xl font-bold text-slate-900 sm:text-5xl dark:text-white">
              Frequently Asked Questions
            </motion.h1>
            <motion.p variants={fadeUp} className="mt-4 text-lg text-slate-500 dark:text-slate-400">
              Everything you need to know about Passco, subscriptions and assessments.
            </motion.p>
          </motion.div>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <FAQSection />
        </div>
      </section>
    </div>
  );
}