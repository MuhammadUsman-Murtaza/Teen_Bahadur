import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import SignUpPage from './pages/SignUpPage';
import LoginPage from './pages/LoginPage';
import OnboardingPage from './pages/OnboardingPage';
import ProfilePage from './pages/ProfilePage';
import AppHomePage from './pages/AppHomePage';
import { useAuth } from './modules/auth/AuthContext';
import { useProfile } from './modules/profile/hooks';

const App: React.FC = () => {
  const { user, loading } = useAuth();
  const { profile, loading: profileLoading } = useProfile();

  if (loading || (user && profileLoading)) {
    return (
      <Layout>
        <div className="loading">Loading OnRoute…</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Routes>
        <Route
          path="/"
          element={
            user ? (
              profile ? <Navigate to="/app" replace /> : <Navigate to="/onboarding" replace />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/onboarding"
          element={
            <ProtectedRoute>
              <OnboardingPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/app"
          element={
            <ProtectedRoute>
              <AppHomePage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
};

export default App;
