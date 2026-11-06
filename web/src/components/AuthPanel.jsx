export default function AuthPanel({
  authMode,
  onChangeMode,
  auth,
  onChangeAuth,
  onSubmit,
  busy,
  notice
}) {
  return (
    <section className="auth" id="account">
      <div>
        <p className="eyebrow">START YOUR STORY</p>
        <h2>{authMode === 'register' ? 'Create your account' : 'Welcome back'}</h2>
        <p>
          {authMode === 'register'
            ? 'Sign up to build and manage your public portfolio.'
            : 'Sign in to continue editing your portfolios.'}
        </p>
      </div>

      <form onSubmit={onSubmit}>
        <div className="switch">
          <button
            type="button"
            className={authMode === 'register' ? 'selected' : ''}
            onClick={() => onChangeMode('register')}
          >
            Create account
          </button>
          <button
            type="button"
            className={authMode === 'login' ? 'selected' : ''}
            onClick={() => onChangeMode('login')}
          >
            Sign in
          </button>
        </div>

        <label>
          Email
          <input
            type="email"
            value={auth.email}
            onChange={event => onChangeAuth({ ...auth, email: event.target.value })}
            autoComplete="email"
            required
          />
        </label>

        <label>
          Password
          <input
            type="password"
            value={auth.password}
            onChange={event => onChangeAuth({ ...auth, password: event.target.value })}
            minLength="12"
            maxLength="72"
            autoComplete={authMode === 'register' ? 'new-password' : 'current-password'}
            required
          />
          <small>Use at least 12 characters.</small>
        </label>

        <button className="primary" disabled={busy}>
          {busy ? 'Please wait…' : authMode === 'register' ? 'Create account' : 'Sign in'} ↗
        </button>
        <p className="status" role="status">{notice}</p>
      </form>
    </section>
  );
}
