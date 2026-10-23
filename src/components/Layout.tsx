import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { getSupabaseClient } from '../lib/supabaseClient';
import { useAuth } from '../modules/auth/AuthContext';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    const supabase = getSupabaseClient();
    await supabase.auth.signOut();
    navigate('/login');
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header-inner">
          <div className="brand-title">OnRoute</div>
          <nav className="nav-links">
            {user ? (
              <>
                <NavLink
                  to="/app"
                  className={({ isActive }) =>
                    'nav-link' + (isActive ? ' nav-link-active' : '')
                  }
                >
                  Home
                </NavLink>
                <NavLink
                  to="/profile"
                  className={({ isActive }) =>
                    'nav-link' + (isActive ? ' nav-link-active' : '')
                  }
                >
                  Profile
                </NavLink>
                <button className="button secondary" onClick={handleLogout}>
                  Logout
                </button>
              </>
            ) : (
              <>
                <NavLink
                  to="/login"
                  className={({ isActive }) =>
                    'nav-link' + (isActive ? ' nav-link-active' : '')
                  }
                >
                  Login
                </NavLink>
                <NavLink
                  to="/signup"
                  className={({ isActive }) =>
                    'nav-link' + (isActive ? ' nav-link-active' : '')
                  }
                >
                  Sign up
                </NavLink>
              </>
            )}
          </nav>
        </div>
      </header>
      <main className="app-main">{children}</main>
    </div>
  );
};
