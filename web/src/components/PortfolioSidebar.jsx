export default function PortfolioSidebar({
  items,
  activeSlug,
  onSelect,
  onCreate
}) {
  return (
    <aside className="portfolio-sidebar">
      <div className="side-head">
        <div>
          <p className="eyebrow">YOUR WORKSPACE</p>
          <h3>My portfolios</h3>
        </div>
        <button onClick={onCreate}>＋ New</button>
      </div>

      {items.length === 0 && (
        <p className="empty-list">Your saved portfolios will appear here.</p>
      )}

      {items.map(portfolio => (
        <button
          key={portfolio.slug}
          className={'portfolio-item ' + (activeSlug === portfolio.slug ? 'chosen' : '')}
          onClick={() => onSelect(portfolio)}
        >
          <b>{portfolio.displayName}</b>
          <span>
            /{portfolio.slug} · {portfolio.published ? 'Published' : 'Draft'}
          </span>
        </button>
      ))}
    </aside>
  );
}
