import React from 'react';
import { useProfile } from '../modules/profile/hooks';
import { useAuth } from '../modules/auth/AuthContext';

const AppHomePage: React.FC = () => {
  const { user } = useAuth();
  const { profile, loading } = useProfile();

  return (
    <div className="card">
      <h1 className="page-title">OnRoute</h1>
      <p className="page-intro">
        OnRoute is a student-first shuttle companion for NED. It focuses on real student
        reports and clear confidence labels, not fake GPS or guaranteed ETAs.
      </p>
      {user && (
        <p className="helper" style={{ marginBottom: '0.75rem' }}>
          Signed in as <strong>{user.email}</strong>
        </p>
      )}
      {loading && <div className="helper">Checking your profile…</div>}
      {profile && !loading && (
        <p className="helper">
          Your usual pickup: <strong>Point {profile.point_id}</strong> (internal ID) – this will
          later show the real point number and schedule.
        </p>
      )}
      {!loading && !profile && (
        <p className="helper">
          You have not finished onboarding yet. Use the Profile or Onboarding page to set your
          usual point and stop.
        </p>
      )}
      <div className="card" style={{ marginTop: '1rem' }}>
        <h2 className="label" style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>
          Shuttle status (Phase 0 placeholder)
        </h2>
        <p className="helper">
          Live reports, ETAs, and confidence labels will appear here in later phases. For now,
          this is an empty state showing that your account and profile wiring are working.
        </p>
      </div>
    </div>
  );
};

export default AppHomePage;
