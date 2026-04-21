import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
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

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin, user } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Redirect new users to onboarding
  const needsOnboarding = user && !user.onboarding_completed;

  // Render the main app
  return (
    <Routes>
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
        <Route path="*" element={<PageNotFound />} />
      </Route>
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