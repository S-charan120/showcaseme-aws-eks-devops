const slugPattern = /^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/;
const allowedTemplates = new Set(['minimal', 'editorial', 'technical']);
function validateRegistration(input) {
  const errors = [];
  if (!input || typeof input !== 'object') return ['JSON body is required'];
  if (typeof input.email !== 'string' || input.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) errors.push('email must be valid');
  if (typeof input.password !== 'string' || input.password.length < 12 || input.password.length > 72) errors.push('password must be 12-72 characters');
  return errors;
}
function validatePortfolio(input) {
  const errors = [];
  if (!input || typeof input !== 'object') return ['JSON body is required'];
  if (typeof input.slug !== 'string' || !slugPattern.test(input.slug)) errors.push('slug must be 3-50 lowercase letters, numbers or hyphens');
  if (typeof input.displayName !== 'string' || input.displayName.trim().length < 2 || input.displayName.length > 120) errors.push('displayName must be 2-120 characters');
  if (typeof input.headline !== 'string' || input.headline.length > 180) errors.push('headline must be at most 180 characters');
  if (typeof input.bio !== 'string' || input.bio.length > 4000) errors.push('bio must be at most 4000 characters');
  if (typeof input.profession !== 'string' || input.profession.length > 100) errors.push('profession must be at most 100 characters');
  if (!Array.isArray(input.experience) || input.experience.length > 20 || input.experience.some(x => !x || typeof x.role !== 'string' || x.role.length > 120 || typeof x.organization !== 'string' || x.organization.length > 120 || typeof x.description !== 'string' || x.description.length > 1200)) errors.push('experience must contain up to 20 valid records');
  if (!Array.isArray(input.skills) || input.skills.length > 40 || input.skills.some(x => typeof x !== 'string' || x.trim().length < 1 || x.length > 50)) errors.push('skills must contain up to 40 short strings');
  if (!Array.isArray(input.projects) || input.projects.length > 20 || input.projects.some(x => !x || typeof x.title !== 'string' || x.title.length > 120 || typeof x.description !== 'string' || x.description.length > 1200 || (x.url && (typeof x.url !== 'string' || !/^https:\/\//.test(x.url))))) errors.push('projects must contain up to 20 valid records with HTTPS URLs');
  if (input.templateKey !== undefined && !allowedTemplates.has(input.templateKey)) errors.push('templateKey must be minimal, editorial, or technical');
  return errors;
}
module.exports = { validateRegistration, validatePortfolio, slugPattern, allowedTemplates };
