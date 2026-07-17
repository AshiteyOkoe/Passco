import { motion } from 'framer-motion';
import { BookOpen, Target, Heart, Lightbulb } from 'lucide-react';
import { stagger, fadeUp } from '../utils/animations';

export default function About() {
  return (
    <div>
      {/* Hero */}
      <section className="border-b border-slate-200 bg-gradient-to-br from-indigo-50 to-white py-20 dark:border-slate-800 dark:from-slate-950 dark:to-slate-900">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <motion.div variants={stagger} initial="hidden" animate="visible">
            <motion.h1 variants={fadeUp} className="text-4xl font-bold text-slate-900 sm:text-5xl dark:text-white">
              About Passco
            </motion.h1>
            <motion.p variants={fadeUp} className="mt-4 text-lg text-slate-500 dark:text-slate-400">
              We're on a mission to make exam preparation accessible, effective, and even enjoyable for every student.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Story */}
      <section className="py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="prose prose-slate mx-auto dark:prose-invert"
          >
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Our Story</h2>
            <p className="mt-4 text-slate-600 dark:text-slate-400">
              Passco was born from a simple observation: students spend hours creating study notes but often lack
              effective ways to test their understanding. Traditional exam preparation relies on static past
              questions that may not cover recently studied material.
            </p>
            <p className="mt-4 text-slate-600 dark:text-slate-400">
              We built Passco to bridge this gap. By leveraging AI technology, we transform any study material
              into personalized quizzes, enabling students to test their knowledge comprehensively and identify
              areas needing improvement.
            </p>
            <p className="mt-4 text-slate-600 dark:text-slate-400">
              Today, thousands of students use Passco to prepare for their exams — from primary school assessments
              to graduate-level certifications.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Values */}
      <section className="border-y border-slate-200 bg-slate-50 py-20 dark:border-slate-800 dark:bg-slate-950">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.h2
            className="mb-12 text-center text-3xl font-bold text-slate-900 dark:text-white"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            Our Values
          </motion.h2>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Lightbulb, title: 'Innovation', desc: 'Leveraging cutting-edge AI to transform how students prepare for exams.' },
              { icon: Target, title: 'Accessibility', desc: 'Making quality exam preparation tools available to every student, everywhere.' },
              { icon: Heart, title: 'Student-Centric', desc: 'Every feature we build is designed with the student\'s learning journey in mind.' },
              { icon: BookOpen, title: 'Excellence', desc: 'Committed to accuracy, reliability, and continuous improvement of our platform.' },
            ].map((value, i) => (
              <motion.div
                key={value.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="rounded-2xl border border-slate-200 bg-white p-6 text-center dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-500/10">
                  <value.icon className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <h3 className="mb-2 text-lg font-bold text-slate-900 dark:text-white">{value.title}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">{value.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-20">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Built with Passion</h2>
            <p className="mt-3 text-slate-500 dark:text-slate-400">
              Passco is developed by a dedicated team of educators, engineers, and designers who believe in
              the power of active recall and spaced repetition. We're constantly improving the platform based on
              feedback from students and teachers.
            </p>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
