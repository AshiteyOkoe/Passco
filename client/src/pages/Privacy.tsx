import { motion } from 'framer-motion';
import { stagger, fadeUp } from '../utils/animations';
import { privacySections } from '../data/legalContent';

export default function Privacy() {
  return (
    <div>
      <section className="border-b border-slate-200 bg-gradient-to-br from-indigo-50 to-white py-20 dark:border-slate-800 dark:from-slate-950 dark:to-slate-900">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <motion.div variants={stagger} initial="hidden" animate="visible">
            <motion.h1 variants={fadeUp} className="text-4xl font-bold text-slate-900 sm:text-5xl dark:text-white">
              Privacy Policy
            </motion.h1>
            <motion.p variants={fadeUp} className="mt-4 text-lg text-slate-500 dark:text-slate-400">
              Last updated: {new Date().toLocaleDateString()}
            </motion.p>
          </motion.div>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="space-y-10 text-slate-600 dark:text-slate-300">
            {privacySections.map((section) => (
              <motion.div
                key={section.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
              >
                <h2 className="mb-3 text-xl font-bold text-slate-900 dark:text-white">{section.title}</h2>
                <p className="leading-relaxed">{section.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}