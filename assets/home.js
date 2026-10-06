(() => {
  const root = document.documentElement;
  const button = document.getElementById('theme-toggle');
  const preference = matchMedia('(prefers-color-scheme: dark)');
  const current = () => root.dataset.theme || (preference.matches ? 'dark' : 'light');
  function label() {
    const next = current() === 'dark' ? 'light' : 'dark';
    document.getElementById('theme-label').textContent = next === 'dark' ? 'Dark' : 'Light';
    button.setAttribute('aria-label', `Switch to ${next} theme`);
  }
  button.addEventListener('click', () => {
    root.dataset.theme = current() === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem('theme', root.dataset.theme); } catch (_) {}
    label();
  });
  preference.addEventListener('change', label);
  label();
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  if (reduced.matches || !('IntersectionObserver' in window)) return;
  const observer = new IntersectionObserver(entries => {
    entries.forEach(({ target, isIntersecting }) => {
      if (!isIntersecting) return;
      target.classList.remove('reveal-pending');
      target.classList.add('reveal-ready');
      observer.unobserve(target);
    });
  }, { threshold: 0.06 });
  document.querySelectorAll('.floating-card').forEach(section => {
    section.classList.add('reveal-pending');
    observer.observe(section);
  });
  reduced.addEventListener('change', event => {
    if (!event.matches) return;
    observer.disconnect();
    document.querySelectorAll('.reveal-pending').forEach(section => section.classList.remove('reveal-pending'));
  });
})();
