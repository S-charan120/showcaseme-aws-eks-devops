const test = require('node:test');
const assert = require('node:assert/strict');
const { validateRegistration, validatePortfolio, allowedTemplates } = require('../src/domain');
const portfolio = { slug: 'sai-charan', displayName: 'Sai Charan', headline: 'Cloud Platform Engineer', bio: 'Cloud and DevOps portfolio.', profession: 'Cloud Engineering', experience: [{ role: 'Engineer', organization: 'Example', description: 'Platform delivery' }], skills: ['GCP','Kubernetes'], projects: [{ title: 'GKE Platform', description: 'Terraform, Helm and GitOps', url: 'https://github.com/example/repo' }], templateKey: 'technical' };
test('registration validates email and password minimums', () => { assert.deepEqual(validateRegistration({ email: 'a@example.com', password: 'a-strong-password' }), []); assert.ok(validateRegistration({ email: 'bad', password: 'short' }).length >= 2); });
test('portfolio accepts a bounded valid payload', () => assert.deepEqual(validatePortfolio(portfolio), []));
test('portfolio slugs enforce the documented 3-50 character boundary', () => {
  assert.deepEqual(validatePortfolio({ ...portfolio, slug: 'abc' }), []);
  assert.deepEqual(validatePortfolio({ ...portfolio, slug: 'a'.repeat(50) }), []);
  assert.ok(validatePortfolio({ ...portfolio, slug: 'a' }).some(error => error.startsWith('slug')));
  assert.ok(validatePortfolio({ ...portfolio, slug: 'ab' }).some(error => error.startsWith('slug')));
  assert.ok(validatePortfolio({ ...portfolio, slug: 'a'.repeat(51) }).some(error => error.startsWith('slug')));
});
test('portfolio rejects an invalid slug and unsupported template', () => assert.ok(validatePortfolio({ ...portfolio, slug: 'Invalid Slug', templateKey: 'unknown' }).length >= 2));
test('portfolio rejects excessive collections and malformed projects', () => assert.ok(validatePortfolio({ ...portfolio, projects: [{ title: 'Project', description: 'ok', url: 'javascript:alert(1)' }] }).length));
test('template list remains deliberately constrained', () => { assert.equal(allowedTemplates.has('minimal'), true); assert.equal(allowedTemplates.has('unexpected'), false); });
