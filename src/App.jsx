import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import LogActivity from './pages/LogActivity';
import Projects from './pages/Projects';
import WeeklyReview from './pages/WeeklyReview';
import SettingsPage from './pages/SettingsPage';
import Lifts from './pages/Lifts';
import Nutrition from './pages/Nutrition';
import Finance from './pages/Finance';
import Mindfulness from './pages/Mindfulness';
import Onboarding from './pages/Onboarding';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfUse from './pages/TermsOfUse';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import ProtectedRoute from '@/components/ProtectedRoute';

// Routes that render without authentication — no redirect to login
const PUBLIC_ROUTES = ['/login', '/register', '/forgot-password', '/reset-password', '/privacy', '/terms'];

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, user } = useAuth();
  const location = useLocation();

  // Public routes render without auth — login, register, legal pages
  if (PUBLIC_ROUTES.includes(location.pathname)) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfUse />} />
      </Routes>
    );
  }

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[oklch(0.85_0.012_80)] border-t-[oklch(0.60_0.13_35)] rounded-full animate-spin"></div>
      </div>
    );
  }

  // Redirect new users to onboarding
  const needsOnboarding = user && !user.onboarding_completed;

  // Protected app routes — unauthenticated users land on /login
  return (
    <Routes>
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route element={<Layout />}>
          <Route path="/" element={needsOnboarding ? <Navigate to="/onboarding" replace /> : <Dashboard />} />
          <Route path="/log" element={<LogActivity />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/review" element={<WeeklyReview />} />
          <Route path="/lifts" element={<Lifts />} />
          <Route path="/nutrition" element={<Nutrition />} />
          <Route path="/finance" element={<Finance />} />
          <Route path="/mindfulness" element={<Mindfulness />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/onboarding" element={<Onboarding />} />
        </Route>
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App