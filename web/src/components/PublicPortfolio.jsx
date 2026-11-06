export default function PublicPortfolio({ data, notice, onBack, showBackButton }) {
  if (!data) {
    return (
      <main className="public-shell">
        <a className="brand" href="/">showcase<span>me</span></a>
        <p className="status" role="status">{notice || 'Loading portfolio…'}</p>
        {showBackButton && <button className="secondary" onClick={onBack}>Back to editor</button>}
      </main>
    );
  }

  return (
    <main className={'public-shell template-' + data.templateKey}>
      <div className="public-topbar">
        <a className="brand" href="/">showcase<span>me</span></a>
        {showBackButton && (
          <button className="secondary" onClick={onBack}>Back to editor</button>
        )}
      </div>

      <section className="public-hero">
        <p className="eyebrow">{data.profession}</p>
        <h1>{data.displayName}</h1>
        <h2>{data.headline}</h2>
        <p>{data.bio}</p>
      </section>

      <section className="public-section">
        <h3>Skills</h3>
        <div className="chips">
          {data.skills.map(skill => <span key={skill}>{skill}</span>)}
        </div>
      </section>

      <section className="public-section">
        <h3>Experience</h3>
        {data.experience.map((item, index) => (
          <article className="entry" key={item.role + '-' + index}>
            <b>{item.role}</b>
            <span>{item.organization} · {item.period}</span>
            <p>{item.description}</p>
          </article>
        ))}
      </section>

      <section className="public-section">
        <h3>Selected projects</h3>
        <div className="project-grid">
          {data.projects.map((project, index) => (
            <article className="project" key={project.title + '-' + index}>
              <b>{project.title}</b>
              <p>{project.description}</p>
              {project.url && (
                <a href={project.url} target="_blank" rel="noreferrer">
                  View project ↗
                </a>
              )}
            </article>
          ))}
        </div>
      </section>

      <footer className="public-footer">
        <span>Published with Showcaseme</span>
        <a href="/">Create your own portfolio ↗</a>
      </footer>
    </main>
  );
}
