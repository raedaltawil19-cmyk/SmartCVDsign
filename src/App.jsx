import { useEffect } from 'react';
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider } from '@/lib/AuthContext';
import Home from '@/pages/Home';
import Builder from '@/pages/Builder';
import MyApplications from '@/pages/MyApplications';
import CareerDashboard from '@/pages/CareerDashboard';
import AgentChat from '@/pages/AgentChat';
import ApplicationTailor from '@/pages/ApplicationTailor';
import TemplateAdvisor from '@/pages/TemplateAdvisor';
import ProtectedRoute from '@/components/ProtectedRoute';
import ScrollToTop from './components/ScrollToTop';
import ServicesProvider from '@/providers/ServicesProvider';
import { LanguageProvider } from '@/lib/i18n';
import CornerControls from '@/components/CornerControls';
import { base44 } from '@/api/base44Client';
// Add page imports here

const LoginRedirect = () => {
  useEffect(() => { base44.auth.redirectToLogin('/applications'); }, []);
  return (
    <div className="fixed inset-0 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
    </div>
  );
};

const AuthenticatedApp = () => {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/builder" element={<Builder />} />
      <Route path="/builder/:cvId" element={<Builder />} />
      <Route element={<ProtectedRoute unauthenticatedElement={<LoginRedirect />} />}>
        <Route path="/applications" element={<MyApplications />} />
        <Route path="/dashboard" element={<CareerDashboard />} />
        <Route path="/agent" element={<AgentChat />} />
        <Route path="/tailor/:cvId" element={<ApplicationTailor />} />
        <Route path="/tailor" element={<ApplicationTailor />} />
        <Route path="/template-advisor/:cvId" element={<TemplateAdvisor />} />
        <Route path="/template-advisor" element={<TemplateAdvisor />} />
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
          <ScrollToTop />
          <LanguageProvider>
            <ServicesProvider>
              <AuthenticatedApp />
            </ServicesProvider>
            <CornerControls />
          </LanguageProvider>
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App