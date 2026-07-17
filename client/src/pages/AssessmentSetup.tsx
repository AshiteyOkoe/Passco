import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, GraduationCap, Trophy, Brain, Zap, Target, Shield, ChevronRight, ChevronLeft, Clock, CheckCircle2, ArrowLeft, Sparkles } from 'lucide-react';
import { CLASS_META, DIFFICULTY_META, ASSESSMENT_META, SUBJECT_META, getSubjectQuestionCount, type SubjectId, type JHSCategory, type DifficultyLevel, type AssessmentType } from '../data/questionBank';

const classIcons: Record<JHSCategory, React.ReactNode> = {
  jhs1: <BookOpen className="h-8 w-8" />,
  jhs2: <GraduationCap className="h-8 w-8" />,
  jhs3: <Trophy className="h-8 w-8" />,
};

const classDescriptions: Record<JHSCategory, string> = {
  jhs1: 'Build a strong foundation in core subjects and develop essential study skills.',
  jhs2: 'Strengthen your knowledge and tackle more advanced concepts with confidence.',
  jhs3: 'Master challenging topics and prepare thoroughly for your final examinations.',
};

const difficultyIcons: Record<DifficultyLevel, React.ReactNode> = {
  beginner: <Brain className="h-8 w-8" />,
  intermediate: <Zap className="h-8 w-8" />,
  expert: <Target className="h-8 w-8" />,
};

const difficultyColors: Record<DifficultyLevel, { border: string; bg: string; text: string; ring: string; iconBg: string }> = {
  beginner: { border: 'border-emerald-400 dark:border-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/40', text: 'text-emerald-700 dark:text-emerald-300', ring: 'ring-emerald-400 dark:ring-emerald-500', iconBg: 'bg-emerald-100 dark:bg-emerald-900/60' },
  intermediate: { border: 'border-amber-400 dark:border-amber-500', bg: 'bg-amber-50 dark:bg-amber-950/40', text: 'text-amber-700 dark:text-amber-300', ring: 'ring-amber-400 dark:ring-amber-500', iconBg: 'bg-amber-100 dark:bg-amber-900/60' },
  expert: { border: 'border-rose-400 dark:border-rose-500', bg: 'bg-rose-50 dark:bg-rose-950/40', text: 'text-rose-700 dark:text-rose-300', ring: 'ring-rose-400 dark:ring-rose-500', iconBg: 'bg-rose-100 dark:bg-rose-900/60' },
};

const difficultyComplexity: Record<DifficultyLevel, number> = { beginner: 1, intermediate: 2, expert: 3 };

const assessmentIcons: Record<AssessmentType, React.ReactNode> = {
  quiz: <Sparkles className="h-8 w-8" />,
  mock: <Shield className="h-8 w-8" />,
  examination: <Trophy className="h-8 w-8" />,
};

const subjectColorMap: Record<string, { border: string; bg: string; text: string; ring: string; iconBg: string }> = {
  blue: { border: 'border-blue-400 dark:border-blue-500', bg: 'bg-blue-50 dark:bg-blue-950/40', text: 'text-blue-700 dark:text-blue-300', ring: 'ring-blue-400 dark:ring-blue-500', iconBg: 'bg-blue-100 dark:bg-blue-900/60' },
  emerald: { border: 'border-emerald-400 dark:border-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/40', text: 'text-emerald-700 dark:text-emerald-300', ring: 'ring-emerald-400 dark:ring-emerald-500', iconBg: 'bg-emerald-100 dark:bg-emerald-900/60' },
  amber: { border: 'border-amber-400 dark:border-amber-500', bg: 'bg-amber-50 dark:bg-amber-950/40', text: 'text-amber-700 dark:text-amber-300', ring: 'ring-amber-400 dark:ring-amber-500', iconBg: 'bg-amber-100 dark:bg-amber-900/60' },
  violet: { border: 'border-violet-400 dark:border-violet-500', bg: 'bg-violet-50 dark:bg-violet-950/40', text: 'text-violet-700 dark:text-violet-300', ring: 'ring-violet-400 dark:ring-violet-500', iconBg: 'bg-violet-100 dark:bg-violet-900/60' },
  cyan: { border: 'border-cyan-400 dark:border-cyan-500', bg: 'bg-cyan-50 dark:bg-cyan-950/40', text: 'text-cyan-700 dark:text-cyan-300', ring: 'ring-cyan-400 dark:ring-cyan-500', iconBg: 'bg-cyan-100 dark:bg-cyan-900/60' },
  purple: { border: 'border-purple-400 dark:border-purple-500', bg: 'bg-purple-50 dark:bg-purple-950/40', text: 'text-purple-700 dark:text-purple-300', ring: 'ring-purple-400 dark:ring-purple-500', iconBg: 'bg-purple-100 dark:bg-purple-900/60' },
  pink: { border: 'border-pink-400 dark:border-pink-500', bg: 'bg-pink-50 dark:bg-pink-950/40', text: 'text-pink-700 dark:text-pink-300', ring: 'ring-pink-400 dark:ring-pink-500', iconBg: 'bg-pink-100 dark:bg-pink-900/60' },
  orange: { border: 'border-orange-400 dark:border-orange-500', bg: 'bg-orange-50 dark:bg-orange-950/40', text: 'text-orange-700 dark:text-orange-300', ring: 'ring-orange-400 dark:ring-orange-500', iconBg: 'bg-orange-100 dark:bg-orange-900/60' },
  rose: { border: 'border-rose-400 dark:border-rose-500', bg: 'bg-rose-50 dark:bg-rose-950/40', text: 'text-rose-700 dark:text-rose-300', ring: 'ring-rose-400 dark:ring-rose-500', iconBg: 'bg-rose-100 dark:bg-rose-900/60' },
  teal: { border: 'border-teal-400 dark:border-teal-500', bg: 'bg-teal-50 dark:bg-teal-950/40', text: 'text-teal-700 dark:text-teal-300', ring: 'ring-teal-400 dark:ring-teal-500', iconBg: 'bg-teal-100 dark:bg-teal-900/60' },
};

const steps = [{ label: 'Class', step: 1 }, { label: 'Subject', step: 2 }, { label: 'Difficulty', step: 3 }, { label: 'Assessment', step: 4 }];

const slideVariants = {
  enter: (direction: number) => ({ x: direction > 0 ? 300 : -300, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({ x: direction < 0 ? 300 : -300, opacity: 0 }),
};

export default function AssessmentSetup() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [classLevel, setClassLevel] = useState<JHSCategory | null>(null);
  const [subject, setSubject] = useState<SubjectId | null>(null);
  const [difficulty, setDifficulty] = useState<DifficultyLevel | null>(null);
  const [assessmentType, setAssessmentType] = useState<AssessmentType | null>(null);

  const handleNext = () => { if (currentStep < 4) { setDirection(1); setCurrentStep(p => p + 1); } };
  const handleBack = () => { if (currentStep > 1) { setDirection(-1); setCurrentStep(p => p - 1); } };
  const handleStart = () => {
    if (classLevel && subject && difficulty && assessmentType) {
      navigate('/assessment/take', { state: { classLevel, subject, difficulty, assessmentType } });
    }
  };
  const canProceed = () => {
    if (currentStep === 1) return classLevel !== null;
    if (currentStep === 2) return subject !== null;
    if (currentStep === 3) return difficulty !== null;
    return assessmentType !== null;
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 dark:from-indigo-800 dark:via-indigo-900 dark:to-purple-950">
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
          <button onClick={() => navigate(-1)} className="mb-6 flex items-center gap-2 text-indigo-200 transition-colors hover:text-white">
            <ArrowLeft className="h-5 w-5" />
            <span className="text-sm font-medium">Back to Dashboard</span>
          </button>
          <h1 className="mb-2 text-3xl font-bold text-white sm:text-4xl">Set Up Your Assessment</h1>
          <p className="text-lg text-indigo-200">Choose your class, subject, difficulty, and assessment type to get started.</p>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <div className="mb-8">
          <div className="mb-3 flex items-center justify-between">
            {steps.map(s => (
              <div key={s.step} className="flex items-center gap-2">
                <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition-all duration-300 ${currentStep >= s.step ? 'bg-indigo-600 text-white dark:bg-indigo-500' : 'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400'}`}>
                  {currentStep > s.step ? <CheckCircle2 className="h-5 w-5" /> : s.step}
                </div>
                <span className={`hidden text-sm font-medium sm:block ${currentStep >= s.step ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500'}`}>{s.label}</span>
              </div>
            ))}
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
            <motion.div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500" initial={{ width: '0%' }} animate={{ width: `${(currentStep / 4) * 100}%` }} transition={{ type: 'spring', stiffness: 100, damping: 20 }} />
          </div>
          <p className="mt-2 text-right text-sm text-slate-500 dark:text-slate-400">Step {currentStep} of 4</p>
        </div>

        <div className="relative min-h-[320px] overflow-hidden">
          <AnimatePresence mode="wait" custom={direction}>
            {currentStep === 1 && (
              <motion.div key="step1" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ type: 'spring', stiffness: 300, damping: 30 }} className="grid grid-cols-1 gap-6 md:grid-cols-3">
                {(Object.keys(CLASS_META) as JHSCategory[]).map(cls => {
                  const meta = CLASS_META[cls];
                  const isSelected = classLevel === cls;
                  return (
                    <motion.button key={cls} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => setClassLevel(cls)} className={`relative cursor-pointer rounded-2xl border-2 p-6 text-left transition-all duration-200 ${isSelected ? 'border-indigo-500 bg-indigo-50 shadow-lg shadow-indigo-200 ring-2 ring-indigo-400/50 dark:border-indigo-400 dark:bg-indigo-950/50 dark:shadow-indigo-900/40' : 'border-slate-200 bg-white shadow-sm hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600'}`}>
                      {isSelected && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute right-3 top-3"><CheckCircle2 className="h-6 w-6 text-indigo-500 dark:text-indigo-400" /></motion.div>}
                      <div className={`mb-4 flex h-14 w-14 items-center justify-center rounded-xl ${isSelected ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/60 dark:text-indigo-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}>{classIcons[cls]}</div>
                      <h3 className="mb-1 text-xl font-bold text-slate-900 dark:text-white">{meta.label}</h3>
                      <p className="mb-2 text-sm font-medium text-indigo-600 dark:text-indigo-400">{meta.icon}</p>
                      <p className="text-sm leading-relaxed text-slate-500 dark:text-slate-400">{classDescriptions[cls]}</p>
                    </motion.button>
                  );
                })}
              </motion.div>
            )}

            {currentStep === 2 && (
              <motion.div key="step2" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ type: 'spring', stiffness: 300, damping: 30 }} className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
                {(Object.keys(SUBJECT_META) as SubjectId[]).map(subId => {
                  const meta = SUBJECT_META[subId];
                  const colors = subjectColorMap[meta.color] || subjectColorMap.blue;
                  const isSelected = subject === subId;
                  const questionCount = classLevel ? getSubjectQuestionCount(classLevel, meta.label) : 0;
                  return (
                    <motion.button key={subId} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => setSubject(subId)} className={`relative cursor-pointer rounded-2xl border-2 p-5 text-left transition-all duration-200 ${isSelected ? `${colors.border} ${colors.bg} ring-2 ${colors.ring}/50 shadow-lg` : 'border-slate-200 bg-white shadow-sm hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600'}`}>
                      {isSelected && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute right-3 top-3"><CheckCircle2 className={`h-5 w-5 ${colors.text}`} /></motion.div>}
                      <div className={`mb-3 flex h-12 w-12 items-center justify-center rounded-xl text-2xl ${isSelected ? `${colors.iconBg}` : 'bg-slate-100 dark:bg-slate-700'}`}>{meta.icon}</div>
                      <h3 className="mb-1 text-sm font-bold text-slate-900 dark:text-white">{meta.label}</h3>
                      <p className="mb-2 text-xs font-semibold text-slate-400 dark:text-slate-500">{questionCount} questions</p>
                      <p className={`text-xs font-medium ${isSelected ? colors.text : 'text-indigo-500 dark:text-indigo-400'}`}>Take Assessment</p>
                    </motion.button>
                  );
                })}
              </motion.div>
            )}

            {currentStep === 3 && (
              <motion.div key="step3" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ type: 'spring', stiffness: 300, damping: 30 }} className="grid grid-cols-1 gap-6 md:grid-cols-3">
                {(Object.keys(DIFFICULTY_META) as DifficultyLevel[]).map(level => {
                  const meta = DIFFICULTY_META[level];
                  const colors = difficultyColors[level];
                  const isSelected = difficulty === level;
                  return (
                    <motion.button key={level} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => setDifficulty(level)} className={`relative cursor-pointer rounded-2xl border-2 p-6 text-left transition-all duration-200 ${isSelected ? `${colors.border} ${colors.bg} ring-2 ${colors.ring}/50 shadow-lg` : 'border-slate-200 bg-white shadow-sm hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600'}`}>
                      {isSelected && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute right-3 top-3"><CheckCircle2 className={`h-6 w-6 ${colors.text}`} /></motion.div>}
                      <div className={`mb-4 flex h-14 w-14 items-center justify-center rounded-xl ${isSelected ? `${colors.iconBg} ${colors.text}` : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}>{difficultyIcons[level]}</div>
                      <h3 className="mb-1 text-xl font-bold text-slate-900 dark:text-white">{meta.label}</h3>
                      <p className={`mb-3 text-sm font-medium ${isSelected ? colors.text : 'text-slate-500 dark:text-slate-400'}`}>{meta.description}</p>
                      <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
                        <span>Complexity:</span>
                        <div className="flex gap-1">
                          {[1, 2, 3].map(i => (
                            <div key={i} className={`h-1.5 w-6 rounded-full ${i <= difficultyComplexity[level] ? 'bg-indigo-400 dark:bg-indigo-500' : 'bg-slate-200 dark:bg-slate-700'}`} />
                          ))}
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </motion.div>
            )}

            {currentStep === 4 && (
              <motion.div key="step4" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ type: 'spring', stiffness: 300, damping: 30 }} className="grid grid-cols-1 gap-6 md:grid-cols-3">
                {(Object.keys(ASSESSMENT_META) as AssessmentType[]).map(type => {
                  const meta = ASSESSMENT_META[type];
                  const isSelected = assessmentType === type;
                  return (
                    <motion.button key={type} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => setAssessmentType(type)} className={`relative cursor-pointer rounded-2xl border-2 p-6 text-left transition-all duration-200 ${isSelected ? 'border-indigo-500 bg-indigo-50 shadow-lg shadow-indigo-200 ring-2 ring-indigo-400/50 dark:border-indigo-400 dark:bg-indigo-950/50 dark:shadow-indigo-900/40' : 'border-slate-200 bg-white shadow-sm hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600'}`}>
                      {isSelected && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute right-3 top-3"><CheckCircle2 className="h-6 w-6 text-indigo-500 dark:text-indigo-400" /></motion.div>}
                      <div className={`mb-4 flex h-14 w-14 items-center justify-center rounded-xl ${isSelected ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/60 dark:text-indigo-300' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}>{assessmentIcons[type]}</div>
                      <h3 className="mb-1 text-xl font-bold text-slate-900 dark:text-white">{meta.label}</h3>
                      <p className="mb-3 text-sm font-medium text-indigo-600 dark:text-indigo-400">{meta.icon}</p>
                      <div className="mb-3 flex items-center gap-4 text-sm text-slate-600 dark:text-slate-300">
                        <span className="flex items-center gap-1"><BookOpen className="h-4 w-4" />{meta.questionCount} Qs</span>
                        <span className="flex items-center gap-1"><Clock className="h-4 w-4" />{meta.timeLimit / 60} min</span>
                      </div>
                      <p className="text-sm leading-relaxed text-slate-500 dark:text-slate-400">{meta.description}</p>
                    </motion.button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="mt-10 flex items-center justify-between border-t border-slate-200 pt-6 dark:border-slate-800">
          <button onClick={handleBack} disabled={currentStep === 1} className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all duration-200 ${currentStep === 1 ? 'pointer-events-none opacity-0' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'}`}>
            <ChevronLeft className="h-4 w-4" />Back
          </button>
          {currentStep < 4 ? (
            <motion.button whileHover={{ scale: canProceed() ? 1.03 : 1 }} whileTap={{ scale: canProceed() ? 0.97 : 1 }} onClick={handleNext} disabled={!canProceed()} className={`flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold transition-all duration-200 ${canProceed() ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700 dark:bg-indigo-500 dark:shadow-indigo-900/40 dark:hover:bg-indigo-600' : 'cursor-not-allowed bg-slate-200 text-slate-400 dark:bg-slate-800 dark:text-slate-600'}`}>
              Continue<ChevronRight className="h-4 w-4" />
            </motion.button>
          ) : (
            <motion.button whileHover={{ scale: canProceed() ? 1.03 : 1 }} whileTap={{ scale: canProceed() ? 0.97 : 1 }} onClick={handleStart} disabled={!canProceed()} className={`flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold transition-all duration-200 ${canProceed() ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-200 hover:from-indigo-700 hover:to-purple-700 dark:shadow-indigo-900/40' : 'cursor-not-allowed bg-slate-200 text-slate-400 dark:bg-slate-800 dark:text-slate-600'}`}>
              <Sparkles className="h-4 w-4" />Start Assessment
            </motion.button>
          )}
        </div>
      </div>
    </div>
  );
}
