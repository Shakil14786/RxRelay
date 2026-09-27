const refills = [
  { initials: 'ER', name: 'Elena Rodriguez', medication: 'Lisinopril 20mg', blocker: 'Provider response', blockerClass: 'urgent', owner: 'Priya Shah', ownerInitials: 'PS', due: 'Today, 11:30 AM', dueNote: 'in 42 min', dueClass: 'urgent', status: 'Needs review', statusClass: 'review', filter: 'mine' },
  { initials: 'MC', name: 'Marcus Chen', medication: 'Metformin ER 500mg', blocker: 'Coverage check', blockerClass: '', owner: 'You', ownerInitials: 'AM', due: 'Today, 12:15 PM', dueNote: 'in 1 hr', dueClass: '', status: 'Waiting on payer', statusClass: 'waiting', filter: 'mine' },
  { initials: 'JW', name: 'James Wilson', medication: 'Eliquis 5mg', blocker: 'No refills left', blockerClass: 'urgent', owner: 'Unassigned', ownerInitials: '+', due: 'Today, 1:00 PM', dueNote: 'in 2 hrs', dueClass: 'urgent', status: 'Unassigned', statusClass: 'unassigned', filter: 'new' },
  { initials: 'SP', name: 'Sofia Patel', medication: 'Levothyroxine 75mcg', blocker: 'Visit required', blockerClass: '', owner: 'Jamal Thomas', ownerInitials: 'JT', due: 'Today, 3:30 PM', dueNote: 'in 4 hrs', dueClass: '', status: 'Needs review', statusClass: 'review', filter: 'urgent' },
  { initials: 'DN', name: 'Daniel Nguyen', medication: 'Atorvastatin 40mg', blocker: 'Missing information', blockerClass: '', owner: 'You', ownerInitials: 'AM', due: 'Tomorrow, 9:00 AM', dueNote: 'in 22 hrs', dueClass: '', status: 'Waiting on patient', statusClass: 'waiting', filter: 'mine' },
  { initials: 'LO', name: 'Linda O\'Neil', medication: 'Amlodipine 10mg', blocker: 'Provider response', blockerClass: '', owner: 'Priya Shah', ownerInitials: 'PS', due: 'Tomorrow, 10:30 AM', dueNote: 'in 23 hrs', dueClass: '', status: 'Needs review', statusClass: 'review', filter: 'urgent' },
  { initials: 'KB', name: 'Kyle Brooks', medication: 'Ozempic 1mg', blocker: 'Coverage check', blockerClass: '', owner: 'Unassigned', ownerInitials: '+', due: 'Tomorrow, 2:00 PM', dueNote: 'in 27 hrs', dueClass: '', status: 'Unassigned', statusClass: 'unassigned', filter: 'new' }
];

const queueBody = document.getElementById('queue-body');
const searchInput = document.getElementById('search-input');
const count = document.getElementById('showing-count');
const toast = document.getElementById('toast');
let activeFilter = 'all';

function renderQueue() {
  const query = searchInput.value.trim().toLowerCase();
  const visible = refills.filter(item => {
    const matchesFilter = activeFilter === 'all' || item.filter === activeFilter || (activeFilter === 'urgent' && item.dueClass === 'urgent');
    const matchesSearch = `${item.name} ${item.medication} ${item.blocker}`.toLowerCase().includes(query);
    return matchesFilter && matchesSearch;
  }).slice(0, 6);
  queueBody.innerHTML = visible.map(item => `
    <tr data-name="${item.name}">
      <td><div class="patient-cell"><span class="patient-initials">${item.initials}</span><div><span class="patient-name">${item.name}</span><span class="medication">${item.medication}</span></div></div></td>
      <td><span class="blocker ${item.blockerClass}"><i class="blocker-dot"></i>${item.blocker}</span></td>
      <td><span class="owner"><i class="owner-avatar ${item.owner === 'Unassigned' ? 'unassigned' : ''}">${item.ownerInitials}</i>${item.owner}</span></td>
      <td><span class="due ${item.dueClass}"><strong>${item.due}</strong><small>${item.dueNote}</small></span></td>
      <td><span class="status ${item.statusClass}">${item.status}</span></td>
      <td><button class="row-menu" aria-label="Open ${item.name}">···</button></td>
    </tr>`).join('') || '<tr><td colspan="6" class="empty-state">No refill matches this view.</td></tr>';
  count.textContent = visible.length;
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove('show'), 2800);
}

document.querySelectorAll('.filter-button').forEach(button => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.filter-button').forEach(item => item.classList.remove('active'));
    button.classList.add('active');
    activeFilter = button.dataset.filter;
    renderQueue();
  });
});
searchInput.addEventListener('input', renderQueue);
document.getElementById('export-btn').addEventListener('click', () => showToast('Queue export prepared for download.'));
document.querySelectorAll('.row-menu').forEach(button => button.addEventListener('click', event => showToast(`Opening ${event.currentTarget.closest('tr').dataset.name}'s refill timeline.`)));

const modal = document.getElementById('modal');
document.getElementById('new-refill').addEventListener('click', () => modal.classList.add('open'));
document.getElementById('modal-close').addEventListener('click', () => modal.classList.remove('open'));
document.getElementById('modal-cancel').addEventListener('click', () => modal.classList.remove('open'));
document.getElementById('modal-submit').addEventListener('click', () => {
  const name = document.getElementById('patient-name').value.trim();
  if (!name) { document.getElementById('patient-name').focus(); return; }
  modal.classList.remove('open');
  showToast(`${name}'s refill was added to the queue.`);
  document.getElementById('patient-name').value = '';
});
modal.addEventListener('click', event => { if (event.target === modal) modal.classList.remove('open'); });

document.querySelectorAll('.nav-item').forEach(item => item.addEventListener('click', () => {
  if (!item.classList.contains('active')) showToast(`${item.textContent.trim()} view is ready for your team.`);
}));
document.querySelector('.insight-link').addEventListener('click', () => showToast('Pattern review added to your activity log.'));
renderQueue();
