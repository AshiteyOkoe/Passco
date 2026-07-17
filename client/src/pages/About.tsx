import { motion } from 'framer-motion';
import { BookOpen, Target, Heart, Lightbulb, Github, Linkedin, Mail } from 'lucide-react';
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

      {/* Creator */}
      <section className="border-y border-slate-200 bg-slate-50 py-20 dark:border-slate-800 dark:bg-slate-950">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <h2 className="mb-12 text-3xl font-bold text-slate-900 dark:text-white">Meet the Creator</h2>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="flex flex-col items-center gap-8 md:flex-row md:items-start md:gap-12"
          >
            <div className="shrink-0">
              <div className="relative">
                <div className="absolute -inset-1 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 opacity-20 blur" />
                <img
                  src="/images/avatars/my.png"
                  alt="Jonathan Ashitey Okoe"
                  className="relative h-40 w-40 rounded-full border-4 border-white object-cover shadow-xl dark:border-slate-800 md:h-48 md:w-48"
                />
              </div>
            </div>

            <div className="text-center md:text-left">
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Jonathan Ashitey Okoe</h3>
              <p className="mt-1 text-sm font-medium text-indigo-600 dark:text-indigo-400">Founder & Developer</p>
              <p className="mt-4 max-w-lg text-slate-600 dark:text-slate-400">
                A passionate software developer and educator who believes every student deserves access to
                quality exam preparation tools. Jonathan created Passco to solve a problem he witnessed
                firsthand — students struggling with ineffective study methods and limited practice resources.
              </p>
              <p className="mt-3 max-w-lg text-slate-600 dark:text-slate-400">
                With a background in computer science and a deep commitment to education in Ghana,
                he built Passco from the ground up — combining modern web technology with proven learning
                science to help JHS students across the country prepare for their exams with confidence.
              </p>
              <div className="mt-6 flex items-center gap-4 md:justify-start">
                <motion.a
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  href="https://github.com/AshiteyOkoe"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
                >
                  <Github className="h-5 w-5" />
                </motion.a>
                <motion.a
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  href="https://linkedin.com/in/ashiteyokoe"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
                >
                  <Linkedin className="h-5 w-5" />
                </motion.a>
                <motion.a
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  href="mailto:oashitey8@gmail.com"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
                >
                  <Mail className="h-5 w-5" />
                </motion.a>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
