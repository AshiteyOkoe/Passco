import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import PublicLayout from './components/PublicLayout';
import AuthModal from './components/AuthModal';
import Landing from './pages/Landing';
import Features from './pages/Features';
import HowItWorks from './pages/HowItWorks';
import About from './pages/About';
import Contact from './pages/Contact';
import StudentDashboard from './pages/StudentDashboard';
import UploadFile from './pages/UploadFile';
import TakeQuiz from './pages/TakeQuiz';
import QuizResults from './pages/QuizResults';
import StudentAnalytics from './pages/StudentAnalytics';
import StudentPerformanceAnalytics from './pages/StudentPerformanceAnalytics';
import StudentAchievements from './pages/StudentAchievements';
import AssessmentSetup from './pages/AssessmentSetup';
import TakeAssessment from './pages/TakeAssessment';
import AssessmentResult from './pages/AssessmentResult';
import AssessmentHistory from './pages/AssessmentHistory';
import AdminDashboard from './pages/AdminDashboard';
import AdminFiles from './pages/AdminFiles';
import AdminQuestionBank from './pages/AdminQuestionBank';
import AdminCreateQuiz from './pages/AdminCreateQuiz';
import AdminAnalytics from './pages/AdminAnalytics';
import AdminClasses from './pages/AdminClasses';
import AdminSubjects from './pages/AdminSubjects';
import AdminJHSQuestions from './pages/AdminJHSQuestions';
import AdminStudentPerformance from './pages/AdminStudentPerformance';
import AdminBulkUpload from './pages/AdminBulkUpload';
import AdminCertificates from './pages/AdminCertificates';
import Profile from './pages/Profile';
import { useState, useCallback, useEffect } from 'react';

function ProtectedRoute({ children, role }: { children: React.ReactNode; role?: string }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  if (!user) return <Navigate to="/?auth=login" replace />;
  if (role && user.role !== role) return <Navigate to="/dashboard" replace />;

  return <>{children}</>;
}

export default function App() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [authModal, setAuthModal] = useState<{ open: boolean; tab: 'login' | 'register' }>({ open: false, tab: 'login' });

  // Check URL params for auth trigger
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const auth = params.get('auth');
    const register = params.get('register');
    if (auth === 'login') {
      setAuthModal({ open: true, tab: 'login' });
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    } else if (register || auth === 'register') {
      setAuthModal({ open: true, tab: 'register' });
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const requireAuth = useCallback((tab: 'login' | 'register' = 'login') => {
    if (!user) {
      setAuthModal({ open: true, tab });
      return false;
    }
    return true;
  }, [user]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <>
      <Routes>
        {/* Public routes */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Landing />} />
          <Route path="/features" element={<Features />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
        </Route>

        {/* Legacy direct login/register pages redirect to home */}
        <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Navigate to="/?auth=login" replace />} />
        <Route path="/register" element={user ? <Navigate to="/dashboard" replace /> : <Navigate to="/?auth=register" replace />} />

        {/* Protected student routes */}
        <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route path="/dashboard" element={<StudentDashboard />} />
          <Route path="/upload" element={<UploadFile />} />
          <Route path="/quiz/:id" element={<TakeQuiz />} />
          <Route path="/quiz/:id/results" element={<QuizResults />} />
          <Route path="/analytics" element={<StudentAnalytics />} />
          <Route path="/analytics/performance" element={<StudentPerformanceAnalytics />} />
          <Route path="/achievements" element={<StudentAchievements />} />
          <Route path="/assessment/setup" element={<AssessmentSetup />} />
          <Route path="/assessment/take" element={<TakeAssessment />} />
          <Route path="/assessment/result" element={<AssessmentResult />} />
          <Route path="/assessment/history" element={<AssessmentHistory />} />
          <Route path="/profile" element={<Profile />} />
        </Route>

        {/* Protected admin routes */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute role="admin">
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="classes" element={<AdminClasses />} />
          <Route path="subjects" element={<AdminSubjects />} />
          <Route path="jhs-questions" element={<AdminJHSQuestions />} />
          <Route path="student-performance" element={<AdminStudentPerformance />} />
          <Route path="bulk-upload" element={<AdminBulkUpload />} />
          <Route path="files" element={<AdminFiles />} />
          <Route path="questions" element={<AdminQuestionBank />} />
          <Route path="create-quiz" element={<AdminCreateQuiz />} />
          <Route path="analytics" element={<AdminAnalytics />} />
          <Route path="certificates" element={<AdminCertificates />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <AuthModal
        isOpen={authModal.open}
        initialTab={authModal.tab}
        onClose={() => setAuthModal({ open: false, tab: 'login' })}
      />
    </>
  );
}
