import { motion } from 'framer-motion';
import { BookOpen, Target, Heart, Lightbulb, Github, Linkedin, Mail, Code2, GraduationCap, Globe, Smartphone, Terminal, Database, Server, Cpu, Cloud, Zap } from 'lucide-react';
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
      <section className="py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Meet the Creator</h2>
            <p className="mt-3 text-slate-500 dark:text-slate-400">The mind behind Passco</p>
          </motion.div>

          {/* Profile Card */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="mt-12 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900"
          >
            {/* Header Banner */}
            <div className="relative h-40 overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-950 sm:h-48">
              {/* Grid pattern */}
              <div className="absolute inset-0 opacity-10" style={{
                backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
                backgroundSize: '40px 40px',
              }} />
              {/* Floating tech icons */}
              <div className="absolute inset-0 overflow-hidden">
                <Terminal className="absolute left-[8%] top-[20%] h-5 w-5 text-indigo-400/20" />
                <Database className="absolute left-[20%] top-[60%] h-6 w-6 text-purple-400/20" />
                <Server className="absolute left-[35%] top-[15%] h-5 w-5 text-cyan-400/20" />
                <Cpu className="absolute left-[50%] top-[55%] h-7 w-7 text-indigo-300/15" />
                <Cloud className="absolute left-[65%] top-[25%] h-6 w-6 text-purple-300/20" />
                <Zap className="absolute left-[78%] top-[65%] h-5 w-5 text-amber-400/20" />
                <Code2 className="absolute left-[88%] top-[20%] h-6 w-6 text-indigo-400/15" />
                <Globe className="absolute left-[42%] top-[70%] h-5 w-5 text-cyan-300/15" />
              </div>
              {/* Code snippet overlay */}
              <div className="absolute right-6 top-4 hidden font-mono text-[10px] leading-relaxed text-indigo-300/20 sm:block">
                <p>{'const passco = {'}</p>
                <p className="ml-4">{'mission: "education",'}</p>
                <p className="ml-4">{'stack: ["React", "Node"],'}</p>
                <p className="ml-4">{'impact: "global",'}</p>
                <p>{'};'}</p>
              </div>
              {/* Gradient orbs */}
              <div className="absolute -left-10 -top-10 h-40 w-40 rounded-full bg-indigo-500/20 blur-3xl" />
              <div className="absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-purple-500/20 blur-3xl" />
            </div>

            <div className="px-6 pb-8 sm:px-10">
              {/* Avatar + Name */}
              <div className="flex flex-col items-center -mt-16 sm:flex-row sm:items-end sm:gap-6">
                <div className="relative shrink-0">
                  <div className="absolute -inset-1 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 opacity-30 blur" />
                  <img
                    src="/images/avatars/my.png"
                    alt="Jonathan Ashitey Okoe"
                    className="relative h-32 w-32 rounded-full border-4 border-white object-cover shadow-lg dark:border-slate-900 sm:h-40 sm:w-40"
                  />
                </div>
                <div className="mt-4 text-center sm:mt-0 sm:pb-1 sm:text-left">
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Jonathan Ashitey Okoe</h3>
                  <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400">Full-Stack Developer & EdTech Pioneer</p>
                </div>
              </div>

              {/* Bio */}
              <p className="mt-6 max-w-2xl text-slate-600 dark:text-slate-400">
                A software developer and educator passionate about using technology to transform education in Ghana.
                Jonathan built Passco from the ground up — combining modern web technology with proven learning
                science to help JHS students prepare for their exams with confidence.
              </p>

              {/* Stats */}
              <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
                {[
                  { label: 'Subjects Covered', value: '8+' },
                  { label: 'Question Bank', value: '1000+' },
                  { label: 'Students Served', value: '500+' },
                  { label: 'Tech Stack', value: '10+' },
                ].map((stat, i) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2 + i * 0.05 }}
                    className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-center dark:border-slate-800 dark:bg-slate-800/50"
                  >
                    <p className="text-xl font-bold text-indigo-600 dark:text-indigo-400">{stat.value}</p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{stat.label}</p>
                  </motion.div>
                ))}
              </div>

              {/* Skills */}
              <div className="mt-8">
                <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Tech Stack</h4>
                <div className="flex flex-wrap gap-2">
                  {['React', 'TypeScript', 'Node.js', 'Express', 'Supabase', 'PostgreSQL', 'Tailwind CSS', 'Vite', 'Vercel', 'Git'].map((skill) => (
                    <span
                      key={skill}
                      className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              {/* Focus Areas */}
              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                {[
                  { icon: Code2, label: 'Full-Stack Development', desc: 'End-to-end web application design and development' },
                  { icon: GraduationCap, label: 'EdTech Solutions', desc: 'Building tools that make learning more effective' },
                  { icon: Globe, label: 'Open Source', desc: 'Contributing to the developer community' },
                ].map((area, i) => (
                  <motion.div
                    key={area.label}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 + i * 0.05 }}
                    className="flex items-start gap-3 rounded-xl border border-slate-100 p-4 dark:border-slate-800"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-500/10">
                      <area.icon className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800 dark:text-white">{area.label}</p>
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{area.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Social Links */}
              <div className="mt-8 flex items-center gap-3">
                <motion.a
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  href="https://github.com/AshiteyOkoe"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:shadow dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-slate-600"
                >
                  <Github className="h-4 w-4" /> GitHub
                </motion.a>
                <motion.a
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  href="https://linkedin.com/in/ashiteyokoe"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:shadow dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-slate-600"
                >
                  <Linkedin className="h-4 w-4" /> LinkedIn
                </motion.a>
                <motion.a
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  href="https://wa.me/233548544775"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 shadow-sm transition hover:border-emerald-300 hover:shadow dark:border-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:border-emerald-700"
                >
                  <Smartphone className="h-4 w-4" /> WhatsApp
                </motion.a>
                <motion.a
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  href="mailto:oashitey8@gmail.com"
                  className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:shadow dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-slate-600"
                >
                  <Mail className="h-4 w-4" /> Email
                </motion.a>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
