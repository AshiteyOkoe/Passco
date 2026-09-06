import { useState, useEffect, useRef, type FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useSearchParams } from 'react-router-dom';
import { stagger, fadeUp, slideUp } from '../utils/animations';
import {
  Mail, Phone, MessageCircle, MapPin, Send, CheckCircle, AlertCircle,
  Paperclip, X, Loader2, HelpCircle, ChevronDown, ListChecks, Clock, Image, FileText, Lock, Twitter, Facebook, Instagram, Youtube
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSubscription } from '../context/SubscriptionContext';
import { sendContactMessage } from '../services/api';

const SUBJECTS = [
  'General Enquiry',
  'Account & Technical Help',
  'Billing & Payments',
  'Report a Question',
  'Feedback & Suggestions',
];

const MAX_ATTACHMENT = 2 * 1024 * 1024;

const faqs = [
  {
    question: 'How do I reset my password?',
    answer: 'On the login screen, choose "Forgot password". We\'ll send a one-time code to your email that lets you set a new password.',
  },
  {
    question: 'How does the free trial work?',
    answer: 'New accounts get a 3-day free premium trial. After it ends, you continue on the free plan until you subscribe (GH₵15 every 14 days).',
  },
  {
    question: 'What if I can\'t log in after subscribing?',
    answer: 'Give it a minute or two after payment confirmation, then log out and back in. If it still fails, message us and include your account ID.',
  },
  {
    question: 'How do I report a question I think is wrong?',
    answer: 'While taking any assessment, tap the "⋯ Report" button next to the question you want to flag. You can also choose "Report a Question" as the subject of this form.',
  },
];

const socials = [
  { label: 'Twitter / X', Icon: Twitter },
  { label: 'Facebook', Icon: Facebook },
  { label: 'Instagram', Icon: Instagram },
  { label: 'YouTube', Icon: Youtube },
];

function ContactHero() {
  return (
    <section className="border-b border-slate-200 bg-gradient-to-br from-indigo-50 via-white to-purple-50 py-20 dark:border-slate-800 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 sm:py-24">
      <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
        <motion.div variants={stagger} initial="hidden" animate="visible">
          <motion.span variants={fadeUp} className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-white px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-indigo-600 shadow-sm dark:border-indigo-500/30 dark:bg-slate-900 dark:text-indigo-400">
            <HelpCircle className="h-3.5 w-3.5" /> Contact Us
          </motion.span>
          <motion.h1 variants={fadeUp} className="mt-6 text-4xl font-bold leading-tight text-slate-900 sm:text-5xl dark:text-white">
            We're Here to Help
          </motion.h1>
          <motion.p variants={fadeUp} className="mx-auto mt-4 max-w-2xl text-lg text-slate-500 dark:text-slate-400">
            Questions, feedback or need support? Send us a message and we'll get back to you — usually within 24 hours.
          </motion.p>
        </motion.div>
      </div>
    </section>
  );
}

function InfoCards() {
  const cards = [
    { Icon: Mail, title: 'Email Support', desc: 'support@passco.app', href: 'mailto:support@passco.app', note: 'Best for detailed questions' },
    { Icon: MessageCircle, title: 'WhatsApp', desc: '+233 20 743 5678', href: 'https://wa.me/233207435678', note: 'Fastest for quick help', external: true },
    { Icon: ListChecks, title: 'Help Center', desc: 'Browse the FAQs', href: '/#faq', note: 'Answers to common questions', internal: true },
    { Icon: Clock, title: 'Support Hours', desc: 'Mon–Sat, 8am–8pm GMT', note: 'Messages answered in ~24h' },
  ];
  return (
    <section className="py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map(({ Icon, title, desc, href, note, external, internal }, i) => (
            <motion.div
              key={title}
              variants={slideUp}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              custom={i}
              className="rounded-2xl border border-slate-200 bg-white p-6 transition hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-500/5 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-indigo-500/40"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-500/10">
                <Icon className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
              </div>
              <p className="mt-4 text-sm font-semibold text-slate-500 dark:text-slate-400">{title}</p>
              {href ? (
                internal ? (
                  <Link to={href} className="mt-1 block text-lg font-bold text-slate-900 transition hover:text-indigo-600 dark:text-white dark:hover:text-indigo-400">
                    {desc}
                  </Link>
                ) : (
                  <a
                    href={href}
                    target={external ? '_blank' : undefined}
                    rel={external ? 'noopener noreferrer' : undefined}
                    className="mt-1 block text-lg font-bold text-slate-900 transition hover:text-indigo-600 dark:text-white dark:hover:text-indigo-400"
                  >
                    {desc}
                  </a>
                )
              ) : (
                <p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">{desc}</p>
              )}
              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{note}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ContactForm() {
  const { user } = useAuth();
  const { isPremium, isTrial } = useSubscription();
  const [searchParams] = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [accountType, setAccountType] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [attachment, setAttachment] = useState<{ name: string; size: number; data: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const s = searchParams.get('subject');
    if (s && SUBJECTS.includes(s)) setSubject(s);
  }, [searchParams]);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
      setAccountType(user.role === 'admin' ? 'Admin' : 'Student account');
    }
  }, [user]);

  const accountStatus = !user
    ? 'Not signed in'
    : isPremium
      ? 'Premium'
      : isTrial
        ? 'Free trial'
        : 'Free plan';

  function onFileSelected(file: File | undefined) {
    if (!file) return;
    if (file.size > MAX_ATTACHMENT) {
      setError('Attachment must be under 2 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setAttachment({ name: file.name, size: file.size, data: String(reader.result) });
    reader.readAsDataURL(file);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await sendContactMessage({
        name,
        email,
        accountType: accountType || undefined,
        subject,
        message,
        attachment: attachment?.data,
        attachmentName: attachment?.name,
      });
      setSuccess(true);
      setName('');
      setEmail('');
      setMessage('');
      setAttachment(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setTimeout(() => setSuccess(false), 6000);
    } catch (err) {
      setError('We couldn\'t send your message. Please try again in a moment.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const inputCls =
    'w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white';

  return (
    <section className="pb-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-start gap-12 lg:grid-cols-5">
          <motion.div variants={slideUp} initial="hidden" whileInView="visible" viewport={{ once: true }} className="lg:col-span-2">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Send Us a Message</h2>
            <p className="mt-3 text-slate-500 dark:text-slate-400">
              Fill in the form and we'll get back to you. The more detail you give, the faster we can help.
            </p>

            {user && (
              <div className="mt-6 rounded-2xl border border-indigo-200 bg-indigo-50 p-5 dark:border-indigo-500/30 dark:bg-indigo-500/10">
                <p className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">
                  Signed in as {user.name}
                </p>
                <div className="mt-3 space-y-2 text-xs text-indigo-600/80 dark:text-indigo-300/70">
                  <p className="flex items-center gap-2">
                    <span className="font-mono">{user.id.slice(0, 8)}…</span>
                    <span className="text-indigo-400 dark:text-indigo-400/60">(account ID)</span>
                  </p>
                  <p>Account status: {accountStatus}</p>
                </div>
              </div>
            )}

            {!user && (
              <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Not signed in? That's fine — you can still message us. Just let us know if you have a PASSCO
                  account so we can look things up faster.
                </p>
              </div>
            )}

            <div className="mt-6 space-y-4">
              {[
                { Icon: MessageCircle, text: 'WhatsApp us at +233 20 743 5678 for a faster reply.', href: 'https://wa.me/233207435678' },
                { Icon: Phone, text: 'Prefer email? Write to support@passco.app anytime.', href: 'mailto:support@passco.app' },
                { Icon: MapPin, text: 'PASSCO is a fully digital platform built in Ghana. No physical office — but we\'re never far away.' },
              ].map(({ Icon, text, href }) => (
                <div key={text} className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-500/10">
                    <Icon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  {href ? (
                    <a href={href} target={href.startsWith('http') ? '_blank' : undefined} rel={href.startsWith('http') ? 'noopener noreferrer' : undefined} className="pt-1.5 text-sm text-slate-500 transition hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400">
                      {text}
                    </a>
                  ) : (
                    <p className="pt-1.5 text-sm text-slate-500 dark:text-slate-400">{text}</p>
                  )}
                </div>
              ))}
            </div>
          </motion.div>

          <motion.form
            onSubmit={handleSubmit}
            variants={slideUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            custom={1}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 lg:col-span-3 dark:border-slate-800 dark:bg-slate-900"
          >
            <AnimatePresence>
              {success && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mb-6 flex items-center gap-2 rounded-xl bg-emerald-50 p-4 text-sm font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                >
                  <CheckCircle className="h-5 w-5 shrink-0" />
                  Message sent! Our team will get back to you soon.
                </motion.div>
              )}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mb-6 flex items-center gap-2 rounded-xl bg-rose-50 p-4 text-sm font-medium text-rose-700 dark:bg-rose-500/10 dark:text-rose-400"
                >
                  <AlertCircle className="h-5 w-5 shrink-0" />
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Full Name *</label>
                <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="Your name" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Email Address *</label>
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} placeholder="you@example.com" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Account Type</label>
                <select value={accountType} onChange={(e) => setAccountType(e.target.value)} className={inputCls}>
                  <option value="">Not sure / Guest</option>
                  <option value="student">Student</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Subject *</label>
                <select required value={subject} onChange={(e) => setSubject(e.target.value)} className={inputCls}>
                  <option value="" disabled>Choose a subject...</option>
                  {SUBJECTS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            {subject === 'Report a Question' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-5 overflow-hidden rounded-xl bg-amber-50 p-4 text-sm text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
              >
                <p className="flex items-start gap-2">
                  <HelpCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  The fastest way to report a question is while you're taking an assessment — tap the "⋯ Report"
                  button next to the question. You can also tell us about it here and include the question text.
                </p>
              </motion.div>
            )}

            <div className="mt-5">
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Message *</label>
              <textarea
                required
                rows={6}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className={`${inputCls} resize-none`}
                placeholder="Tell us more about your inquiry..."
              />
            </div>

            <div className="mt-5">
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Attachment (optional)</label>
              <input ref={fileInputRef} type="file" accept="image/*,.pdf,.doc,.docx,.txt" onChange={(e) => onFileSelected(e.target.files?.[0])} className="hidden" />
              {attachment ? (
                <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-500/10">
                      {attachment.data.startsWith('data:image') ? <Image className="h-4 w-4 text-indigo-600 dark:text-indigo-400" /> : <FileText className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">{attachment.name}</p>
                      <p className="text-xs text-slate-400">{(attachment.size / 1024).toFixed(1)} KB</p>
                    </div>
                  </div>
                  <button type="button" onClick={() => { setAttachment(null); if (fileInputRef.current) fileInputRef.current.value = ''; }} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-200 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-300" aria-label="Remove attachment">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 px-4 py-3.5 text-sm font-medium text-slate-500 transition hover:border-indigo-400 hover:text-indigo-600 dark:border-slate-700 dark:text-slate-400 dark:hover:border-indigo-500 dark:hover:text-indigo-400"
                >
                  <Paperclip className="h-4 w-4" /> Attach a file (images, PDFs, docs — up to 2 MB)
                </button>
              )}
              <p className="mt-1.5 flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
                <Lock className="h-3 w-3" /> Attachments are only used to investigate your enquiry.
              </p>
            </div>

            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:from-indigo-600 hover:to-indigo-700 disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {loading ? 'Sending...' : 'Send Message'}
            </motion.button>
          </motion.form>
        </div>
      </div>
    </section>
  );
}

function ContactFAQ() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section className="border-y border-slate-200 bg-slate-50 py-20 dark:border-slate-800 dark:bg-slate-950">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center">
          <motion.p variants={fadeUp} className="text-sm font-semibold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">Quick Answers</motion.p>
          <motion.h2 variants={fadeUp} className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">Before You Write In</motion.h2>
        </motion.div>

        <div className="mt-10 space-y-3">
          {faqs.map((faq, i) => {
            const isOpen = open === i;
            return (
              <div key={faq.question} className="overflow-hidden rounded-2xl border border-slate-200 bg-white transition-colors dark:border-slate-800 dark:bg-slate-900">
                <button onClick={() => setOpen(isOpen ? null : i)} className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left">
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">{faq.question}</span>
                  <ChevronDown className={`h-5 w-5 shrink-0 text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180 text-indigo-500' : ''}`} />
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }}>
                      <p className="px-5 pb-5 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{faq.answer}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        <div className="mt-8 text-center">
          <Link to="/faq" className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 transition hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300">
            Browse the full FAQ page →
          </Link>
        </div>
      </div>
    </section>
  );
}

function SupportStatus() {
  const [status] = useState('available');
  const dot = status === 'available' ? 'bg-emerald-500' : 'bg-amber-500';
  return (
    <section className="py-20">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <motion.div
          variants={slideUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="flex items-center justify-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${dot} opacity-60`} />
              <span className={`relative inline-flex h-3 w-3 rounded-full ${dot}`} />
            </span>
            <p className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Support Available</p>
          </div>
          <h2 className="mt-4 text-2xl font-bold text-slate-900 sm:text-3xl dark:text-white">We typically respond within 24 hours</h2>
          <p className="mx-auto mt-3 max-w-xl text-slate-500 dark:text-slate-400">
            Messages are answered Monday to Saturday. For exam-day issues, reach us on WhatsApp for the fastest
            response.
          </p>
        </motion.div>
      </div>
    </section>
  );
}

function Connect() {
  return (
    <section className="border-t border-slate-200 py-20 dark:border-slate-800">
      <div className="mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
        <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }}>
          <motion.p variants={fadeUp} className="text-sm font-semibold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">Connect</motion.p>
          <motion.h2 variants={fadeUp} className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">Follow PASSCO</motion.h2>
          <motion.p variants={fadeUp} className="mx-auto mt-3 max-w-xl text-slate-500 dark:text-slate-400">
            Our social channels are on the way. Until then, the best ways to reach us are email and WhatsApp.
          </motion.p>
        </motion.div>

        <motion.div
          variants={slideUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="mx-auto mt-8 flex flex-wrap items-center justify-center gap-3"
        >
          {socials.map(({ label, Icon }) => (
            <span
              key={label}
              title="Coming soon"
              className="flex cursor-not-allowed items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-400 opacity-60 transition dark:border-slate-700 dark:bg-slate-900 dark:text-slate-500"
            >
              <Icon className="h-4 w-4" /> {label}
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-300 dark:text-slate-600">soon</span>
            </span>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

export default function Contact() {
  return (
    <div>
      <ContactHero />
      <InfoCards />
      <ContactForm />
      <ContactFAQ />
      <SupportStatus />
      <Connect />
    </div>
  );
}