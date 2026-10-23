import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../modules/auth/AuthContext';

export const ProtectedRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="loading">Checking session…</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};
