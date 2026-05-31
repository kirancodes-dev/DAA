/* ==========================================================================
   DisciplineX — App Logic
   ========================================================================== */

// ==========================================
// State & Constants
// ==========================================
const STORAGE_KEY = 'disciplinex_data';
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_FULL = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const MEAL_ICONS = { breakfast: '🌅', lunch: '☀️', dinner: '🌙', snack: '🍎' };

let currentDate = new Date();
let currentTab = 'dashboard';
let currentMealPlanDay = 'monday';
let deferredInstallPrompt = null;

// Motivational quotes
const QUOTES = [
  { text: "The only bad workout is the one that didn't happen.", author: "Unknown" },
  { text: "Discipline is choosing between what you want now and what you want most.", author: "Abraham Lincoln" },
  { text: "Take care of your body. It's the only place you have to live.", author: "Jim Rohn" },
  { text: "The pain you feel today will be the strength you feel tomorrow.", author: "Arnold Schwarzenegger" },
  { text: "Don't wish for it. Work for it.", author: "Unknown" },
  { text: "Your body can stand almost anything. It's your mind you have to convince.", author: "Unknown" },
  { text: "Success is the sum of small efforts repeated day in and day out.", author: "Robert Collier" },
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "Strive for progress, not perfection.", author: "Unknown" },
  { text: "Wake up with determination. Go to bed with satisfaction.", author: "Unknown" },
  { text: "The difference between try and triumph is a little umph.", author: "Marvin Phillips" },
  { text: "A year from now you'll wish you had started today.", author: "Karen Lamb" },
  { text: "It's not about having time, it's about making time.", author: "Unknown" },
  { text: "Motivation gets you going, but discipline keeps you growing.", author: "John C. Maxwell" },
  { text: "Small daily improvements over time lead to stunning results.", author: "Robin Sharma" },
  { text: "Eat clean. Train dirty.", author: "Unknown" },
  { text: "You don't have to be extreme, just consistent.", author: "Unknown" },
  { text: "The body achieves what the mind believes.", author: "Napoleon Hill" },
  { text: "Push harder than yesterday if you want a different tomorrow.", author: "Unknown" },
  { text: "Every workout is progress. Every meal is a choice. Choose wisely.", author: "Unknown" }
];

// ==========================================
// Data Management
// ==========================================
function getDefaultData() {
  return {
    settings: {
      name: '',
      weightUnit: 'kg', // 'kg' or 'lbs'
      goalWorkouts: 3,
      goalMeals: 4
    },
    workouts: {},   // { "2026-05-31": [{id, name, sets, reps, weight, notes, timestamp}] }
    meals: {},      // { "2026-05-31": [{id, name, portion, type, notes, timestamp}] }
    mealPlan: {     // { monday: [{id, name, type, portion}], ... }
      monday: [], tuesday: [], wednesday: [], thursday: [],
      friday: [], saturday: [], sunday: []
    },
    mealPlanChecked: {}, // { "2026-05-31": { mealPlanItemId: true } }
    streaks: {}     // { "2026-05-31": true }
  };
}

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Merge with defaults for missing keys
      const defaults = getDefaultData();
      return {
        settings: { ...defaults.settings, ...parsed.settings },
        workouts: parsed.workouts || {},
        meals: parsed.meals || {},
        mealPlan: { ...defaults.mealPlan, ...parsed.mealPlan },
        mealPlanChecked: parsed.mealPlanChecked || {},
        streaks: parsed.streaks || {}
      };
    }
  } catch (e) {
    console.error('Error loading data:', e);
  }
  return getDefaultData();
}

function saveData() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
  } catch (e) {
    console.error('Error saving data:', e);
  }
}

let appData = loadData();

// ==========================================
// Utility Helpers
// ==========================================
function formatDateKey(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDisplayDate(date) {
  const today = new Date();
  const d = new Date(date);
  if (formatDateKey(d) === formatDateKey(today)) return 'Today';
  
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (formatDateKey(d) === formatDateKey(yesterday)) return 'Yesterday';
  
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  if (formatDateKey(d) === formatDateKey(tomorrow)) return 'Tomorrow';
  
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

function getDayOfWeek(date) {
  return DAY_FULL[new Date(date).getDay()];
}

function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
}

// ==========================================
// Tab Navigation
// ==========================================
function switchTab(tabName) {
  currentTab = tabName;

  // Update tab buttons
  document.querySelectorAll('.tab-item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });

  // Update tab views
  document.querySelectorAll('.tab-view').forEach(view => {
    view.classList.toggle('active', view.id === `view-${tabName}`);
  });

  // Show/hide FAB based on tab
  const fab = document.getElementById('fab-add');
  if (tabName === 'dashboard' || tabName === 'settings') {
    fab.classList.add('hidden');
  } else {
    fab.classList.remove('hidden');
  }

  // Re-render active tab content
  renderCurrentTab();
}

function renderCurrentTab() {
  switch (currentTab) {
    case 'dashboard': renderDashboard(); break;
    case 'workout': renderWorkouts(); break;
    case 'diet': renderDiet(); break;
    case 'mealplan': renderMealPlan(); break;
    case 'settings': renderSettings(); break;
  }
}

// ==========================================
// Date Navigation
// ==========================================
function updateDateDisplay() {
  document.getElementById('date-display').textContent = formatDisplayDate(currentDate);
}

function navigateDate(offset) {
  currentDate.setDate(currentDate.getDate() + offset);
  updateDateDisplay();
  renderCurrentTab();
}

// ==========================================
// Dashboard Rendering
// ==========================================
function renderDashboard() {
  const dateKey = formatDateKey(currentDate);
  const workouts = appData.workouts[dateKey] || [];
  const meals = appData.meals[dateKey] || [];
  const streak = calculateStreak();
  const volume = calculateVolume(workouts);

  // Stats
  document.getElementById('stat-workouts').textContent = workouts.length;
  document.getElementById('stat-meals').textContent = meals.length;
  document.getElementById('stat-streak').textContent = streak;
  document.getElementById('stat-volume').textContent = volume > 0 ? formatVolume(volume) : '0';

  // Discipline Score
  renderDisciplineScore(workouts.length, meals.length);

  // Streak Bar
  renderStreakBar();

  // Quote
  renderQuote();
}

function renderDisciplineScore(workoutCount, mealCount) {
  const goalW = appData.settings.goalWorkouts || 3;
  const goalM = appData.settings.goalMeals || 4;
  const wpct = Math.min(workoutCount / goalW, 1);
  const mpct = Math.min(mealCount / goalM, 1);
  const score = Math.round(((wpct + mpct) / 2) * 100);

  const circumference = 2 * Math.PI * 42; // r=42
  const offset = circumference - (score / 100) * circumference;

  const ring = document.getElementById('discipline-ring-fill');
  ring.style.strokeDashoffset = offset;

  document.getElementById('discipline-percent').textContent = `${score}%`;

  // Update streak data for today
  const dateKey = formatDateKey(currentDate);
  const today = formatDateKey(new Date());
  if (dateKey === today && score >= 50) {
    appData.streaks[dateKey] = true;
    saveData();
  }
}

function calculateVolume(workouts) {
  return workouts.reduce((total, ex) => {
    return total + (ex.sets || 0) * (ex.reps || 0) * (ex.weight || 0);
  }, 0);
}

function formatVolume(vol) {
  if (vol >= 10000) return (vol / 1000).toFixed(1) + 'k';
  return vol.toLocaleString();
}

function calculateStreak() {
  let streak = 0;
  const today = new Date();
  const d = new Date(today);
  
  while (true) {
    const key = formatDateKey(d);
    if (appData.streaks[key]) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else {
      // If it's today and not yet completed, check yesterday
      if (formatDateKey(d) === formatDateKey(today)) {
        d.setDate(d.getDate() - 1);
        continue;
      }
      break;
    }
  }
  return streak;
}

function renderStreakBar() {
  const container = document.getElementById('streak-days');
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay()); // Start from Sunday

  let html = '';
  for (let i = 0; i < 7; i++) {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    const key = formatDateKey(d);
    const isToday = formatDateKey(d) === formatDateKey(today);
    const completed = appData.streaks[key] === true;
    const dayLabel = DAY_NAMES[d.getDay()];

    let dotClass = 'streak-day-dot';
    if (completed) dotClass += ' completed';
    if (isToday) dotClass += ' today';

    html += `
      <div class="streak-day">
        <span class="streak-day-label">${dayLabel}</span>
        <div class="${dotClass}">${completed ? '✓' : d.getDate()}</div>
      </div>
    `;
  }
  container.innerHTML = html;
}

function renderQuote() {
  // Pick a quote based on the day so it stays consistent
  const dayIndex = Math.floor(currentDate.getTime() / 86400000) % QUOTES.length;
  const quote = QUOTES[dayIndex];
  document.getElementById('quote-text').textContent = quote.text;
  document.getElementById('quote-author').textContent = `— ${quote.author}`;
}

// ==========================================
// Workout Tab
// ==========================================
function renderWorkouts() {
  const dateKey = formatDateKey(currentDate);
  const workouts = appData.workouts[dateKey] || [];
  const container = document.getElementById('workout-list');

  // Summary
  let totalSets = 0, totalReps = 0, totalVolume = 0;
  workouts.forEach(w => {
    totalSets += w.sets || 0;
    totalReps += (w.sets || 0) * (w.reps || 0);
    totalVolume += (w.sets || 0) * (w.reps || 0) * (w.weight || 0);
  });

  document.getElementById('workout-total-exercises').textContent = workouts.length;
  document.getElementById('workout-total-sets').textContent = totalSets;
  document.getElementById('workout-total-reps').textContent = totalReps;
  document.getElementById('workout-total-volume').textContent = totalVolume > 0 ? formatVolume(totalVolume) : '0';

  if (workouts.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🏋️</div>
        <div class="empty-state-text">No exercises logged yet.<br>Tap + to add your first exercise!</div>
      </div>
    `;
    return;
  }

  const unit = appData.settings.weightUnit || 'kg';
  container.innerHTML = workouts.map(w => `
    <div class="entry-item" data-id="${w.id}">
      <div class="entry-icon workout-icon">💪</div>
      <div class="entry-details">
        <div class="entry-name">${escapeHtml(w.name)}</div>
        <div class="entry-meta">${w.sets} sets × ${w.reps} reps${w.weight ? ` @ ${w.weight} ${unit}` : ''}${w.notes ? ' · ' + escapeHtml(w.notes) : ''}</div>
      </div>
      <div class="entry-actions">
        <button class="entry-action-btn delete" onclick="deleteWorkout('${w.id}')" aria-label="Delete exercise">🗑</button>
      </div>
    </div>
  `).join('');
}

function addWorkout() {
  const name = document.getElementById('workout-name').value.trim();
  const sets = parseInt(document.getElementById('workout-sets').value) || 0;
  const reps = parseInt(document.getElementById('workout-reps').value) || 0;
  const weight = parseFloat(document.getElementById('workout-weight').value) || 0;
  const notes = document.getElementById('workout-notes').value.trim();

  if (!name) { showToast('Please enter an exercise name'); return; }
  if (!sets || !reps) { showToast('Please enter sets and reps'); return; }

  const dateKey = formatDateKey(currentDate);
  if (!appData.workouts[dateKey]) appData.workouts[dateKey] = [];

  appData.workouts[dateKey].push({
    id: generateId(),
    name, sets, reps, weight, notes,
    timestamp: Date.now()
  });

  saveData();
  closeModal('modal-workout');
  clearWorkoutForm();
  renderWorkouts();
  showToast('💪 Exercise added!');
}

function deleteWorkout(id) {
  const dateKey = formatDateKey(currentDate);
  if (!appData.workouts[dateKey]) return;
  appData.workouts[dateKey] = appData.workouts[dateKey].filter(w => w.id !== id);
  if (appData.workouts[dateKey].length === 0) delete appData.workouts[dateKey];
  saveData();
  renderWorkouts();
  showToast('Exercise removed');
}

function clearWorkoutForm() {
  document.getElementById('workout-name').value = '';
  document.getElementById('workout-sets').value = '';
  document.getElementById('workout-reps').value = '';
  document.getElementById('workout-weight').value = '';
  document.getElementById('workout-notes').value = '';
}

// ==========================================
// Diet Tab
// ==========================================
function renderDiet() {
  const dateKey = formatDateKey(currentDate);
  const meals = appData.meals[dateKey] || [];
  const dayOfWeek = getDayOfWeek(currentDate);
  const planned = appData.mealPlan[dayOfWeek] || [];
  const checked = appData.mealPlanChecked[dateKey] || {};

  // Summary
  const completedCount = planned.filter(p => checked[p.id]).length;
  document.getElementById('diet-total-meals').textContent = meals.length;
  document.getElementById('diet-planned').textContent = planned.length;
  document.getElementById('diet-completed').textContent = completedCount;

  // Planned meals
  const plannedContainer = document.getElementById('diet-planned-list');
  if (planned.length === 0) {
    plannedContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📋</div>
        <div class="empty-state-text">No planned meals for today.<br>Go to Meal Plan tab to create a plan!</div>
      </div>
    `;
  } else {
    plannedContainer.innerHTML = planned.map(p => {
      const isChecked = checked[p.id] === true;
      return `
        <div class="entry-item${isChecked ? ' completed' : ''}">
          <button class="entry-checkbox${isChecked ? ' checked' : ''}" onclick="togglePlannedMeal('${p.id}')" aria-label="Mark as eaten">${isChecked ? '✓' : ''}</button>
          <div class="entry-icon meal-icon">${MEAL_ICONS[p.type] || '🍽️'}</div>
          <div class="entry-details">
            <div class="entry-name">${escapeHtml(p.name)}</div>
            <div class="entry-meta">${capitalize(p.type)}${p.portion ? ' · ' + escapeHtml(p.portion) : ''}</div>
          </div>
        </div>
      `;
    }).join('');
  }

  // Logged meals
  const eatenContainer = document.getElementById('diet-eaten-list');
  if (meals.length === 0) {
    eatenContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🍽️</div>
        <div class="empty-state-text">No meals logged yet.<br>Tap + to log what you ate!</div>
      </div>
    `;
  } else {
    eatenContainer.innerHTML = meals.map(m => `
      <div class="entry-item" data-id="${m.id}">
        <div class="entry-icon meal-icon">${MEAL_ICONS[m.type] || '🍽️'}</div>
        <div class="entry-details">
          <div class="entry-name">${escapeHtml(m.name)}</div>
          <div class="entry-meta">${capitalize(m.type)}${m.portion ? ' · ' + escapeHtml(m.portion) : ''}${m.notes ? ' · ' + escapeHtml(m.notes) : ''}</div>
        </div>
        <div class="entry-actions">
          <button class="entry-action-btn delete" onclick="deleteMeal('${m.id}')" aria-label="Delete meal">🗑</button>
        </div>
      </div>
    `).join('');
  }
}

function addMeal() {
  const name = document.getElementById('meal-name').value.trim();
  const portion = document.getElementById('meal-portion').value.trim();
  const type = document.getElementById('meal-type').value;
  const notes = document.getElementById('meal-notes').value.trim();

  if (!name) { showToast('Please enter a meal name'); return; }

  const dateKey = formatDateKey(currentDate);
  if (!appData.meals[dateKey]) appData.meals[dateKey] = [];

  appData.meals[dateKey].push({
    id: generateId(),
    name, portion, type, notes,
    timestamp: Date.now()
  });

  saveData();
  closeModal('modal-meal');
  clearMealForm();
  renderDiet();
  showToast('🍽️ Meal logged!');
}

function deleteMeal(id) {
  const dateKey = formatDateKey(currentDate);
  if (!appData.meals[dateKey]) return;
  appData.meals[dateKey] = appData.meals[dateKey].filter(m => m.id !== id);
  if (appData.meals[dateKey].length === 0) delete appData.meals[dateKey];
  saveData();
  renderDiet();
  showToast('Meal removed');
}

function togglePlannedMeal(planItemId) {
  const dateKey = formatDateKey(currentDate);
  if (!appData.mealPlanChecked[dateKey]) appData.mealPlanChecked[dateKey] = {};
  
  appData.mealPlanChecked[dateKey][planItemId] = !appData.mealPlanChecked[dateKey][planItemId];
  saveData();
  renderDiet();
}

function clearMealForm() {
  document.getElementById('meal-name').value = '';
  document.getElementById('meal-portion').value = '';
  document.getElementById('meal-type').value = 'breakfast';
  document.getElementById('meal-notes').value = '';
}

// ==========================================
// Meal Plan Tab
// ==========================================
function renderMealPlan() {
  // Update active day tab
  document.querySelectorAll('.day-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.day === currentMealPlanDay);
  });

  const planned = appData.mealPlan[currentMealPlanDay] || [];
  const container = document.getElementById('mealplan-list');

  if (planned.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📝</div>
        <div class="empty-state-text">No meals planned for ${capitalize(currentMealPlanDay)}.<br>Tap + to add a planned meal!</div>
      </div>
    `;
    return;
  }

  container.innerHTML = planned.map(p => `
    <div class="entry-item" data-id="${p.id}">
      <div class="entry-icon plan-icon">${MEAL_ICONS[p.type] || '📝'}</div>
      <div class="entry-details">
        <div class="entry-name">${escapeHtml(p.name)}</div>
        <div class="entry-meta">${capitalize(p.type)}${p.portion ? ' · ' + escapeHtml(p.portion) : ''}</div>
      </div>
      <div class="entry-actions">
        <button class="entry-action-btn delete" onclick="deleteMealPlanItem('${p.id}')" aria-label="Delete planned meal">🗑</button>
      </div>
    </div>
  `).join('');
}

function addMealPlanItem() {
  const name = document.getElementById('plan-name').value.trim();
  const type = document.getElementById('plan-type').value;
  const portion = document.getElementById('plan-portion').value.trim();

  if (!name) { showToast('Please enter a meal name'); return; }

  if (!appData.mealPlan[currentMealPlanDay]) appData.mealPlan[currentMealPlanDay] = [];

  appData.mealPlan[currentMealPlanDay].push({
    id: generateId(),
    name, type, portion
  });

  saveData();
  closeModal('modal-mealplan');
  clearMealPlanForm();
  renderMealPlan();
  showToast('📋 Meal plan updated!');
}

function deleteMealPlanItem(id) {
  if (!appData.mealPlan[currentMealPlanDay]) return;
  appData.mealPlan[currentMealPlanDay] = appData.mealPlan[currentMealPlanDay].filter(p => p.id !== id);
  saveData();
  renderMealPlan();
  showToast('Plan item removed');
}

function clearMealPlanForm() {
  document.getElementById('plan-name').value = '';
  document.getElementById('plan-type').value = 'breakfast';
  document.getElementById('plan-portion').value = '';
}

// ==========================================
// Settings
// ==========================================
function renderSettings() {
  const s = appData.settings;
  document.getElementById('settings-name-display').textContent = s.name || 'Tap to set';
  document.getElementById('settings-goals-display').textContent =
    `${s.goalWorkouts || 3} exercises, ${s.goalMeals || 4} meals`;

  // Weight unit toggle
  const toggle = document.getElementById('toggle-unit');
  if (s.weightUnit === 'lbs') {
    toggle.classList.add('active');
  } else {
    toggle.classList.remove('active');
  }
}

function saveName() {
  const name = document.getElementById('setting-name-input').value.trim();
  appData.settings.name = name;
  saveData();
  closeModal('modal-name');
  renderSettings();
  showToast('Name saved!');
}

function saveGoals() {
  const goalW = parseInt(document.getElementById('goal-workouts').value) || 3;
  const goalM = parseInt(document.getElementById('goal-meals').value) || 4;
  appData.settings.goalWorkouts = goalW;
  appData.settings.goalMeals = goalM;
  saveData();
  closeModal('modal-goals');
  renderSettings();
  showToast('Goals updated!');
}

function toggleWeightUnit() {
  appData.settings.weightUnit = appData.settings.weightUnit === 'kg' ? 'lbs' : 'kg';
  saveData();
  renderSettings();
  if (currentTab === 'workout') renderWorkouts();
  showToast(`Weight unit: ${appData.settings.weightUnit.toUpperCase()}`);
}

function exportData() {
  const blob = new Blob([JSON.stringify(appData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `disciplinex-backup-${formatDateKey(new Date())}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('📤 Data exported!');
}

function importData() {
  document.getElementById('import-file-input').click();
}

function handleImportFile(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const imported = JSON.parse(e.target.result);
      if (imported.settings && imported.workouts !== undefined) {
        appData = imported;
        saveData();
        renderCurrentTab();
        showToast('📥 Data imported successfully!');
      } else {
        showToast('Invalid backup file');
      }
    } catch (err) {
      showToast('Error reading file');
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}

function clearAllData() {
  if (confirm('Are you sure you want to clear ALL data? This cannot be undone!')) {
    appData = getDefaultData();
    saveData();
    renderCurrentTab();
    showToast('🗑️ All data cleared');
  }
}

// ==========================================
// Modal Management
// ==========================================
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  modal.classList.add('active');
  // Focus first input
  setTimeout(() => {
    const input = modal.querySelector('input:not([type=file])');
    if (input) input.focus();
  }, 350);
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.remove('active');
}

// Close on backdrop click
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.classList.remove('active');
    }
  });
});

// ==========================================
// FAB Handler
// ==========================================
function handleFab() {
  switch (currentTab) {
    case 'workout':
      openModal('modal-workout');
      break;
    case 'diet':
      openModal('modal-meal');
      break;
    case 'mealplan':
      openModal('modal-mealplan');
      break;
  }
}

// ==========================================
// PWA Install Prompt
// ==========================================
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  document.getElementById('install-banner').classList.remove('hidden');
});

function handleInstall() {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  deferredInstallPrompt.userChoice.then((result) => {
    if (result.outcome === 'accepted') {
      showToast('🎉 App installed!');
    }
    deferredInstallPrompt = null;
    document.getElementById('install-banner').classList.add('hidden');
  });
}

window.addEventListener('appinstalled', () => {
  document.getElementById('install-banner').classList.add('hidden');
  deferredInstallPrompt = null;
});

// ==========================================
// Utility: HTML Escape
// ==========================================
function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ==========================================
// Event Listeners
// ==========================================
function initEventListeners() {
  // Tab bar
  document.querySelectorAll('.tab-item').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // Date navigation
  document.getElementById('date-prev').addEventListener('click', () => navigateDate(-1));
  document.getElementById('date-next').addEventListener('click', () => navigateDate(1));

  // FAB
  document.getElementById('fab-add').addEventListener('click', handleFab);

  // Quick actions (dashboard)
  document.getElementById('quick-workout').addEventListener('click', () => {
    switchTab('workout');
    setTimeout(() => openModal('modal-workout'), 350);
  });
  document.getElementById('quick-meal').addEventListener('click', () => {
    switchTab('diet');
    setTimeout(() => openModal('modal-meal'), 350);
  });

  // Workout modal
  document.getElementById('modal-workout-save').addEventListener('click', addWorkout);
  document.getElementById('modal-workout-cancel').addEventListener('click', () => closeModal('modal-workout'));

  // Meal modal
  document.getElementById('modal-meal-save').addEventListener('click', addMeal);
  document.getElementById('modal-meal-cancel').addEventListener('click', () => closeModal('modal-meal'));

  // Meal plan modal
  document.getElementById('modal-mealplan-save').addEventListener('click', addMealPlanItem);
  document.getElementById('modal-mealplan-cancel').addEventListener('click', () => closeModal('modal-mealplan'));

  // Name modal
  document.getElementById('setting-name').addEventListener('click', () => {
    document.getElementById('setting-name-input').value = appData.settings.name || '';
    openModal('modal-name');
  });
  document.getElementById('modal-name-save').addEventListener('click', saveName);
  document.getElementById('modal-name-cancel').addEventListener('click', () => closeModal('modal-name'));

  // Goals modal
  document.getElementById('setting-goals').addEventListener('click', () => {
    document.getElementById('goal-workouts').value = appData.settings.goalWorkouts || 3;
    document.getElementById('goal-meals').value = appData.settings.goalMeals || 4;
    openModal('modal-goals');
  });
  document.getElementById('modal-goals-save').addEventListener('click', saveGoals);
  document.getElementById('modal-goals-cancel').addEventListener('click', () => closeModal('modal-goals'));

  // Settings actions
  document.getElementById('toggle-unit').addEventListener('click', toggleWeightUnit);
  document.getElementById('setting-export').addEventListener('click', exportData);
  document.getElementById('setting-import').addEventListener('click', importData);
  document.getElementById('import-file-input').addEventListener('change', handleImportFile);
  document.getElementById('setting-clear').addEventListener('click', clearAllData);

  // Meal plan day tabs
  document.querySelectorAll('.day-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      currentMealPlanDay = tab.dataset.day;
      renderMealPlan();
    });
  });

  // Install
  document.getElementById('install-btn').addEventListener('click', handleInstall);

  // Enter key in modals
  document.querySelectorAll('.modal-sheet input').forEach(input => {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const modal = input.closest('.modal-overlay');
        const saveBtn = modal.querySelector('.btn-primary');
        if (saveBtn) saveBtn.click();
      }
    });
  });
}

// ==========================================
// Initialization
// ==========================================
function init() {
  updateDateDisplay();
  initEventListeners();
  renderDashboard();
  
  // Set current day as active meal plan tab
  const todayDayName = getDayOfWeek(new Date());
  currentMealPlanDay = todayDayName;
}

// Boot
document.addEventListener('DOMContentLoaded', init);
