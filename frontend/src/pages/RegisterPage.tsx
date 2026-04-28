import { Link } from "react-router-dom";

export function RegisterPage(): React.ReactElement {
  return (
    <main className="auth-page">
      <div className="auth-card">
        <h1>Account creation closed</h1>
        <p style={{ margin: 0, lineHeight: 1.6, color: "var(--gray-600)" }}>
          Due to backend infrastructure constraints I can&rsquo;t allow account creation at this
          time. Write me an email if you would like to test this app out!
        </p>
        <a
          href="mailto:rvlynch9@gmail.com"
          style={{ fontWeight: 700, color: "var(--primary-600)", wordBreak: "break-all" }}
        >
          rvlynch9@gmail.com
        </a>
        <p className="auth-switch">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </main>
  );
}
