import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import {
  BookMarked, Timer, Zap, FileCheck2, TrendingUp, Sparkles,
  GraduationCap, Trophy, Users, HeartHandshake,
  BookOpen, ClipboardList, FileText, BarChart3, RefreshCcw,
  CheckCircle2, XCircle, ShieldCheck, Lock, Languages,
  Github, Linkedin, Mail, Smartphone, Code2, Globe, PlayCircle, ArrowRight
} from 'lucide-react';
import { stagger, fadeUp, slideUp } from '../utils/animations';

function SectionHeading({ eyebrow, title, sub }: { eyebrow: string; title: string; sub?: string }) {
  return (
    <motion.div variants={stagger} initial="hidden" animate="visible" className="mx-auto max-w-2xl text-center">
      <motion.p variants={fadeUp} className="text-sm font-semibold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
        {eyebrow}
      </motion.p>
      <motion.h2 variants={fadeUp} className="mt-2 text-3xl font-bold text-slate-900 sm:text-4xl dark:text-white">
        {title}
      </motion.h2>
      {sub && (
        <motion.p variants={fadeUp} className="mt-4 text-lg text-slate-500 dark:text-slate-400">
          {sub}
        </motion.p>
      )}
    </motion.div>
  );
}

function AboutHero() {
  const icons = [
    { Icon: BookOpen, cls: 'left-[6%] top-[18%] text-indigo-400/25 animate-[floatRight_9s_ease-in-out_infinite]' },
    { Icon: Timer, cls: 'left-[18%] bottom-[22%] text-purple-400/25 animate-[floatLeft_10s_ease-in-out_infinite]' },
    { Icon: Sparkles, cls: 'left-[38%] top-[12%] text-cyan-400/25 animate-[floatUp_7s_ease-in-out_infinite]' },
    { Icon: TrendingUp, cls: 'right-[16%] top-[20%] text-emerald-400/25 animate-[floatRight_11s_ease-in-out_infinite]' },
    { Icon: GraduationCap, cls: 'right-[32%] bottom-[18%] text-amber-400/25 animate-[floatLeft_9s_ease-in-out_infinite]' },
    { Icon: Zap, cls: 'right-[6%] bottom-[28%] text-indigo-300/20 animate-[floatUp_10s_ease-in-out_infinite]' },
  ];
  return (
    <section className="relative isolate overflow-hidden border-b border-slate-200 bg-gradient-to-br from-indigo-50 via-white to-purple-50 py-20 dark:border-slate-800 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 sm:py-28">
      <div className="pointer-events-none absolute inset-0 hidden sm:block">
        {icons.map(({ Icon, cls }, i) => (
          <Icon key={i} className={`absolute h-8 w-8 ${cls}`} />
        ))}
        <div className="ui-pastel-blob ui-pastel-blob--orange right-[8%] bottom-[-30%] h-64 w-64 rounded-full" />
        <div className="absolute -left-16 top-8 h-56 w-56 rounded-full bg-indigo-400/10 blur-3xl" />
        <div className="absolute -right-16 bottom-8 h-56 w-56 rounded-full bg-purple-400/10 blur-3xl" />
      </div>
      <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
        <motion.div variants={stagger} initial="hidden" animate="visible">
          <motion.span
            variants={fadeUp}
            className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-white px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-indigo-600 shadow-sm dark:border-indigo-500/30 dark:bg-slate-900 dark:text-indigo-400"
          >
            <BookOpen className="h-3.5 w-3.5" /> About PASSCO
          </motion.span>
          <motion.h1
            variants={fadeUp}
            className="mt-6 text-4xl font-bold leading-tight text-slate-900 sm:text-5xl lg:text-6xl dark:text-white"
          >
            Empowering Students to{' '}
            <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent dark:from-indigo-400 dark:to-purple-400">
              Prepare With Confidence
            </span>
          </motion.h1>
          <motion.p variants={fadeUp} className="mx-auto mt-6 max-w-2xl text-lg text-slate-500 dark:text-slate-400">
            PASSCO is a junior high school self-examination platform. Students practise with objective questions
            in real exam conditions, get instant feedback, and keep improving — one assessment at a time.
          </motion.p>
          <motion.div variants={fadeUp} className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href="/#subjects"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:from-indigo-600 hover:to-indigo-700 sm:w-auto"
            >
              <PlayCircle className="h-4 w-4" /> Explore PASSCO
            </a>
            <Link
              to="/features"
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 sm:w-auto dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-800"
            >
              See Features <ArrowRight className="h-4 w-4" />
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

function Story() {
  return (
    <section className="py-20">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <SectionHeading eyebrow="Our Story" title="Built From a Simple Observation" />
        <motion.div variants={slideUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="mt-10 space-y-5">
          <p className="text-lg leading-relaxed text-slate-600 dark:text-slate-400">
            Students spend hours creating study notes, but they seldom get to practise against the pressure of a real
            exam. Traditional preparation often means static past questions and paper stacks that can't tell you
            where you actually went wrong.
          </p>
          <p className="text-lg leading-relaxed text-slate-600 dark:text-slate-400">
            PASSCO started as a response to that gap: a single, always-available place where a JHS student can test
            their understanding, see instantly what they got right and wrong, and turn that feedback into better
            scores. No downloads, no waiting for marked scripts.
          </p>
          <p className="text-lg leading-relaxed text-slate-600 dark:text-slate-400">
            We keep it honest — we're not the biggest education platform in the world, and that's fine. We're focused
            on doing one thing really well: helping students in Ghana prepare for their junior high school
            examinations with confidence.
          </p>
        </motion.div>
      </div>
    </section>
  );
}

function Mission() {
  return (
    <section className="ui-surface-tinted border-y border-slate-200 py-20 dark:border-slate-800">
      <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
        <SectionHeading eyebrow="Our Mission" title="Practice Shouldn't Be a Punishment" />
        <motion.blockquote
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="mx-auto mt-10 max-w-2xl"
        >
          <p className="text-3xl font-bold leading-snug text-slate-900 sm:text-4xl dark:text-white">
            "Give every student the tools to{' '}
            <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent dark:from-indigo-400 dark:to-purple-400">
              test their understanding
            </span>{' '}
            and sharpen their performance."
          </p>
        </motion.blockquote>
        <motion.p variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="mx-auto mt-6 max-w-2xl text-lg text-slate-500 dark:text-slate-400">
          Whether a student is aiming for a strong BECE result or simply wants to stop guessing, PASSCO turns
          preparation into a daily, measurable habit.
        </motion.p>
      </div>
    </section>
  );
}

function Vision() {
  return (
    <section className="py-20">
      <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
        <SectionHeading eyebrow="Our Vision" title="Where We're Heading" />
        <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="mx-auto mt-8 max-w-2xl">
          <p className="text-xl leading-relaxed text-slate-600 dark:text-slate-400">
            A Ghana where confident exam preparation is a normal part of every student's routine — and where
            practice, feedback and steady improvement come together in one simple place.
          </p>
        </motion.div>
      </div>
    </section>
  );
}

const provides = [
  { icon: BookMarked, title: 'Eight Subjects', desc: 'Mathematics, Science, English Language, Social Studies, ICT, RME, Creative Arts and Career Technology.' },
  { icon: Timer, title: 'Three Practice Modes', desc: 'Quiz (7 min), Mock Test (15 min) and full Examination (50 min) — mirroring real BECE-style conditions.', accent: 'text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-500/10' },
  { icon: Zap, title: 'Instant Results', desc: 'Your score appears immediately after submission — percentage, grade from A+ to F, and pass or fail.', accent: 'text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-500/10' },
  { icon: FileCheck2, title: 'Detailed Reviews', desc: 'A question-by-question breakdown with the correct answer and explanation for every item.' },
  { icon: TrendingUp, title: 'Progress Tracking', desc: 'Analytics, subject-wise performance, learning streaks, achievements and a weekly leaderboard.' },
  { icon: Sparkles, title: 'Personalised Learning', desc: 'Strengths and weaknesses surfaced automatically, plus AI-supported question generation.' },
];

function Provides() {
  return (
    <section className="py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading eyebrow="What We Provide" title="Everything You Need to Practise Better" />
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {provides.map((item, i) => (
            <motion.div
              key={item.title}
              variants={slideUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              custom={i}
              className="rounded-2xl border border-slate-200 bg-white p-6 transition hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-500/5 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-500/40"
            >
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${item.accent || 'bg-indigo-100 dark:bg-indigo-500/10'}`}>
                <item.icon className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

const audience = [
  { icon: GraduationCap, title: 'JHS 1–3 Students', desc: 'Practise a specific subject or simulate a full exam whenever you have a free block of time.' },
  { icon: Trophy, title: 'BECE Candidates', desc: 'Build exam stamina with timed sessions and learn from instant, item-by-item feedback.' },
  { icon: Users, title: 'Teachers & Tutors', desc: 'Generate practice tests from real curricular topics and see where learners are struggling.' },
  { icon: HeartHandshake, title: 'Parents & Guardians', desc: 'Follow your child\'s scores and performance trends and spot subjects that need attention.' },
];

function Audience() {
  return (
    <section className="border-y border-slate-200 bg-slate-50 py-20 dark:border-slate-800 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading eyebrow="Who It's For" title="Made for Students. Useful for Everyone Around Them." />
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {audience.map((item, i) => (
            <motion.div
              key={item.title}
              variants={slideUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              custom={i}
              className="rounded-2xl border border-slate-200 bg-white p-6 text-center dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/20">
                <item.icon className="h-7 w-7 text-white" />
              </div>
              <h3 className="mt-4 text-base font-bold text-slate-900 dark:text-white">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

const cycle = [
  { icon: BookOpen, title: 'Learn', desc: 'Review notes and focus on topics you didn\'t grasp the first time.' },
  { icon: ClipboardList, title: 'Practice', desc: 'Take a subject-specific quiz or a mock test under timed conditions.' },
  { icon: FileText, title: 'Assess', desc: 'Get an instant percentage, grade and pass/fail verdict.' },
  { icon: BarChart3, title: 'Analyze', desc: 'See exactly which questions you missed, with the correct answers.' },
  { icon: TrendingUp, title: 'Improve', desc: 'Focus your revision on your weakest subjects and topics.' },
  { icon: RefreshCcw, title: 'Repeat', desc: 'Retake assessments any time to lock in progress and build confidence.' },
];

function Approach() {
  return (
    <section className="py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading eyebrow="Our Approach" title="A Continuous Learning Cycle" sub="Passco turns revision into a loop of practice, feedback and measurable improvement." />
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {cycle.map((step, i) => (
            <motion.div
              key={step.title}
              variants={slideUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              custom={i}
              className="relative rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"
            >
              <span className="absolute right-5 top-4 text-4xl font-black text-slate-100 dark:text-slate-800">{i + 1}</span>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-500/10">
                <step.icon className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h3 className="mt-4 text-base font-bold text-slate-900 dark:text-white">{step.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{step.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

const compared = [
  { label: 'Designed for JHS & BECE-style prep', us: true },
  { label: 'Timed sessions that mirror exam pressure', us: true },
  { label: 'Instant, item-by-item feedback', us: true },
  { label: 'Progress tracked over time', us: true },
  { label: 'Works on any device, no downloads', us: false, neutral: true },
  { label: 'Unlimited re-attempts to reinforce learning', us: true },
];

function WhyUs() {
  return (
    <section className="ui-surface-cream border-y border-slate-200 py-20 dark:border-slate-800">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <SectionHeading eyebrow="Why PASSCO" title="Built to Practise — Not Just to Read" />
        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          <motion.div
            variants={slideUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 dark:border-slate-800 dark:bg-slate-900"
          >
            <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
              <Zap className="h-5 w-5 text-amber-500" /> The PASSCO difference
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
              Most students never actually test themselves until the exam is days away. PASSCO makes practice a
              daily habit by giving you instant feedback on every question — so you learn from mistakes while
              they're still fresh.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
              And we're upfront about what we are not: a huge platform with a thousand features. We focus on
              assessment and feedback done really well.
            </p>
          </motion.div>
          <motion.div
            variants={slideUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            custom={1}
            className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 dark:border-slate-800 dark:bg-slate-900"
          >
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Why students choose PASSCO</h3>
            <ul className="mt-4 space-y-3">
              {compared.map((item) => (
                <li key={item.label} className="flex items-start gap-3">
                  {item.us ? (
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
                  ) : (
                    <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-slate-300 dark:text-slate-600" />
                  )}
                  <span className="text-sm text-slate-600 dark:text-slate-400">{item.label}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function Security() {
  return (
    <section className="py-20">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm sm:p-12 dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/20">
            <ShieldCheck className="h-8 w-8 text-white" />
          </div>
          <h2 className="mt-6 text-2xl font-bold text-slate-900 sm:text-3xl dark:text-white">Trust & Security</h2>
          <p className="mx-auto mt-4 max-w-2xl text-slate-600 dark:text-slate-400">
            Your data belongs to you. We secure accounts and stored information, never sell personal data, and
            keep the platform simple enough to run smoothly on the phones Ghanaian students actually use. We make
            claims we can back up — and we're clear when something is still a work in progress.
          </p>
          <div className="mx-auto mt-6 flex max-w-xl flex-wrap items-center justify-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              <Lock className="h-3.5 w-3.5" /> Private by default
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              <ShieldCheck className="h-3.5 w-3.5" /> Data never sold
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              <Smartphone className="h-3.5 w-3.5" /> Built for real devices
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

const roadmap = [
  { icon: Timer, title: 'Mock BECE bundles', desc: 'Sectional full-length papers in one sitting, timed like the real thing.' },
  { icon: Languages, title: 'More subjects & languages', desc: 'Additional subjects and local-language support where it helps learning.' },
  { icon: Users, title: 'Teacher & school dashboards', desc: 'Track whole classes and generate practice sets for many learners at once.' },
  { icon: FileText, title: 'Printable progress reports', desc: 'Share a parent-ready summary of scores and improvement over time.' },
];

function Future() {
  return (
    <section className="border-t border-slate-200 py-20 dark:border-slate-800">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading eyebrow="What's Next" title="The Future of PASSCO" sub="Here's what we're working on — marked honestly as planned, not live." />
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {roadmap.map((item, i) => (
            <motion.div
              key={item.title}
              variants={slideUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              custom={i}
              className="rounded-2xl border border-dashed border-slate-300 p-6 dark:border-slate-700"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100 dark:bg-purple-500/10">
                  <item.icon className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <span className="rounded-full bg-purple-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-purple-600 dark:bg-purple-500/10 dark:text-purple-400">
                  Planned
                </span>
              </div>
              <h3 className="mt-4 text-base font-bold text-slate-900 dark:text-white">{item.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Creator() {
  const stats = [
    { label: 'Subjects Covered', value: '8' },
    { label: 'Practice Modes', value: '3' },
    { label: 'Instant Feedback', value: 'Yes' },
    { label: 'Tech Stack', value: '10+' },
  ];
  return (
    <section className="relative isolate overflow-hidden pb-20">
      <div aria-hidden="true" className="ui-pastel-blob ui-pastel-blob--purple -z-10 left-1/2 top-10 h-80 w-80 -translate-x-1/2 rounded-full" />
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <SectionHeading eyebrow="Meet the Creator" title="The Mind Behind PASSCO" />
        <motion.div
          variants={slideUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="mt-12 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="relative h-40 overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-950 sm:h-48">
            <div className="absolute inset-0 opacity-10" style={{
              backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
              backgroundSize: '40px 40px',
            }} />
            <div className="absolute inset-0 overflow-hidden">
              <Code2 className="absolute left-[8%] top-[20%] h-5 w-5 text-indigo-400/20 animate-[floatRight_8s_ease-in-out_infinite]" />
              <Globe className="absolute left-[42%] top-[70%] h-5 w-5 text-cyan-300/15 animate-[floatLeft_8s_ease-in-out_infinite]" />
              <BookOpen className="absolute left-[60%] top-[18%] h-6 w-6 text-purple-400/20 animate-[floatUp_9s_ease-in-out_infinite]" />
              <Zap className="absolute left-[78%] top-[65%] h-5 w-5 text-amber-400/20 animate-[floatUp_11s_ease-in-out_infinite]" />
            </div>
            <div className="absolute -left-10 -top-10 h-40 w-40 rounded-full bg-indigo-500/20 blur-3xl" />
            <div className="absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-purple-500/20 blur-3xl" />
          </div>

          <div className="px-6 pb-8 sm:px-10">
            <div className="-mt-16 flex flex-col items-center sm:flex-row sm:items-end sm:gap-6">
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

            <p className="mt-6 max-w-2xl text-slate-600 dark:text-slate-400">
              A software developer and educator passionate about using technology to transform education in Ghana.
              Jonathan built PASSCO from the ground up — combining modern web technology with proven learning
              science to help JHS students prepare for their exams with confidence.
            </p>

            <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {stats.map((stat) => (
                <div key={stat.label} className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-center dark:border-slate-800 dark:bg-slate-800/50">
                  <p className="text-xl font-bold text-indigo-600 dark:text-indigo-400">{stat.value}</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{stat.label}</p>
                </div>
              ))}
            </div>

            <div className="mt-8">
              <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Tech Stack</h4>
              <div className="flex flex-wrap gap-2">
                {['React', 'TypeScript', 'Node.js', 'Express', 'Supabase', 'PostgreSQL', 'Tailwind CSS', 'Vite', 'Vercel', 'Git'].map((skill) => (
                  <span key={skill} className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400">
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              {[
                { href: 'https://github.com/AshiteyOkoe', label: 'GitHub', Icon: Github, external: true },
                { href: 'https://linkedin.com/in/ashiteyokoe', label: 'LinkedIn', Icon: Linkedin, external: true },
                { href: 'https://wa.me/233548544775', label: 'WhatsApp', Icon: Smartphone, external: true, whatsapp: true },
                { href: 'mailto:oashitey8@gmail.com', label: 'Email', Icon: Mail, external: false },
              ].map(({ href, label, Icon, external, whatsapp }) => (
                <motion.a
                  key={label}
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  href={href}
                  target={external ? '_blank' : undefined}
                  rel={external ? 'noopener noreferrer' : undefined}
                  className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium shadow-sm transition ${whatsapp
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300 hover:shadow dark:border-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:border-emerald-700'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:shadow dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-slate-600'}`}
                >
                  <Icon className="h-4 w-4" /> {label}
                </motion.a>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function CTA() {
  const navigate = useNavigate();
  return (
    <section className="border-t border-slate-200 py-20 dark:border-slate-800">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <motion.div
          variants={slideUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-700 px-6 py-16 text-center shadow-2xl shadow-indigo-500/30 sm:px-12"
        >
          <div className="pointer-events-none absolute -left-10 -top-10 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-12 -right-12 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
          <h2 className="relative text-3xl font-bold text-white sm:text-4xl">Ready to Practise Smarter?</h2>
          <p className="relative mx-auto mt-4 max-w-xl text-indigo-100">
            Start your 3-day free premium trial and see how rapid feedback changes the way you prepare.
          </p>
          <div className="relative mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <button
              onClick={() => navigate('/register')}
              className="w-full rounded-xl bg-white px-6 py-3 text-sm font-semibold text-indigo-700 shadow-lg transition hover:bg-indigo-50 sm:w-auto"
            >
              Get Started Free
            </button>
            <Link
              to="/contact"
              className="w-full rounded-xl border border-white/30 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10 sm:w-auto"
            >
              Talk to Us
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

export default function About() {
  return (
    <div>
      <AboutHero />
      <Story />
      <Mission />
      <Vision />
      <Provides />
      <Audience />
      <Approach />
      <WhyUs />
      <Security />
      <Future />
      <Creator />
      <CTA />
    </div>
  );
}