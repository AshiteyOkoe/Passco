import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { BookOpen, User, Mail, Lock, Building2, GraduationCap, UserPlus, Eye, EyeOff, Check, Calendar } from 'lucide-react';
import { HeroStudents } from '../components/icons/Illustrations';
import { slideUp, stagger, fadeUp } from '../utils/animations';

export default function Register() {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [institution, setInstitution] = useState('');
  const [gradeLevel, setGradeLevel] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register({ name, email, password, institution, gradeLevel, dateOfBirth });
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response: { data: { message: string } } }).response?.data?.message
        : 'Registration failed';
      setError(msg || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      <motion.div
        className="hidden flex-1 items-center justify-center bg-gradient-to-br from-indigo-500 to-indigo-700 p-12 lg:flex"
        initial={{ opacity: 0, x: -60 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        <motion.div
          className="text-center"
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <HeroStudents size="lg" className="mx-auto mb-8 [&>*]:!fill-white/20 [&>*]:!stroke-white/30" />
          <h2 className="text-2xl font-bold text-white">Start Your Learning Journey</h2>
          <p className="mt-2 text-indigo-200">Create an account to access AI-powered quizzes and track your progress.</p>
          <motion.div
            className="mt-6 flex flex-col items-center gap-3"
            variants={stagger}
            initial="hidden"
            animate="visible"
          >
            {['Take JHS assessments', 'Track your progress', 'Earn achievement badges'].map((feature) => (
              <motion.div key={feature} variants={fadeUp} className="flex items-center gap-2 text-indigo-200">
                <Check className="h-4 w-4 text-emerald-300 shrink-0" />
                <span className="text-sm">{feature}</span>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </motion.div>

      <motion.div
        className="flex flex-1 items-center justify-center bg-gradient-to-br from-slate-50 to-indigo-50 px-4 py-8 dark:from-slate-950 dark:to-slate-900"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        <motion.div
          className="w-full max-w-md"
          variants={slideUp}
          initial="hidden"
          animate="visible"
        >
          <motion.div className="mb-8 text-center" variants={fadeUp}>
            <motion.div
              className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-lg shadow-indigo-500/25"
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 200 }}
            >
              <BookOpen className="h-7 w-7 text-white" />
            </motion.div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Create account</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Join Passco and start learning</p>
          </motion.div>

          <motion.form
            onSubmit={handleSubmit}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
            variants={stagger}
            initial="hidden"
            animate="visible"
          >
            {error && (
              <motion.div
                initial={{ opacity: 0, x: -20, height: 0 }}
                animate={{ opacity: 1, x: 0, height: 'auto' }}
                className="mb-4 flex items-center gap-2 rounded-lg bg-rose-50 p-3 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-400"
              >
                <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" /></svg>
                <span>{error}</span>
              </motion.div>
            )}

            <motion.div className="mb-4" variants={slideUp} custom={0}>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} required
                  className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                  placeholder="John Doe" />
              </div>
            </motion.div>

            <motion.div className="mb-4" variants={slideUp} custom={1}>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                  className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                  placeholder="student@example.com" />
              </div>
            </motion.div>

            <motion.div className="mb-4" variants={slideUp} custom={2}>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6}
                  className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-10 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                  placeholder="At least 6 characters" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300" aria-label={showPassword ? 'Hide password' : 'Show password'}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </motion.div>

            <motion.div className="mb-4" variants={slideUp} custom={3}>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Institution</label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input type="text" value={institution} onChange={(e) => setInstitution(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                  placeholder="Your school or university" />
              </div>
            </motion.div>

            <motion.div className="mb-4" variants={slideUp} custom={4}>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Date of Birth *</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} required
                  className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white" />
              </div>
            </motion.div>

            <motion.div className="mb-6" variants={slideUp} custom={5}>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Grade Level</label>
              <div className="relative">
                <GraduationCap className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <select value={gradeLevel} onChange={(e) => setGradeLevel(e.target.value)}
                  className="w-full appearance-none rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white">
                  <option value="">Select grade level</option>
                  <option value="Primary">Primary School</option>
                  <option value="JHS">Junior High School</option>
                  <option value="SHS">Senior High School</option>
                  <option value="Undergraduate">Undergraduate</option>
                  <option value="Graduate">Graduate</option>
                </select>
              </div>
            </motion.div>

            <motion.button
              type="submit"
              disabled={loading}
              variants={fadeUp}
              custom={5}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:from-indigo-600 hover:to-indigo-700 disabled:opacity-50"
            >
              <UserPlus className="h-4 w-4" />
              {loading ? 'Creating account...' : 'Create Account'}
            </motion.button>

            <motion.p className="mt-4 text-center text-sm text-slate-500 dark:text-slate-400" variants={fadeUp} custom={6}>
              Already have an account?{' '}
              <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400">Sign in</Link>
            </motion.p>
          </motion.form>
        </motion.div>
      </motion.div>
    </div>
  );
}
