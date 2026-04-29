import { Link, Navigate, useNavigate } from "react-router-dom";

import { useAuth } from "@/auth/AuthContext";
import { LandingDino } from "@/field/LandingDino";

export function LandingPage(): React.ReactElement {
  const { user, initializing, enterGuestMode } = useAuth();
  const navigate = useNavigate();

  if (!initializing && user) return <Navigate to="/field" replace />;

  return (
    <main className="landing-page field-stage-world-Forest">
      <LandingDino world="Forest" />
      <div className="landing-cta">
        <h1 className="landing-title">TODOgotchi</h1>
        <p className="landing-sub">Feed your tasks. Watch them grow.</p>
        <div className="landing-actions">
          <button
            type="button"
            className="landing-guest-btn"
            onClick={() => {
              enterGuestMode();
              void navigate("/field");
            }}
          >
            Join as guest
          </button>
          <Link to="/login" className="landing-login-btn">
            Log in
          </Link>
        </div>
      </div>
    </main>
  );
}
