import { useEffect, useState } from 'react';
import { apiRequest } from './api/client.js';
import AppFooter from './components/AppFooter.jsx';
import AuthPanel from './components/AuthPanel.jsx';
import HeroSection from './components/HeroSection.jsx';
import PortfolioEditor from './components/PortfolioEditor.jsx';
import PortfolioSidebar from './components/PortfolioSidebar.jsx';
import PublicPortfolio from './components/PublicPortfolio.jsx';
import SiteHeader from './components/SiteHeader.jsx';

const TOKEN_KEY = 'showcaseme_access_token';

const emptyPortfolio = {
  slug: '',
  displayName: '',
  headline: '',
  bio: '',
  profession: '',
  experience: [],
  skills: [],
  projects: [],
  templateKey: 'minimal'
};

function parseRows(value, fields) {
  return value
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const parts = line.split('|').map(part => part.trim());
      return Object.fromEntries(fields.map((field, index) => [field, parts[index] || '']));
    });
}

function portfolioToEditorValues(portfolio) {
  return {
    slug: portfolio.slug,
    displayName: portfolio.displayName,
    headline: portfolio.headline,
    bio: portfolio.bio,
    profession: portfolio.profession,
    experience: portfolio.experience || [],
    skills: portfolio.skills || [],
    projects: portfolio.projects || [],
    templateKey: portfolio.templateKey || 'minimal'
  };
}

export default function App() {
  const [token, setToken] = useState(() => sessionStorage.getItem(TOKEN_KEY) || '');
  const [authMode, setAuthMode] = useState('register');
  const [auth, setAuth] = useState({ email: '', password: '' });
  const [user, setUser] = useState(null);
  const [items, setItems] = useState([]);
  const [portfolio, setPortfolio] = useState(emptyPortfolio);
  const [activeSlug, setActiveSlug] = useState('');
  const [experienceText, setExperienceText] = useState('');
  const [skillsText, setSkillsText] = useState('');
  const [projectsText, setProjectsText] = useState('');
  const [publicData, setPublicData] = useState(null);
  const [mode, setMode] = useState('builder');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const publicSlug = new URLSearchParams(window.location.search).get('portfolio');

  async function request(path, options = {}) {
    return apiRequest(path, { ...options, token });
  }

  async function refreshAccount() {
    if (!token) return;

    try {
      const [account, list] = await Promise.all([
        request('/api/me'),
        request('/api/portfolios')
      ]);

      setUser(account);
      setItems(list.items || []);

      if (list.items?.length && !activeSlug) {
        selectPortfolio(list.items[0]);
      }
    } catch (error) {
      sessionStorage.removeItem(TOKEN_KEY);
      setToken('');
      setUser(null);
      setNotice(error.message);
    }
  }

  useEffect(() => {
    if (token) refreshAccount();
  }, [token]);

  useEffect(() => {
    if (publicSlug) loadPublic(publicSlug);
  }, []);

  function selectPortfolio(item) {
    setPortfolio(portfolioToEditorValues(item));
    setActiveSlug(item.slug);
    setExperienceText(
      (item.experience || [])
        .map(entry => [entry.role, entry.organization, entry.period, entry.description].join(' | '))
        .join('\n')
    );
    setSkillsText((item.skills || []).join(', '));
    setProjectsText(
      (item.projects || [])
        .map(project => [project.title, project.description, project.url || ''].join(' | '))
        .join('\n')
    );
    setMode('builder');
    setNotice('');
  }

  function createPortfolio() {
    setPortfolio(emptyPortfolio);
    setActiveSlug('');
    setExperienceText('');
    setSkillsText('');
    setProjectsText('');
    setMode('builder');
    setNotice('New portfolio draft.');
  }

  async function authenticate(event) {
    event.preventDefault();
    setBusy(true);
    setNotice('');

    try {
      const endpoint = authMode === 'register' ? '/api/auth/register' : '/api/auth/login';
      const result = await apiRequest(endpoint, {
        method: 'POST',
        body: JSON.stringify(auth)
      });

      sessionStorage.setItem(TOKEN_KEY, result.accessToken);
      setToken(result.accessToken);
      setUser(result.user);
      setNotice('Signed in successfully.');
      setAuth(current => ({ ...current, password: '' }));
    } catch (error) {
      setNotice(error.message);
    } finally {
      setBusy(false);
    }
  }

  function buildPortfolioPayload() {
    return {
      ...portfolio,
      skills: skillsText.split(',').map(skill => skill.trim()).filter(Boolean),
      experience: parseRows(experienceText, ['role', 'organization', 'period', 'description']),
      projects: parseRows(projectsText, ['title', 'description', 'url'])
    };
  }

  async function savePortfolio(event) {
    event.preventDefault();
    if (!token) {
      setNotice('Sign in to save your portfolio.');
      return;
    }

    setBusy(true);
    setNotice('Saving draft…');

    try {
      const payload = buildPortfolioPayload();
      const saved = activeSlug
        ? await request('/api/portfolios/' + encodeURIComponent(activeSlug), {
            method: 'PUT',
            body: JSON.stringify(payload)
          })
        : await request('/api/portfolios', {
            method: 'POST',
            body: JSON.stringify(payload)
          });

      setActiveSlug(saved.slug);
      setPortfolio(portfolioToEditorValues(saved));
      const list = await request('/api/portfolios');
      setItems(list.items || []);
      setNotice('Draft saved. Publish it when you are ready.');
    } catch (error) {
      setNotice(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function publishPortfolio() {
    if (!activeSlug) {
      setNotice('Save the portfolio before publishing.');
      return;
    }

    setBusy(true);
    try {
      await request('/api/portfolios/' + encodeURIComponent(activeSlug) + '/publish', {
        method: 'POST'
      });
      const list = await request('/api/portfolios');
      setItems(list.items || []);
      await loadPublic(activeSlug);
      setNotice('Portfolio published.');
    } catch (error) {
      setNotice(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function unpublishPortfolio() {
    if (!activeSlug) return;

    setBusy(true);
    try {
      await request('/api/portfolios/' + encodeURIComponent(activeSlug) + '/unpublish', {
        method: 'POST'
      });
      const list = await request('/api/portfolios');
      setItems(list.items || []);
      setNotice('Portfolio unpublished.');
    } catch (error) {
      setNotice(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function loadPublic(slug) {
    try {
      const data = await apiRequest('/api/public/' + encodeURIComponent(slug));
      setPublicData(data);
      setMode('preview');
      setNotice('Public portfolio loaded.');
    } catch (error) {
      setPublicData(null);
      setNotice(error.message);
    }
  }

  async function deletePortfolio() {
    if (!activeSlug || !window.confirm('Delete this portfolio permanently?')) return;

    try {
      await request('/api/portfolios/' + encodeURIComponent(activeSlug), {
        method: 'DELETE'
      });
      const list = await request('/api/portfolios');
      setItems(list.items || []);
      createPortfolio();
      setNotice('Portfolio deleted.');
    } catch (error) {
      setNotice(error.message);
    }
  }

  function signOut() {
    sessionStorage.removeItem(TOKEN_KEY);
    setToken('');
    setUser(null);
    setItems([]);
    setActiveSlug('');
    setPublicData(null);
    setMode('builder');
    setNotice('Signed out.');
  }

  function changeMode(nextMode) {
    if (nextMode === 'builder') {
      setMode('builder');
      return;
    }

    if (activeSlug) {
      loadPublic(activeSlug);
    } else {
      setNotice('Save and publish a portfolio first.');
    }
  }

  if (publicSlug) {
    return <PublicPortfolio data={publicData} notice={notice} showBackButton={false} />;
  }

  if (user && mode === 'preview') {
    return (
      <div className="app-shell">
        <SiteHeader
          user={user}
          mode={mode}
          onChangeMode={changeMode}
          onSignOut={signOut}
        />
        <PublicPortfolio
          data={publicData}
          notice={notice}
          showBackButton
          onBack={() => setMode('builder')}
        />
        <AppFooter />
      </div>
    );
  }

  return (
    <main className="app-shell">
      <SiteHeader
        user={user}
        mode={mode}
        onChangeMode={changeMode}
        onSignOut={signOut}
      />

      <HeroSection />

      {!user ? (
        <AuthPanel
          authMode={authMode}
          onChangeMode={setAuthMode}
          auth={auth}
          onChangeAuth={setAuth}
          onSubmit={authenticate}
          busy={busy}
          notice={notice}
        />
      ) : (
        <section className="studio">
          <PortfolioSidebar
            items={items}
            activeSlug={activeSlug}
            onSelect={selectPortfolio}
            onCreate={createPortfolio}
          />
          <PortfolioEditor
            portfolio={portfolio}
            setPortfolio={setPortfolio}
            experienceText={experienceText}
            setExperienceText={setExperienceText}
            skillsText={skillsText}
            setSkillsText={setSkillsText}
            projectsText={projectsText}
            setProjectsText={setProjectsText}
            onSave={savePortfolio}
            onPublish={publishPortfolio}
            onUnpublish={unpublishPortfolio}
            onDelete={deletePortfolio}
            busy={busy}
            notice={notice}
            saved={Boolean(activeSlug)}
          />
        </section>
      )}

      <AppFooter />
    </main>
  );
}
