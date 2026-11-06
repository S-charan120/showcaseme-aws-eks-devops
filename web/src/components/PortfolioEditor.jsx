export default function PortfolioEditor({
  portfolio,
  setPortfolio,
  experienceText,
  setExperienceText,
  skillsText,
  setSkillsText,
  projectsText,
  setProjectsText,
  onSave,
  onPublish,
  onUnpublish,
  onDelete,
  busy,
  notice,
  saved
}) {
  function updatePortfolio(field, value) {
    setPortfolio(current => ({ ...current, [field]: value }));
  }

  return (
    <form className="editor" onSubmit={onSave}>
      <div className="editor-head">
        <div>
          <p className="eyebrow">PORTFOLIO EDITOR</p>
          <h2>{saved ? 'Edit your portfolio' : 'Create a portfolio'}</h2>
        </div>
        <span className="state">{saved ? 'SAVED PROFILE' : 'NEW DRAFT'}</span>
      </div>

      <div className="fields">
        <label>
          Public slug
          <input
            value={portfolio.slug}
            onChange={event => updatePortfolio('slug', event.target.value.toLowerCase())}
            minLength="3"
            maxLength="50"
            pattern="[a-z0-9-]+"
            disabled={saved}
            required
          />
          <small>Unique URL identity. Choose it when you create the portfolio.</small>
        </label>

        <label>
          Display name
          <input
            value={portfolio.displayName}
            onChange={event => updatePortfolio('displayName', event.target.value)}
            maxLength="120"
            required
          />
        </label>

        <label>
          Professional headline
          <input
            value={portfolio.headline}
            onChange={event => updatePortfolio('headline', event.target.value)}
            maxLength="180"
            placeholder="Cloud Platform Engineer"
          />
        </label>

        <label>
          Profession / category
          <input
            value={portfolio.profession}
            onChange={event => updatePortfolio('profession', event.target.value)}
            maxLength="100"
            placeholder="Cloud Engineering"
          />
        </label>

        <label className="wide">
          Professional summary
          <textarea
            rows="4"
            value={portfolio.bio}
            onChange={event => updatePortfolio('bio', event.target.value)}
            maxLength="4000"
          />
        </label>

        <label className="wide">
          Experience — one per line: Role | Organization | Period | Description
          <textarea
            rows="4"
            value={experienceText}
            onChange={event => setExperienceText(event.target.value)}
            placeholder="Cloud Engineer | Example Co | 2024–Present | Platform engineering"
          />
        </label>

        <label className="wide">
          Skills — comma separated
          <input
            value={skillsText}
            onChange={event => setSkillsText(event.target.value)}
            placeholder="GCP, Kubernetes, Terraform, Argo CD"
          />
        </label>

        <label className="wide">
          Projects — one per line: Title | Description | HTTPS URL
          <textarea
            rows="4"
            value={projectsText}
            onChange={event => setProjectsText(event.target.value)}
            placeholder="GKE GitOps Platform | Terraform, Helm and Argo CD | https://github.com/..."
          />
        </label>

        <label>
          Portfolio template
          <select
            value={portfolio.templateKey}
            onChange={event => updatePortfolio('templateKey', event.target.value)}
          >
            <option value="minimal">Minimal</option>
            <option value="editorial">Editorial</option>
            <option value="technical">Technical</option>
          </select>
        </label>
      </div>

      <div className="actions">
        <button className="primary" disabled={busy}>
          {busy ? 'Saving…' : 'Save draft'}
        </button>
        <button type="button" className="secondary" disabled={busy || !saved} onClick={onPublish}>
          Publish ↗
        </button>
        <button type="button" className="secondary" disabled={busy || !saved} onClick={onUnpublish}>
          Unpublish
        </button>
        <button type="button" className="danger" disabled={busy || !saved} onClick={onDelete}>
          Delete
        </button>
      </div>

      <p className="status" role="status">{notice}</p>
    </form>
  );
}
