/* Lashes by Yuni — single-file app
 * Loads JSON, renders each tab, hash-routes between them, wires Formspree.
 * No build step. Plain HTML5 + ES2017+.
 */

const TABS = ['home', 'about', 'services', 'gallery', 'contact', 'book'];
const DEFAULT_TAB = 'home';

const state = {
  site: null,
  about: null,
  services: null,
  gallery: null,
};

/* ---------- helpers ---------- */
async function loadJson(path) {
  const res = await fetch(path, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
  return res.json();
}

function get(obj, path) {
  return path.split('.').reduce((acc, k) => (acc == null ? acc : acc[k]), obj);
}

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else if (k === 'dataset') Object.assign(node.dataset, v);
    else node.setAttribute(k, v === true ? '' : v);
  }
  for (const child of children.flat()) {
    if (child == null || child === false) continue;
    node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
  }
  return node;
}

function formatPrice(amount, currency) {
  if (amount == null) return '';
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: currency || 'USD', maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `$${amount}`;
  }
}

function phoneHref(phone) {
  return 'tel:' + phone.replace(/[^+\d]/g, '');
}

function socialLabel(social) {
  return `${social.platform || ''} ${social.handle || ''}`.trim();
}

/* ---------- declarative bindings (data-bind / data-bind-src / etc.) ---------- */
function applyBindings(root, data) {
  root.querySelectorAll('[data-bind]').forEach((node) => {
    const value = get(data, node.getAttribute('data-bind'));
    if (typeof value === 'string') node.textContent = value;
  });
  root.querySelectorAll('[data-bind-src]').forEach((node) => {
    const value = get(data, node.getAttribute('data-bind-src'));
    if (typeof value === 'string') node.setAttribute('src', value);
  });
  root.querySelectorAll('[data-bind-style]').forEach((node) => {
    const value = get(data, node.getAttribute('data-bind-style'));
    if (typeof value === 'string' && value.trim()) node.style.backgroundImage = `url("${value}")`;
  });
  root.querySelectorAll('[data-bind-href]').forEach((node) => {
    const value = get(data, node.getAttribute('data-bind-href'));
    if (typeof value === 'string') node.setAttribute('href', '#' + value);
  });
}

/* ---------- renderers ---------- */
function renderSite(site) {
  applyBindings(document, site);
  document.title = `${site.business.name} — ${site.business.tagline}`;
}

function renderFooter(site) {
  const links = document.getElementById('footer-contact-links');
  if (!links) return;

  const contact = site.contact || {};
  const social = Array.isArray(site.social) ? site.social : [];
  const items = [];

  if (contact.phone) {
    items.push(el('li', {}, el('a', { href: phoneHref(contact.phone) }, contact.phone)));
  }

  if (contact.email) {
    items.push(el('li', {}, el('a', { href: 'mailto:' + contact.email }, contact.email)));
  }

  social.forEach((s) => {
    const label = socialLabel(s);
    if (s.url && label) {
      items.push(el('li', {}, el('a', { href: s.url, target: '_blank', rel: 'noopener' }, label)));
    }
  });

  links.hidden = items.length === 0;
  links.replaceChildren(...items);
}

function renderAbout(about) {
  if (!about) return;
  const heading = document.getElementById('about-heading');
  const body = document.getElementById('about-body');
  const image = document.getElementById('about-image');

  if (heading && about.heading) heading.textContent = about.heading;

  if (body) {
    const paragraphs = Array.isArray(about.body) ? about.body : [about.body || ''];
    body.replaceChildren(...paragraphs.filter(Boolean).map((p) => el('p', {}, p)));
  }

  if (image) {
    if (about.image) image.setAttribute('src', about.image);
    image.setAttribute('alt', about.imageAlt || '');
  }
}

function renderContact(site) {
  const { contact, hours, social } = site;

  const phone = document.getElementById('contact-phone');
  if (contact.phone) {
    phone.textContent = contact.phone;
    phone.href = phoneHref(contact.phone);
  } else {
    phone.parentElement.hidden = true;
  }

  const email = document.getElementById('contact-email');
  if (contact.email) {
    email.textContent = contact.email;
    email.href = 'mailto:' + contact.email;
  } else {
    email.parentElement.hidden = true;
  }

  const addr = document.getElementById('contact-address');
  if (contact.address) addr.textContent = contact.address;
  else addr.parentElement.hidden = true;

  const tbody = document.getElementById('hours-body');
  tbody.replaceChildren(
    ...hours.map((h) =>
      el('tr', {},
        el('td', {}, h.day),
        el('td', {}, h.closed ? 'Closed' : `${h.open} – ${h.close}`)
      )
    )
  );

  const socialList = document.getElementById('social-list');
  socialList.replaceChildren(
    ...social.map((s) =>
      el('li', {},
        el('a', { href: s.url, target: '_blank', rel: 'noopener' }, socialLabel(s))
      )
    )
  );

  const mapWrap = document.getElementById('map-wrap');
  if (contact.mapEmbedUrl) {
    mapWrap.hidden = false;
    mapWrap.replaceChildren(
      el('iframe', { src: contact.mapEmbedUrl, loading: 'lazy', referrerpolicy: 'no-referrer-when-downgrade', title: 'Studio location' })
    );
  }
}

function renderServices(services) {
  const root = document.getElementById('services-list');
  const currency = services.currency || 'USD';

  const categories = services.categories.map((cat) =>
    el('article', { class: 'service-category' },
      el('h3', {}, cat.name),
      cat.blurb ? el('p', { class: 'service-blurb' }, cat.blurb) : null,
      ...cat.items.map((item) => {
        const row = el('div', { class: 'service-row' });
        row.append(
          el('div', { class: 'service-name-wrap' },
            el('div', { class: 'service-name' }, item.name),
            item.duration ? el('div', { class: 'service-meta' }, item.duration) : null
          ),
          el('div', { class: 'service-price' }, formatPrice(item.price, currency))
        );
        if (item.description) row.append(el('p', { class: 'service-desc' }, item.description));
        return row;
      })
    )
  );

  root.replaceChildren(...categories);

  // Mirror services into the booking-form select.
  const select = document.getElementById('booking-service');
  if (select) {
    const opts = [el('option', { value: '' }, 'Choose a service\u2026')];
    for (const cat of services.categories) {
      const group = el('optgroup', { label: cat.name });
      for (const item of cat.items) {
        group.append(el('option', { value: item.name }, `${item.name} — ${formatPrice(item.price, currency)}`));
      }
      opts.push(group);
    }
    select.replaceChildren(...opts);
  }
}

function renderGallery(items) {
  const root = document.getElementById('gallery-grid');
  const filtersWrap = document.getElementById('gallery-filters');

  const allTags = new Set();
  items.forEach((it) => (it.tags || []).forEach((t) => allTags.add(t)));

  let activeTag = 'all';

  const draw = () => {
    const visible = activeTag === 'all'
      ? items
      : items.filter((it) => (it.tags || []).includes(activeTag));

    root.replaceChildren(
      ...visible.map((it) => {
        const card = el('article', { class: 'gallery-card' });
        if (it.forSale) card.append(el('span', { class: 'price-badge' }, 'For sale'));
        card.append(el('img', { src: it.image, alt: it.title || '', loading: 'lazy' }));
        const body = el('div', { class: 'gallery-card-body' });
        if (it.title) body.append(el('div', { class: 'gallery-card-title' }, it.title));
        if (it.description) body.append(el('div', { class: 'gallery-card-desc' }, it.description));

        if (it.forSale) {
          const foot = el('div', { class: 'gallery-card-foot' });
          foot.append(el('span', { class: 'gallery-card-price' }, formatPrice(it.price, it.currency)));
          foot.append(
            el('button', {
              class: 'btn btn-buy',
              type: 'button',
              onclick: () => handleBuyClick(it),
            }, 'Inquire')
          );
          body.append(foot);
        }
        card.append(body);
        return card;
      })
    );
  };

  // Filters only render if there is more than one tag.
  if (allTags.size > 1) {
    filtersWrap.hidden = false;
    const tags = ['all', ...allTags];
    filtersWrap.replaceChildren(
      ...tags.map((t) =>
        el('button', {
          class: 'gallery-filter',
          type: 'button',
          'aria-pressed': t === activeTag ? 'true' : 'false',
          onclick: (ev) => {
            activeTag = t;
            filtersWrap.querySelectorAll('.gallery-filter').forEach((b) =>
              b.setAttribute('aria-pressed', b === ev.currentTarget ? 'true' : 'false')
            );
            draw();
          },
        }, t === 'all' ? 'All' : t.charAt(0).toUpperCase() + t.slice(1))
      )
    );
  } else {
    filtersWrap.hidden = true;
  }

  draw();
}

function handleBuyClick(item) {
  const msg = document.querySelector('[name="message"]');
  if (msg) {
    const note = `Interested in: ${item.title}${item.price != null ? ` (${formatPrice(item.price, item.currency)})` : ''}`;
    msg.value = msg.value ? `${msg.value}\n${note}` : note;
  }
  location.hash = '#book';
}

/* ---------- router ---------- */
function setActiveTab(tab) {
  if (!TABS.includes(tab)) tab = DEFAULT_TAB;
  document.querySelectorAll('.tab-panel').forEach((panel) => {
    panel.classList.toggle('active', panel.dataset.tab === tab);
  });
  document.querySelectorAll('[data-tab]').forEach((link) => {
    if (link.tagName === 'A') {
      if (link.dataset.tab === tab) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    }
  });
  // Close mobile menu after navigating.
  closeMobileNav();
  // Reset scroll on tab change for the SPA-like feel.
  window.scrollTo({ top: 0, behavior: 'auto' });
}

function currentTabFromHash() {
  const raw = (location.hash || '').replace('#', '');
  return TABS.includes(raw) ? raw : DEFAULT_TAB;
}

function bindRouter() {
  window.addEventListener('hashchange', () => setActiveTab(currentTabFromHash()));
  setActiveTab(currentTabFromHash());
}

/* ---------- mobile nav ---------- */
function bindMobileNav() {
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.getElementById('primary-nav');
  if (!toggle || !nav) return;
  toggle.addEventListener('click', () => {
    const open = nav.dataset.open === 'true';
    nav.dataset.open = open ? 'false' : 'true';
    toggle.setAttribute('aria-expanded', open ? 'false' : 'true');
  });
}
function closeMobileNav() {
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.getElementById('primary-nav');
  if (!nav) return;
  nav.dataset.open = 'false';
  if (toggle) toggle.setAttribute('aria-expanded', 'false');
}

/* ---------- formspree ---------- */
function initFormspree(formId) {
  if (!formId) return;
  if (typeof window.formspree === 'function') {
    window.formspree('initForm', { formElement: '#booking-form', formId });
  } else {
    // Library hasn't loaded yet — try again shortly. (CDN script is `defer`, but ordering can vary.)
    let tries = 0;
    const t = setInterval(() => {
      tries++;
      if (typeof window.formspree === 'function') {
        clearInterval(t);
        window.formspree('initForm', { formElement: '#booking-form', formId });
      } else if (tries > 50) {
        clearInterval(t);
        console.error('Formspree library failed to load.');
      }
    }, 100);
  }
}

/* ---------- boot ---------- */
async function boot() {
  bindMobileNav();
  bindRouter();

  try {
    const [site, about, services, gallery] = await Promise.all([
      loadJson('data/site.json'),
      loadJson('data/about.json'),
      loadJson('data/services.json'),
      loadJson('data/gallery.json'),
    ]);
    state.site = site;
    state.about = about;
    state.services = services;
    state.gallery = gallery;

    renderSite(site);
    renderFooter(site);
    renderAbout(about);
    renderContact(site);
    renderServices(services);
    renderGallery(gallery);

    initFormspree(site.formspree && site.formspree.formId);
  } catch (err) {
    console.error(err);
    const main = document.getElementById('main');
    if (main) {
      main.prepend(
        el('div', { class: 'container', style: 'padding:2rem 0;color:#c0392b;' },
          'Failed to load site data. If you opened the file directly, run a local server: python3 -m http.server 8000'
        )
      );
    }
  }
}

document.addEventListener('DOMContentLoaded', boot);
