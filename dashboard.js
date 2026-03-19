const OWNER = 'linuxfoundation';
const REPO  = 'lfx-v2-ui';

class RateLimitError extends Error {
  constructor(resetUnix) {
    super('GitHub API rate limit exceeded');
    this.resetAt = resetUnix ? new Date(resetUnix * 1000) : null;
  }
}

async function ghFetch(path) {
  const cacheKey = 'gh:' + path;
  let cached = null;
  try { cached = JSON.parse(localStorage.getItem(cacheKey)); } catch {}

  const headers = { 'Accept': 'application/vnd.github+json' };
  if (cached?.etag) headers['If-None-Match'] = cached.etag;

  const res = await fetch(`https://api.github.com${path}`, { headers });

  if (res.status === 304) return cached.data;

  if (res.status === 403 || res.status === 429) {
    const reset = res.headers.get('X-RateLimit-Reset');
    throw new RateLimitError(reset ? parseInt(reset, 10) : null);
  }

  if (!res.ok) throw new Error(`GitHub API ${res.status}: ${res.statusText}`);

  const data = await res.json();
  const etag = res.headers.get('ETag');
  if (etag) {
    try { localStorage.setItem(cacheKey, JSON.stringify({ etag, data })); } catch {}
  }
  return data;
}

async function latestStatus(deploymentId) {
  const statuses = await ghFetch(
    `/repos/${OWNER}/${REPO}/deployments/${deploymentId}/statuses?per_page=1`
  );
  return statuses[0] ?? null;
}

async function checkUrl(url) {
  try {
    // no-cors follows the 302 and returns an opaque response (status 0).
    // Resolves if the domain is reachable; throws only on DNS/network failure.
    await fetch(url, { method: 'GET', mode: 'no-cors' });
    return 'success';
  } catch {
    return null;
  }
}

function relativeTime(iso) {
  const mins = Math.floor((Date.now() - new Date(iso)) / 60000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function badgeClass(state) {
  return { success: 'badge-success', failure: 'badge-failure',
           error: 'badge-failure',   pending: 'badge-pending',
           in_progress: 'badge-pending' }[state] ?? 'badge-inactive';
}

function renderTable(rows, isPrTable) {
  if (!rows.length) return `<p class="empty">No active deployments.</p>`;
  const trs = rows.map(d => {
    const s      = d.latestStatus;
    const state  = d.liveStatus ?? s?.state ?? 'pending';
    const envUrl = d.envUrl ?? s?.environment_url ?? '';
    const logUrl = s?.log_url ?? '';

    const envName = d.environment ?? `ui-pr-${d.prNumber}`;
    const linkCell = [
      envUrl ? `<a class="link env-name" href="${envUrl}" target="_blank">${envName}</a>`
             : `<span class="env-name">${envName}</span>`,
      logUrl && `<a class="link" href="${logUrl}" target="_blank" style="font-size:12px">ArgoCD ↗</a>`,
    ].filter(Boolean).join(' ');

    const prCell = d.prNumber
      ? `<a class="link" href="https://github.com/${OWNER}/${REPO}/pull/${d.prNumber}" target="_blank">#${d.prNumber}</a>`
      : '';

    const ref  = d.ref  ?? '';
    const sha  = d.sha  ? d.sha.slice(0, 7) : '';
    const time = d.updated_at ? `<span class="time" title="${d.updated_at}">${relativeTime(d.updated_at)}</span>` : '—';

    if (isPrTable) {
      return `<tr>
        <td><span class="badge ${badgeClass(state)}">${state}</span></td>
        <td>${linkCell}</td>
        <td>${prCell}</td>
        <td><span class="branch-ref">${ref}</span></td>
        <td><span class="sha">${sha}</span></td>
        <td>${time}</td>
      </tr>`;
    }

    return `<tr>
      <td><span class="badge ${badgeClass(state)}">${state}</span></td>
      <td>${linkCell}</td>
      <td><span class="branch-ref">${ref}</span></td>
      <td><span class="sha">${sha}</span></td>
      <td>${time}</td>
    </tr>`;
  }).join('');

  if (isPrTable) {
    return `<table>
      <thead><tr>
        <th>Status</th><th>Link</th><th>PR</th>
        <th>Branch / Ref</th><th>SHA</th><th>Last Updated</th>
      </tr></thead>
      <tbody>${trs}</tbody>
    </table>`;
  }

  return `<table>
    <thead><tr>
      <th>Status</th><th>Link</th><th>Branch / Ref</th><th>SHA</th><th>Last Updated</th>
    </tr></thead>
    <tbody>${trs}</tbody>
  </table>`;
}

const byTime = (a, b) => {
  if (!a.updated_at) return 1;
  if (!b.updated_at) return -1;
  return new Date(b.updated_at) - new Date(a.updated_at);
};

function showError(errorId, e) {
  if (e instanceof RateLimitError) {
    const resetAt   = e.resetAt;
    const timeStr   = resetAt ? resetAt.toLocaleTimeString() : 'unknown';
    const minsUntil = resetAt ? Math.ceil((resetAt - Date.now()) / 60000) : null;
    document.getElementById(errorId).innerHTML = `<div class="warning">
      GitHub API rate limit exceeded. Resets at <strong>${timeStr}</strong>${minsUntil !== null ? ` (in ${minsUntil} minute${minsUntil !== 1 ? 's' : ''})` : ''}.
    </div>`;
  } else {
    document.getElementById(errorId).innerHTML = `<div class="error">${e.message}</div>`;
  }
}

async function loadPRs() {
  const content = document.getElementById('pr-content');
  const errorEl = document.getElementById('pr-error');
  errorEl.innerHTML = '';
  content.innerHTML = '<p class="loading">Loading…</p>';

  try {
    const [all, labeledIssues] = await Promise.all([
      ghFetch(`/repos/${OWNER}/${REPO}/deployments?per_page=100`),
      ghFetch(`/repos/${OWNER}/${REPO}/issues?labels=deploy-preview&state=open&per_page=100`),
    ]);

    const deployByEnv = new Map();
    for (const d of all) {
      if (!deployByEnv.has(d.environment)) deployByEnv.set(d.environment, d);
    }

    const labeledPRs = labeledIssues.filter(i => i.pull_request);
    const prDetails  = await Promise.all(
      labeledPRs.map(pr => ghFetch(`/repos/${OWNER}/${REPO}/pulls/${pr.number}`))
    );

    const prRowsRaw = prDetails.map(pr => {
      const envName    = `ui-pr-${pr.number}`;
      const envUrl     = `https://${envName}.dev.v2.cluster.linuxfound.info`;
      const deployment = deployByEnv.get(envName) ?? null;
      return {
        prNumber:    pr.number,
        ref:         pr.head.ref,
        sha:         pr.head.sha,
        environment: envName,
        envUrl,
        updated_at:  deployment?.updated_at ?? pr.updated_at,
        id:          deployment?.id ?? null,
      };
    });

    const prRows = await Promise.all(
      prRowsRaw.map(async d => {
        const [latestSt, liveStatus] = await Promise.all([
          d.id ? latestStatus(d.id) : Promise.resolve(null),
          checkUrl(d.envUrl),
        ]);
        return { ...d, latestStatus: latestSt, liveStatus };
      })
    );

    prRows.sort(byTime);
    content.innerHTML = renderTable(prRows, true);
  } catch (e) {
    content.innerHTML = '';
    showError('pr-error', e);
  }
}

async function loadFeatures() {
  const content = document.getElementById('feat-content');
  const errorEl = document.getElementById('feat-error');
  errorEl.innerHTML = '';
  content.innerHTML = '<p class="loading">Loading…</p>';

  try {
    const all  = await ghFetch(`/repos/${OWNER}/${REPO}/deployments?per_page=100`);
    const seen = new Map();
    for (const d of all) {
      if (/^ui-feat-/.test(d.environment) && !seen.has(d.environment))
        seen.set(d.environment, d);
    }

    const featRows = await Promise.all(
      [...seen.values()].map(async d => ({ ...d, latestStatus: await latestStatus(d.id) }))
    );

    featRows.sort(byTime);
    content.innerHTML = renderTable(featRows, false);
  } catch (e) {
    content.innerHTML = '';
    showError('feat-error', e);
  }
}

loadPRs();
