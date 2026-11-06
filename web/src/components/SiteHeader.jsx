export default function SiteHeader({ user, mode, onChangeMode, onSignOut }) {
  return (
    <header className="site-header">
      <a className="brand" href="/">showcase<span>me</span></a>

      <nav className="nav" aria-label="Main navigation">
        <button
          className={mode === 'builder' ? 'active' : ''}
          onClick={() => onChangeMode('builder')}
        >
          Builder
        </button>
        <button
          className={mode === 'preview' ? 'active' : ''}
          onClick={() => onChangeMode('preview')}
        >
          Preview
        </button>
      </nav>

      <div className="account">
        {user ? (
          <>
            <span>{user.email}</span>
            <button onClick={onSignOut}>Sign out</button>
          </>
        ) : (
          <a href="#account">Sign in</a>
        )}
      </div>
    </header>
  );
}
