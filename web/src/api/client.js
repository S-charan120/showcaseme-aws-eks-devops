export async function apiRequest(path, options = {}) {
  const { token, headers: suppliedHeaders, ...requestOptions } = options;
  const headers = new Headers(suppliedHeaders || {});

  if (requestOptions.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', 'Bearer ' + token);
  }

  const response = await fetch(path, { ...requestOptions, headers });
  const data = response.status === 204
    ? null
    : await response.json().catch(() => ({}));

  if (!response.ok) {
    const details = data && data.details ? data.details.join(', ') : '';
    const message = details || (data && data.error) || ('Request failed (' + response.status + ')');
    throw new Error(message);
  }

  return data;
}
