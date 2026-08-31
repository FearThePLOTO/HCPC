// Shared nav/profile logic for all pages
async function loadNav() {
  const container = document.getElementById('nav-profile');
  if (!container) return;
  try {
    const res = await fetch('/api/me');
    if (res.ok) {
      const user = await res.json();
      const initials = (user.first_name[0] + user.last_name[0]).toUpperCase();
      container.innerHTML = `
        <a href="/profile/${user.id}" title="View profile">
          <span class="avatar">${initials}</span>
          <span>${user.first_name} ${user.last_name}</span>
        </a>
        <a href="#" id="logoutBtn">Logout</a>
      `;
      document.getElementById('logoutBtn')?.addEventListener('click', async (e) => {
        e.preventDefault();
        await fetch('/api/logout', { method: 'POST' });
        location.href = '/';
      });
    } else {
      container.innerHTML = `<a href="/login"><span class="avatar">HU</span> Login / Register</a>`;
    }
  } catch {
    container.innerHTML = `<a href="/login"><span class="avatar">HU</span> Login / Register</a>`;
  }
}
document.addEventListener('DOMContentLoaded', loadNav);
