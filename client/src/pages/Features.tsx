import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { stagger, fadeUp } from '../utils/animations';
import { Check, ArrowRight, Upload, Brain, BarChart3, Shield, Zap, GraduationCap, BookOpen, FileText, Users, Timer, RefreshCw, Layers } from 'lucide-react';
import { HeroStudents, StudentQuiz, AnalyticsChart } from '../components/icons/Illustrations';

export default function Features() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div>
      {/* Hero */}
      <section className="border-b border-slate-200 bg-gradient-to-br from-indigo-50 to-white py-20 dark:border-slate-800 dark:from-slate-950 dark:to-slate-900">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <motion.div variants={stagger} initial="hidden" animate="visible">
            <motion.h1 variants={fadeUp} className="text-4xl font-bold text-slate-900 sm:text-5xl dark:text-white">
              Powerful Features for Smarter Learning
            </motion.h1>
            <motion.p variants={fadeUp} className="mt-4 text-lg text-slate-500 dark:text-slate-400">
              Everything you need to transform your study materials into effective exam preparation.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Illustrations + Feature Details */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {[
            {
              title: 'File Upload & Processing',
              desc: 'Upload any study material and our AI extracts the content automatically.',
              icon: Upload,
              gradient: 'from-indigo-500 to-indigo-600',
              illustration: <HeroStudents size="lg" />,
              points: ['PDF, DOCX, PPT, images, and text files', 'Drag-and-drop upload interface', 'Real-time processing status', 'Secure file storage and encryption', 'Batch upload support'],
            },
            {
              title: 'AI Question Generation',
              desc: 'Smart algorithms analyze your content and generate relevant questions.',
              icon: Brain,
              gradient: 'from-emerald-500 to-emerald-600',
              illustration: <StudentQuiz size="lg" />,
              points: ['Multiple-choice and true/false questions', 'Adjustable difficulty levels', 'Topic-based question organization', 'Bulk question generation', 'Review and edit generated questions'],
            },
            {
              title: 'Progress Analytics',
              desc: 'Comprehensive analytics to track your performance and identify weak areas.',
              icon: BarChart3,
              gradient: 'from-amber-500 to-amber-600',
              illustration: <AnalyticsChart size="lg" />,
              points: ['Visual score history charts', 'Topic-wise performance breakdown', 'Weak area identification', 'Progress over time tracking', 'Comparative analysis'],
            },
          ].map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              className="mb-20 grid items-center gap-12 lg:grid-cols-2"
            >
              <div className={i % 2 === 1 ? 'lg:order-2' : ''}>
                <span className={`inline-flex items-center gap-2 rounded-full bg-gradient-to-r ${feature.gradient} px-4 py-1.5 text-xs font-semibold text-white`}>
                  <feature.icon className="h-3.5 w-3.5" />
                  {feature.title.split(' ')[0]}
                </span>
                <h2 className="mt-4 text-2xl font-bold text-slate-900 dark:text-white">{feature.title}</h2>
                <p className="mt-3 text-slate-500 dark:text-slate-400">{feature.desc}</p>
                <ul className="mt-6 space-y-3">
                  {feature.points.map((point) => (
                    <li key={point} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
              <div className={`flex items-center justify-center ${i % 2 === 1 ? 'lg:order-1' : ''}`}>
                <div className="rounded-2xl bg-white p-4 shadow-xl ring-1 ring-slate-200/50 dark:bg-slate-900 dark:ring-slate-800/50">
                  {feature.illustration}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Additional Features Grid */}
      <section className="border-y border-slate-200 bg-slate-50 py-20 dark:border-slate-800 dark:bg-slate-950">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.h2
            className="mb-12 text-center text-3xl font-bold text-slate-900 dark:text-white"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            More Great Features
          </motion.h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: Timer, title: 'Timed Quizzes', desc: 'Practice under exam conditions with customizable time limits.' },
              { icon: Layers, title: 'Multiple Subjects', desc: 'Organize quizzes by subject, topic, or document.' },
              { icon: RefreshCw, title: 'Retake & Improve', desc: 'Retake quizzes to reinforce learning and track improvement.' },
              { icon: Shield, title: 'Data Privacy', desc: 'Your study materials are encrypted and never shared.' },
              { icon: Users, title: 'Class Management', desc: 'Teachers can create quizzes and assign them to students.' },
              { icon: BookOpen, title: 'Rich Explanations', desc: 'Detailed explanations help you understand every answer.' },
            ].map((feat, i) => (
              <motion.div
                key={feat.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-500/10">
                  <feat.icon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">{feat.title}</h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{feat.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white">
              Start Using All Features Today
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-slate-500 dark:text-slate-400">
              Create an account and unlock the full power of AI-powered exam preparation.
            </p>
            <div className="mt-8">
              <Link
                to={user ? '/dashboard' : '/register'}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:from-indigo-600 hover:to-indigo-700"
              >
                {user ? 'Go to Dashboard' : 'Get Started Free'}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
