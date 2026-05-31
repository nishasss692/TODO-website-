// SleekTask - Upgraded Client-side Logic (Obsidian Dark Theme & Spotlight Glow)

// Firebase modules will be loaded dynamically
let initializeApp, getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, GoogleAuthProvider, signInWithPopup;
let getFirestore, collection, doc, addDoc, deleteDoc, updateDoc, onSnapshot, getDocs, setDoc, getDoc;

// Firebase configuration credentials
const firebaseConfig = {
  apiKey: "AIzaSyAOpWwcoMFIwq6uFLhdG1m1tFt-T-fwD0k",
  authDomain: "todo-6776e.firebaseapp.com",
  projectId: "todo-6776e",
  storageBucket: "todo-6776e.firebasestorage.app",
  messagingSenderId: "380933464737",
  appId: "1:380933464737:web:d02b650208f18995bdc6e0",
  measurementId: "G-F5VZNRJNL2"
};

// Check if configuration is set or remains placeholder
function isFirebasePlaceholder(config) {
  return !config || 
         !config.apiKey || 
         config.apiKey.includes("YOUR_API_KEY") || 
         config.apiKey === "";
}

// Global state variables
let app, auth, db;
let firebaseEnabled = false;
let currentUser = null; // Stores authenticated/guest user details
let tasks = [];
let currentFilter = 'all'; // 'all', 'completed', or Tag Name ('Work', 'Design', etc)
let searchQuery = '';
let unsubscribeTasks = null;
let isSignUpMode = false; // Auth toggle state
let activeTheme = 'blue';
let activeMode = 'dark'; // 'dark' or 'light'
let currentSort = 'creation'; // 'creation', 'deadline', or 'priority'
function safeJSONParse(key, fallback) {
  try {
    const val = localStorage.getItem(key);
    if (!val || val === 'undefined') return fallback;
    return JSON.parse(val) || fallback;
  } catch (e) {
    console.warn(`Failed to parse ${key} from localStorage`, e);
    return fallback;
  }
}

function getLocalDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

let pomodoroHistory = safeJSONParse('pomodoroHistory', []);
let customTags = safeJSONParse('customTags', [
  { id: 'work', name: 'Work', color: '#3b82f6' },
  { id: 'design', name: 'Design', color: '#ec4899' },
  { id: 'code', name: 'Code', color: '#10b981' },
  { id: 'personal', name: 'Personal', color: '#f59e0b' }
]);
let userEXP = safeJSONParse('userEXP', 0);
let userLevel = safeJSONParse('userLevel', 1);

function gainEXP(amount) {
  userEXP += amount;
  let newLevel = Math.floor(userEXP / 100) + 1;
  if (newLevel > userLevel) {
    userLevel = newLevel;
    showNotification(`Level Up! You are now Level ${userLevel} 🎉`);
    localStorage.setItem('userLevel', userLevel);
  }
  localStorage.setItem('userEXP', userEXP);
  renderGamification();
}

function renderGamification() {
  const levelBadge = document.getElementById('level-badge');
  const expFill = document.getElementById('exp-fill');
  const expBarContainer = document.getElementById('exp-bar-container');
  
  if (levelBadge) levelBadge.textContent = `Lvl ${userLevel}`;
  if (expFill) {
    const progress = userEXP % 100;
    expFill.style.width = `${progress}%`;
  }
  if (expBarContainer) {
    expBarContainer.title = `${userEXP % 100} / 100 EXP`;
  }

  // Check if streak is broken (timezone-independent daily logic)
  const todayStr = getLocalDateString();
  const yesterdayStr = getLocalDateString(new Date(Date.now() - 86400000));
  const lastCompletionDate = localStorage.getItem('sleektask_last_completion_date');
  
  let streak = parseInt(localStorage.getItem('sleektask_streak') || '0');
  if (lastCompletionDate && lastCompletionDate !== todayStr && lastCompletionDate !== yesterdayStr) {
    streak = 0;
    localStorage.setItem('sleektask_streak', '0');
  }

  // Update Analytics streak and level labels
  const statStreakVal = document.getElementById('stat-streak-val');
  const statLevelVal = document.getElementById('stat-level-val');
  
  if (statStreakVal) {
    statStreakVal.textContent = `${streak} 🔥`;
  }
  if (statLevelVal) {
    if (streak > 5) {
      statLevelVal.textContent = `Level ${userLevel} Apprentice`;
    } else {
      statLevelVal.textContent = `Level ${userLevel} Novice`;
    }
  }
}

// Generate dynamic default dates (today, tomorrow, overdue) for the mockup preview
const todayISO = new Date().toISOString().split('T')[0];
const tomorrowISO = new Date(Date.now() + 86400000).toISOString().split('T')[0];
const overdueISO = new Date(Date.now() - 86400000 * 2).toISOString().split('T')[0];

const DEFAULT_TASKS = [
  { title: 'Review Project Proposal', completed: false, tag: 'Work', priority: 'High', dueDate: tomorrowISO },
  { title: 'Update Firebase Rules', completed: false, tag: 'Code', priority: 'Medium', dueDate: todayISO },
  { title: 'Design Landing Page', completed: true, tag: 'Design', priority: 'Low', dueDate: overdueISO, completedAt: overdueISO }
];

// DOM Elements
const authView = document.getElementById('auth-view');
const dashboardView = document.getElementById('dashboard-view');
const statusBanner = document.getElementById('firebase-status-banner');
const statusBannerText = document.getElementById('status-banner-text');

// Form elements
const authForm = document.getElementById('auth-form');
const authEmail = document.getElementById('auth-email');
const authPassword = document.getElementById('auth-password');
const btnTogglePassword = document.getElementById('btn-toggle-password');
const eyeIconVisible = document.getElementById('eye-icon-visible');
const eyeIconHidden = document.getElementById('eye-icon-hidden');
const authErrorBox = document.getElementById('auth-error-box');
const authTitle = document.getElementById('auth-title');
const authSubtitle = document.getElementById('auth-subtitle');
const authToggleLink = document.getElementById('auth-toggle-link');
const authToggleText = document.getElementById('auth-toggle-text');
const btnAuthSubmit = document.getElementById('btn-auth-submit');
const btnGuestAuth = document.getElementById('btn-guest-auth');
const btnGoogleAuth = document.getElementById('btn-google-auth');

// Dashboard elements
const taskListContainer = document.getElementById('task-list-container');
const addTaskForm = document.getElementById('add-task-form');
const newTaskInput = document.getElementById('new-task-input');
const taskTagSelect = document.getElementById('task-tag-select');
const taskPrioritySelect = document.getElementById('task-priority-select');
const taskDateInput = document.getElementById('task-date-input');
const taskCountText = document.getElementById('task-count-text');
const dateLabel = document.getElementById('current-date');
const searchInput = document.getElementById('search-input');
const progressFill = document.getElementById('progress-fill');
const progressPercent = document.getElementById('progress-percent');
const badgeAll = document.getElementById('badge-all');
const badgeCompleted = document.getElementById('badge-completed');

// Navigation links
const navTasks = document.getElementById('nav-tasks');
const navCompleted = document.getElementById('nav-completed');
const navSettings = document.getElementById('nav-settings');
const pageHeading = document.getElementById('page-heading');

// Modal Elements
const settingsModal = document.getElementById('settings-modal');
const settingsClose = document.getElementById('settings-close');
const btnResetMockup = document.getElementById('btn-reset-mockup');
const btnClearStorage = document.getElementById('btn-clear-storage');
const btnSignOut = document.getElementById('btn-signout');
const btnClearCompleted = document.getElementById('btn-clear-completed');

// Profile card elements
const userAvatar = document.getElementById('user-avatar');
const userName = document.getElementById('user-name');
const userRoleLabel = document.getElementById('user-role-label');

// Theme Mode elements
const btnToggleTheme = document.getElementById('btn-toggle-theme');
const btnToggleThemeAuth = document.getElementById('btn-toggle-theme-auth');
const btnToggleThemeSettings = document.getElementById('btn-toggle-theme-settings');
const themeIconSun = document.getElementById('theme-icon-sun');
const themeIconMoon = document.getElementById('theme-icon-moon');
const themeIconSunAuth = document.getElementById('theme-icon-sun-auth');
const themeIconMoonAuth = document.getElementById('theme-icon-moon-auth');

// Interactive & sorting elements
const sortSelect = document.getElementById('sort-select');
function playTactileSound(type) {
  return;
}
const audioToggle = document.getElementById('settings-audio-toggle');

// New Advanced Feature Elements
const pomodoroTime = document.getElementById('pomodoro-time');
const pomodoroStatus = document.getElementById('pomodoro-status');
const btnPomodoroStart = document.getElementById('btn-pomodoro-start');
const btnPomodoroReset = document.getElementById('btn-pomodoro-reset');
const statStreakVal = document.getElementById('stat-streak-val');
const statLevelVal = document.getElementById('stat-level-val');
const heatmapGrid = document.getElementById('heatmap-grid');
const settingsBgUrl = document.getElementById('settings-bg-url');

// Global state additions
let pomodoroInterval = null;
let pomodoroTimeLeft = 25 * 60;
let isPomodoroRunning = false;
let pomodoroMode = 'focus'; // 'focus' or 'break'
let draggedTaskId = null;

// Initialize Firebase & Mock fallbacks
async function initializeFirebaseConnection() {
  if (isFirebasePlaceholder(firebaseConfig)) {
    setupLocalMode();
  } else {
    try {
      const appModule = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js");
      initializeApp = appModule.initializeApp;
      
      const authModule = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js");
      getAuth = authModule.getAuth;
      signInWithEmailAndPassword = authModule.signInWithEmailAndPassword;
      createUserWithEmailAndPassword = authModule.createUserWithEmailAndPassword;
      signOut = authModule.signOut;
      onAuthStateChanged = authModule.onAuthStateChanged;
      GoogleAuthProvider = authModule.GoogleAuthProvider;
      signInWithPopup = authModule.signInWithPopup;
      
      const fsModule = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
      getFirestore = fsModule.getFirestore;
      collection = fsModule.collection;
      doc = fsModule.doc;
      addDoc = fsModule.addDoc;
      deleteDoc = fsModule.deleteDoc;
      updateDoc = fsModule.updateDoc;
      onSnapshot = fsModule.onSnapshot;
      getDocs = fsModule.getDocs;
      setDoc = fsModule.setDoc;
      getDoc = fsModule.getDoc;

      app = initializeApp(firebaseConfig);
      auth = getAuth(app);
      db = getFirestore(app);
      firebaseEnabled = true;
      setupFirebaseMode();
    } catch (err) {
      console.warn("Firebase startup failed, falling back to Local Mode:", err);
      setupLocalMode();
    }
  }
}

// Local mode initialization
function setupLocalMode() {
  firebaseEnabled = false;
  statusBanner.className = "status-banner local-mode show";
  statusBannerText.textContent = "Demo Mode: Local Storage active";
  
  // Load saved local settings
  loadThemePreference();

  // Initialize mock auth checks on session
  try {
    const savedSession = sessionStorage.getItem('sleektask_mock_user');
    if (savedSession && savedSession !== 'undefined') {
      currentUser = JSON.parse(savedSession);
      transitionToDashboard();
    }
  } catch (err) {
    console.warn("Failed to parse mock session:", err);
  }

  // Hide banner after 4 seconds
  setTimeout(() => {
    statusBanner.classList.remove('show');
  }, 4000);
}

// Live Firebase mode initialization
function setupFirebaseMode() {
  statusBanner.className = "status-banner firebase-mode show";
  statusBannerText.textContent = "Firebase Auth & Firestore live connected";
  
  // Listen for auth state change
  onAuthStateChanged(auth, (user) => {
    if (user) {
      currentUser = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || user.email.split('@')[0],
        isGuest: false
      };
      
      // Load user preferences from firestore
      syncUserThemeFirestore(user.uid);
      transitionToDashboard();
    } else {
      currentUser = null;
      if (unsubscribeTasks) {
        unsubscribeTasks();
        unsubscribeTasks = null;
      }
      // Don't boot out if we have a mock session active
      try {
        const savedSession = sessionStorage.getItem('sleektask_mock_user');
        if (savedSession && savedSession !== 'undefined') {
          currentUser = JSON.parse(savedSession);
          transitionToDashboard();
        } else {
          showView('auth');
        }
      } catch (err) {
        showView('auth');
      }
    }
  });

  setTimeout(() => {
    statusBanner.classList.remove('show');
  }, 4000);
}

// Show/Toggle between views
function showView(viewName) {
  if (viewName === 'auth') {
    authView.classList.remove('hidden');
    dashboardView.classList.add('hidden');
  } else {
    authView.classList.add('hidden');
    dashboardView.classList.remove('hidden');
  }
}

// Toggle Auth mode (Sign In vs Sign Up)
function toggleAuthMode(e) {
  e.preventDefault();
  isSignUpMode = !isSignUpMode;
  authErrorBox.classList.add('hidden');
  authEmail.value = '';
  authPassword.value = '';
  
  // Reset password visibility
  authPassword.setAttribute('type', 'password');
  eyeIconVisible.classList.remove('hidden');
  eyeIconHidden.classList.add('hidden');

  if (isSignUpMode) {
    authTitle.textContent = "Create Account";
    authSubtitle.textContent = "Get started with your custom tasks space.";
    btnAuthSubmit.textContent = "Create Account";
    authToggleText.innerHTML = `Already have an account? <a href="#" id="auth-toggle-link">Sign In</a>`;
  } else {
    authTitle.textContent = "Welcome to SleekTask";
    authSubtitle.textContent = "Sign in to sync your tasks across devices.";
    btnAuthSubmit.textContent = "Sign In";
    authToggleText.innerHTML = `Don't have an account? <a href="#" id="auth-toggle-link">Create Account</a>`;
  }

  // Rebind the click listener since we replaced the HTML content
  document.getElementById('auth-toggle-link').addEventListener('click', toggleAuthMode);
}

// Spotlight cursor border tracking
function initSpotlightGlow() {
  const card = document.getElementById('board-card');
  if (!card) return;

  card.addEventListener('mousemove', (e) => {
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Set custom coordinates property for CSS spotlight radial mask
    card.style.setProperty('--mouse-x', `${x}px`);
    card.style.setProperty('--mouse-y', `${y}px`);
  });
}

// Transition to dashboard view and pull tasks
function transitionToDashboard() {
  showView('dashboard');
  updateDate();
  
  // Set profile labels
  if (currentUser) {
    userName.textContent = currentUser.displayName;
    userRoleLabel.textContent = currentUser.isGuest ? 'Demo Account' : 'Synced User';
    
    // Set initials for avatar
    const initials = currentUser.displayName
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
    userAvatar.textContent = initials || 'US';
  }
  
  renderGamification();
  subscribeToTasks();
  initSpotlightGlow(); // Enable modern hover spotlight glow
}

// Task data synchronization
function subscribeToTasks() {
  if (unsubscribeTasks) {
    unsubscribeTasks();
    unsubscribeTasks = null;
  }

  if (firebaseEnabled && auth.currentUser) {
    const uid = auth.currentUser.uid;
    const userTasksCol = collection(db, 'users', uid, 'tasks');
    
    unsubscribeTasks = onSnapshot(userTasksCol, (snapshot) => {
      tasks = [];
      snapshot.forEach(doc => {
        tasks.push({ id: doc.id, ...doc.data() });
      });
      
      // Seed default tasks for first-time login
      if (tasks.length === 0 && !localStorage.getItem(`sleektask_seeded_${uid}`)) {
        seedDefaultTasksFirestore(uid);
      } else {
        render();
      }
    }, (err) => {
      console.warn("Firestore sync failed, fallback to local database:", err);
      loadLocalTasks();
      render();
    });
  } else {
    loadLocalTasks();
    render();
  }
}

// Seed default tasks in Firestore on first login
async function seedDefaultTasksFirestore(uid) {
  localStorage.setItem(`sleektask_seeded_${uid}`, 'true');
  const userTasksCol = collection(db, 'users', uid, 'tasks');
  try {
    for (const task of DEFAULT_TASKS) {
      await addDoc(userTasksCol, task);
    }
  } catch (err) {
    console.error("Failed to seed default tasks in Firestore:", err);
  }
}

// Load tasks from localStorage (Local mode)
function loadLocalTasks() {
  const userId = currentUser ? currentUser.uid : 'guest';
  const storedTasks = localStorage.getItem(`sleektask_tasks_${userId}`);
  if (storedTasks) {
    try {
      tasks = JSON.parse(storedTasks);
    } catch (e) {
      tasks = [...DEFAULT_TASKS];
    }
  } else {
    // Clone defaults
    tasks = DEFAULT_TASKS.map((t, idx) => ({ id: idx.toString(), ...t }));
    saveLocalTasks();
  }
}

// Save tasks to localStorage (Local mode)
function saveLocalTasks() {
  const userId = currentUser ? currentUser.uid : 'guest';
  localStorage.setItem(`sleektask_tasks_${userId}`, JSON.stringify(tasks));
}

// Submit Authentication (Firebase or Local Mock)
async function handleAuthSubmit(e) {
  e.preventDefault();
  const email = authEmail.value.trim();
  const password = authPassword.value;
  authErrorBox.classList.add('hidden');

  if (firebaseEnabled) {
    try {
      if (isSignUpMode) {
        await createUserWithEmailAndPassword(auth, email, password);
        showNotification("Account created successfully!");
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        showNotification("Successfully signed in!");
      }
    } catch (err) {
      console.error("Firebase auth error:", err);
      authErrorBox.classList.remove('hidden');
      authErrorBox.textContent = formatAuthErrorMessage(err.code);
    }
  } else {
    // Local Mock Auth Database Mode
    let accounts = safeJSONParse('sleektask_mock_accounts', []);
    
    if (isSignUpMode) {
      const existing = accounts.find(a => a.email === email);
      if (existing) {
        authErrorBox.classList.remove('hidden');
        authErrorBox.textContent = "An account with this email already exists.";
        return;
      }
      const newAcc = { uid: 'mock_' + Date.now(), email, password, displayName: email.split('@')[0] };
      accounts.push(newAcc);
      localStorage.setItem('sleektask_mock_accounts', JSON.stringify(accounts));
      
      currentUser = { uid: newAcc.uid, email: newAcc.email, displayName: newAcc.displayName, isGuest: false };
      sessionStorage.setItem('sleektask_mock_user', JSON.stringify(currentUser));
      showNotification("Account created (Local Session)!");
      transitionToDashboard();
    } else {
      const matched = accounts.find(a => a.email === email && a.password === password);
      if (!matched) {
        authErrorBox.classList.remove('hidden');
        authErrorBox.textContent = "Invalid email credentials or password.";
        return;
      }
      currentUser = { uid: matched.uid, email: matched.email, displayName: matched.displayName, isGuest: false };
      sessionStorage.setItem('sleektask_mock_user', JSON.stringify(currentUser));
      showNotification("Signed in successfully (Local Session)!");
      transitionToDashboard();
    }
  }
}

// Formats error code to human readable text
function formatAuthErrorMessage(code) {
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return "Incorrect email credentials or password.";
    case 'auth/email-already-in-use':
      return "An account with this email already exists.";
    case 'auth/weak-password':
      return "Weak Password. Must be at least 6 characters.";
    case 'auth/invalid-email':
      return "Please enter a valid email address.";
    default:
      return "Auth error: " + code.replace('auth/', '').replace(/-/g, ' ');
  }
}

// Sign out logic (Firebase or Mock)
async function handleSignOut() {
  if (firebaseEnabled) {
    try {
      await signOut(auth);
      showNotification("Signed out successfully.");
    } catch (err) {
      console.error("Sign out failed:", err);
    }
  } else {
    sessionStorage.removeItem('sleektask_mock_user');
    currentUser = null;
    showView('auth');
    showNotification("Demo session logged out.");
  }
}

// Guest Sign In trigger
function handleGuestSignIn() {
  try {
    currentUser = {
      uid: 'guest_user',
      email: 'guest@sleektask.dev',
      displayName: 'Guest Demo',
      isGuest: true
    };
    
    if (!firebaseEnabled || true) { // Always allow mock user in session storage for guest mode
      sessionStorage.setItem('sleektask_mock_user', JSON.stringify(currentUser));
    }
    
    showNotification("Entering guest workspace...");
    transitionToDashboard();
  } catch (err) {
    authErrorBox.classList.remove('hidden');
    authErrorBox.textContent = 'Error: ' + err.message;
    console.error(err);
  }
}

// Google Sign In trigger
async function handleGoogleSignIn() {
  authErrorBox.classList.add('hidden');
  if (firebaseEnabled) {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      currentUser = {
        uid: result.user.uid,
        email: result.user.email,
        displayName: result.user.displayName || result.user.email.split('@')[0],
        isGuest: false
      };
      showNotification("Signed in with Google!");
    } catch (err) {
      console.error("Google Auth error:", err);
      authErrorBox.classList.remove('hidden');
      authErrorBox.textContent = "Google Sign-in failed.";
    }
  } else {
    currentUser = {
      uid: 'mock_google_' + Date.now(),
      email: 'google.guest@gmail.com',
      displayName: 'Google Demo User',
      isGuest: false
    };
    sessionStorage.setItem('sleektask_mock_user', JSON.stringify(currentUser));
    showNotification("Signed in successfully (Mock Google)!");
    transitionToDashboard();
  }
}

// Add a new task
async function addTask(title, tag, priority, dueDate) {
  if (!title) return;

  // Smart Natural Language Dates
  let finalDate = dueDate;
  let finalTitle = title;
  const lowerTitle = finalTitle.toLowerCase();
  
  if (!finalDate) {
    if (lowerTitle.includes('tomorrow')) {
      const t = new Date();
      t.setDate(t.getDate() + 1);
      finalDate = t.toISOString().split('T')[0];
      finalTitle = finalTitle.replace(/tomorrow/gi, '').trim();
    } else if (lowerTitle.includes('today')) {
      const t = new Date();
      finalDate = t.toISOString().split('T')[0];
      finalTitle = finalTitle.replace(/today/gi, '').trim();
    } else if (lowerTitle.includes('next week')) {
      const t = new Date();
      t.setDate(t.getDate() + 7);
      finalDate = t.toISOString().split('T')[0];
      finalTitle = finalTitle.replace(/next week/gi, '').trim();
    }
  }

  const newTaskData = {
    title: finalTitle,
    completed: false,
    tag: tag || 'Work',
    priority: priority || 'Medium',
    dueDate: finalDate || '',
    order: Date.now(),
    subtasks: [],
    notes: '',
    recurrence: 'none' // none, daily, weekly
  };

  if (firebaseEnabled && auth.currentUser) {
    try {
      const uid = auth.currentUser.uid;
      const userTasksCol = collection(db, 'users', uid, 'tasks');
      await addDoc(userTasksCol, newTaskData);
    } catch (err) {
      console.error("Firestore write failed:", err);
      showNotification("Database error adding task.");
    }
  } else {
    const newTask = {
      id: Date.now().toString(),
      ...newTaskData
    };
    tasks.push(newTask);
    saveLocalTasks();
    render();
    
    const element = document.getElementById(`task-row-${newTask.id}`);
    if (element) {
      element.classList.add('fade-in');
    }
  }
  
  // Clear inputs
  newTaskInput.value = '';
  taskDateInput.value = '';
  taskPrioritySelect.value = 'Medium';
  playTactileSound('add');
}

// Toggle task checkbox
async function toggleTaskCompletion(taskId) {
  const task = tasks.find(t => t.id === taskId);
  if (!task) return;
  
  task.completed = !task.completed;
  if (task.completed) {
    task.completedAt = new Date().toISOString();
    gainEXP(10);
  } else {
    delete task.completedAt;
  }
  
  if (firebaseEnabled && auth.currentUser) {
    try {
      const uid = auth.currentUser.uid;
      const taskDoc = doc(db, 'users', uid, 'tasks', taskId);
      await updateDoc(taskDoc, { 
        completed: task.completed,
        completedAt: task.completed ? new Date().toISOString() : null
      });
      
      if (task.completed && task.recurrence && task.recurrence !== 'none') {
        const newDate = new Date(task.dueDate || new Date());
        if (task.recurrence === 'daily') newDate.setDate(newDate.getDate() + 1);
        if (task.recurrence === 'weekly') newDate.setDate(newDate.getDate() + 7);
        const newTaskData = { ...task, completed: false, dueDate: newDate.toISOString().split('T')[0] };
        delete newTaskData.id;
        await addDoc(collection(db, 'users', uid, 'tasks'), newTaskData);
      }
      if (task.completed) {
        updateStreakAndHeatmap();
      }
    } catch (err) {
      console.error("Firestore update failed:", err);
    }
  } else {
    if (task.completed && task.recurrence && task.recurrence !== 'none') {
      const newDate = new Date(task.dueDate || new Date());
      if (task.recurrence === 'daily') newDate.setDate(newDate.getDate() + 1);
      if (task.recurrence === 'weekly') newDate.setDate(newDate.getDate() + 7);
      const clonedTask = { ...task, id: Date.now().toString(), completed: false, dueDate: newDate.toISOString().split('T')[0] };
      tasks.push(clonedTask);
    }
    
    saveLocalTasks();
    
    const element = document.getElementById(`task-row-${taskId}`);
    if (element) {
      if (task.completed) {
        element.classList.add('checked');
      } else {
        element.classList.remove('checked');
      }
    }
    
    if (task.completed) {
      updateStreakAndHeatmap();
    }
    
    setTimeout(() => {
      render();
    }, 200);
  }
}

// Delete task row
async function deleteTask(id) {
  const element = document.getElementById(`task-row-${id}`);
  
  const removeAction = async () => {
    playTactileSound('delete');
    if (firebaseEnabled && auth.currentUser) {
      try {
        const uid = auth.currentUser.uid;
        const taskDoc = doc(db, 'users', uid, 'tasks', id);
        await deleteDoc(taskDoc);
      } catch (err) {
        console.error("Firestore delete failed:", err);
      }
    } else {
      tasks = tasks.filter(t => t.id !== id);
      saveLocalTasks();
      render();
    }
  };

  if (element) {
    element.classList.add('fade-out');
    element.addEventListener('animationend', removeAction, { once: true });
  } else {
    await removeAction();
  }
}

// Filter selector (handles both states and tag categories)
function setFilter(filter) {
  currentFilter = filter;
  
  // Auto-switch to tasks layout view
  const tasksView = document.getElementById('layout-tasks');
  if (tasksView && tasksView.classList.contains('hidden')) {
    document.querySelectorAll('.layout-view').forEach(view => {
      view.classList.add('hidden');
      view.classList.remove('active');
    });
    tasksView.classList.remove('hidden');
    tasksView.classList.add('active');
    
    // Clear the active state of other layout tabs
    document.querySelectorAll('.layout-tab').forEach(t => t.classList.remove('active'));
  }
  
  // Deactivate all sidebar items
  navTasks.classList.remove('active');
  navCompleted.classList.remove('active');
  document.querySelectorAll('.category-item').forEach(btn => btn.classList.remove('active'));

  if (filter === 'all') {
    navTasks.classList.add('active');
    pageHeading.textContent = 'My Tasks';
  } else if (filter === 'completed') {
    navCompleted.classList.add('active');
    pageHeading.textContent = 'Completed Tasks';
  } else if (filter === 'upcoming') {
    pageHeading.textContent = 'Upcoming Tasks';
  } else if (filter === 'priority-high') {
    pageHeading.textContent = 'High Priority Tasks';
  } else {
    // It's a tag filter
    const activeCategoryBtn = document.querySelector(`.category-item[data-tag-filter="${filter}"]`);
    if (activeCategoryBtn) {
      activeCategoryBtn.classList.add('active');
    }
    const tagObj = customTags.find(t => t.id === filter.toLowerCase());
    pageHeading.textContent = `${tagObj ? tagObj.name : filter} Tasks`;
  }
  
  render();
}

// Date parser helper to display relative tags
function getDueDateStatus(dueDateStr, completed) {
  if (!dueDateStr) return null;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const due = new Date(dueDateStr);
  due.setHours(0, 0, 0, 0);
  
  const diffTime = due.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) {
    return { text: 'Overdue', class: completed ? '' : 'overdue' };
  } else if (diffDays === 0) {
    return { text: 'Today', class: completed ? '' : 'today' };
  } else if (diffDays === 1) {
    return { text: 'Tomorrow', class: 'tomorrow' };
  } else {
    // Format to short date e.g., "May 22"
    const options = { month: 'short', day: 'numeric' };
    return { text: due.toLocaleDateString('en-US', options), class: 'future' };
  }
}

// Render dynamic elements
// Simulated AI Subtask Generation
async function generateAISubtasks(taskId) {
  const task = tasks.find(t => t.id === taskId);
  if (!task) return;
  
  // Create loading visual
  const row = document.getElementById(`task-row-${taskId}`);
  const btnAi = row.querySelector('.btn-ai-breakdown');
  if (btnAi) {
    btnAi.innerHTML = '⏳';
    btnAi.style.animation = 'aurora-float 1s infinite alternate';
  }
  showNotification("AI is analyzing your task...", "info");
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  // Generate generic subtasks based on title
  const words = task.title.split(' ');
  const generated = [
    { title: `Research best approaches for ${words[0] || 'this'}`, completed: false },
    { title: `Draft initial outline or prototype`, completed: false },
    { title: `Review and finalize deliverables`, completed: false }
  ];
  
  if (!task.subtasks) task.subtasks = [];
  task.subtasks = [...task.subtasks, ...generated];
  
  saveLocalTasks();
  render();
  showNotification("AI Breakdown complete! 🧠", "success");
}

function render() {
  renderGamification();
  taskListContainer.innerHTML = '';

  // Filter tasks list
  let filtered = tasks;
  
  if (currentFilter === 'all') {
    // Show all
  } else if (currentFilter === 'completed') {
    filtered = tasks.filter(t => t.completed);
  } else if (currentFilter === 'priority-high') {
    filtered = tasks.filter(t => t.priority === 'High' && !t.completed);
  } else if (currentFilter === 'upcoming') {
    const todayStr = getLocalDateString();
    const tomorrowStr = getLocalDateString(new Date(Date.now() + 86400000));
    filtered = tasks.filter(t => {
      if (t.completed || !t.dueDate) return false;
      return t.dueDate === todayStr || t.dueDate === tomorrowStr;
    });
  } else {
    // Filter by tag category (case-insensitive comparison)
    filtered = tasks.filter(t => t.tag && t.tag.toLowerCase() === currentFilter.toLowerCase());
  }

  // Search query filter
  if (searchQuery) {
    filtered = filtered.filter(t => 
      t.title.toLowerCase().includes(searchQuery) || 
      (t.tag && t.tag.toLowerCase().includes(searchQuery))
    );
  }

  // Sort tasks (active tasks first, then by selected sort criteria)
  const priorityWeight = { 'High': 3, 'Medium': 2, 'Low': 1 };
  filtered.sort((a, b) => {
    if (a.completed && !b.completed) return 1;
    if (!a.completed && b.completed) return -1;
    
    if (currentSort === 'deadline') {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate) - new Date(b.dueDate);
    } else if (currentSort === 'priority') {
      const weightA = priorityWeight[a.priority] || 2;
      const weightB = priorityWeight[b.priority] || 2;
      return weightB - weightA;
    } else {
      return a.id.localeCompare(b.id);
    }
  });

  // Calculate metrics
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.completed).length;
  const percentVal = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  
  if (progressFill) progressFill.style.width = `${percentVal}%`;
  if (progressPercent) progressPercent.textContent = `${percentVal}%`;

  const activeRemainingCount = tasks.filter(t => !t.completed).length;
  if (taskCountText) taskCountText.textContent = `${activeRemainingCount} task${activeRemainingCount !== 1 ? 's' : ''} remaining`;
  
  // Set badge values
  if (badgeAll) badgeAll.textContent = activeRemainingCount;
  if (badgeCompleted) badgeCompleted.textContent = completedTasks;
  
  // Tag counts (Only count active tasks, using case-insensitive check against customTags)
  customTags.forEach(tagObj => {
    const badgeEl = document.getElementById(`badge-${tagObj.id}`);
    if (badgeEl) {
      badgeEl.textContent = tasks.filter(t => t.tag && t.tag.toLowerCase() === tagObj.id && !t.completed).length;
    }
  });

  // Update SaaS Stats Grid Cards
  const progressValEl = document.getElementById('stat-progress-val');
  const progressSubEl = document.getElementById('stat-progress-sub');
  const progressRingFill = document.getElementById('stat-progress-ring');
  
  if (progressValEl) progressValEl.textContent = `${percentVal}%`;
  if (progressSubEl) progressSubEl.textContent = `${completedTasks} of ${totalTasks} task${totalTasks !== 1 ? 's' : ''} done`;
  
  if (progressRingFill) {
    const radius = 24;
    const circumference = 2 * Math.PI * radius; // 150.796
    const offset = circumference - (percentVal / 100) * circumference;
    progressRingFill.style.strokeDashoffset = offset;
  }
  
  const highValEl = document.getElementById('stat-high-val');
  if (highValEl) {
    const highCount = tasks.filter(t => t.priority === 'High' && !t.completed).length;
    highValEl.textContent = highCount;
  }
  
  const upcomingValEl = document.getElementById('stat-upcoming-val');
  if (upcomingValEl) {
    const todayStr = getLocalDateString();
    const tomorrowStr = getLocalDateString(new Date(Date.now() + 86400000));
    
    const upcomingCount = tasks.filter(t => {
      if (t.completed || !t.dueDate) return false;
      return t.dueDate === todayStr || t.dueDate === tomorrowStr;
    }).length;
    upcomingValEl.textContent = upcomingCount;
  }

  // Render Category Distribution
  const distributionContainer = document.getElementById('category-distribution-container');
  if (distributionContainer) {
    distributionContainer.innerHTML = customTags.map(tagObj => {
      const tagTasks = tasks.filter(t => t.tag && t.tag.toLowerCase() === tagObj.id);
      const total = tagTasks.length;
      const completed = tagTasks.filter(t => t.completed).length;
      const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
      
      return `
        <div class="category-dist-row" style="display: flex; flex-direction: column; gap: 6px; cursor: pointer;" onclick="setFilter('${tagObj.id}')">
          <div style="display: flex; justify-content: space-between; align-items: center; font-size: 13px;">
            <span style="font-weight: 600; display: flex; align-items: center; gap: 6px;">
              <span style="width: 8px; height: 8px; border-radius: 50%; background-color: ${tagObj.color};"></span>
              ${tagObj.name}
            </span>
            <span style="color: var(--color-text-muted); font-size: 12px;">${completed} / ${total} tasks (${percent}%)</span>
          </div>
          <div style="height: 6px; background: rgba(255,255,255,0.05); border-radius: 3px; overflow: hidden; position: relative;">
            <div style="height: 100%; width: ${percent}%; background-color: ${tagObj.color}; border-radius: 3px; transition: width 0.4s ease;"></div>
          </div>
        </div>
      `;
    }).join('');
  }

  // Update Activity Heatmap dynamically
  renderHeatmap();

  if (filtered.length === 0) {
    renderEmptyState();
    renderPomodoroChart();
    return;
  }

  // Populate list
  filtered.forEach((task, index) => {
    const row = document.createElement('div');
    row.className = `task-row stagger-item ${task.completed ? 'checked' : ''}`;
    row.id = `task-row-${task.id}`;
    row.style.animationDelay = `${index * 0.05}s`;
    
    // Drag and Drop Logic
    row.draggable = true;
    row.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', task.id);
      row.classList.add('dragging');
    });
    row.addEventListener('dragend', () => {
      row.classList.remove('dragging');
      document.querySelectorAll('.task-row').forEach(r => {
        r.style.borderTop = '';
        r.style.borderBottom = '';
      });
    });
    row.addEventListener('dragover', (e) => {
      e.preventDefault();
      const rect = row.getBoundingClientRect();
      const mid = rect.top + rect.height / 2;
      if (e.clientY < mid) {
        row.style.borderTop = '2px solid var(--color-primary)';
        row.style.borderBottom = '';
      } else {
        row.style.borderBottom = '2px solid var(--color-primary)';
        row.style.borderTop = '';
      }
    });
    row.addEventListener('dragleave', () => {
      row.style.borderTop = '';
      row.style.borderBottom = '';
    });
    row.addEventListener('drop', (e) => {
      e.preventDefault();
      row.style.borderTop = '';
      row.style.borderBottom = '';
      const draggedId = e.dataTransfer.getData('text/plain');
      if (draggedId && draggedId !== task.id) {
        // Move draggedId in tasks array
        const fromIndex = tasks.findIndex(t => t.id === draggedId);
        let toIndex = tasks.findIndex(t => t.id === task.id);
        if (fromIndex !== -1 && toIndex !== -1) {
          const rect = row.getBoundingClientRect();
          const mid = rect.top + rect.height / 2;
          if (e.clientY >= mid) {
            toIndex++; // drop below
          }
          const [movedTask] = tasks.splice(fromIndex, 1);
          // if fromIndex was before toIndex, removing it shifted toIndex down by 1
          if (fromIndex < toIndex) toIndex--;
          tasks.splice(toIndex, 0, movedTask);
          saveLocalTasks();
          currentSort = 'custom'; // switch to custom sort so it doesn't immediately snap back
          const sortSelect = document.getElementById('task-sort-select');
          if (sortSelect) sortSelect.value = 'custom';
          render();
        }
      }
    });

    // Tag Pill
    const tagId = task.tag ? task.tag.toLowerCase() : 'work';
    const tagObj = customTags.find(t => t.id === tagId) || { name: task.tag || 'Work', color: '#3b82f6' };
    const tagHTML = `<span class="task-tag" style="background-color: ${tagObj.color}20; color: ${tagObj.color}; border-color: ${tagObj.color}40;">${tagObj.name}</span>`;

    // Priority Pill
    const priority = task.priority || 'Medium';
    const priorityClass = `priority-${priority.toLowerCase()}`;
    const priorityHTML = `<span class="task-priority-pill ${priorityClass}">${priority}</span>`;

    // Due Date Pill
    let dueDateHTML = '';
    const dateStatus = getDueDateStatus(task.dueDate, task.completed);
    if (dateStatus) {
      const dateClass = dateStatus.class ? `task-date-pill ${dateStatus.class}` : 'task-date-pill';
      dueDateHTML = `
        <span class="${dateClass}">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width:11px; height:11px;">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
          </svg>
          ${dateStatus.text}
        </span>
      `;
    }

    let subtasksHTML = '';
    if (task.subtasks && task.subtasks.length > 0) {
      subtasksHTML = '<ul class="subtasks-list">';
      task.subtasks.forEach((st, idx) => {
        subtasksHTML += `<li><label><input type="checkbox" class="subtask-cb" data-task-id="${task.id}" data-subtask-idx="${idx}" ${st.completed ? 'checked' : ''}> ${escapeHTML(st.title)}</label></li>`;
      });
      subtasksHTML += '</ul>';
    }
    
    // Add Subtask Inline Form
    subtasksHTML += `
      <form class="add-subtask-form" data-task-id="${task.id}" style="margin-top: 8px; display: flex; gap: 8px;">
        <input type="text" class="subtask-input dropdown-control" placeholder="Add step..." style="flex: 1;" required>
        <button type="submit" class="btn-secondary" style="padding: 4px 12px; font-size: 11px;">Add</button>
      </form>
    `;
    
    let notesHTML = '';
    if (task.notes) {
      notesHTML = `<div class="task-notes">${escapeHTML(task.notes)}</div>`;
    }

    let sharedAvatarHTML = '';
    if (task.sharedWith) {
      sharedAvatarHTML = `<div class="shared-avatar" title="Shared with ${escapeHTML(task.sharedWith)}" style="width: 20px; height: 20px; border-radius: 50%; background: var(--color-primary); color: white; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: bold; margin-left: 8px; box-shadow: 0 0 4px var(--color-primary-alpha); cursor: help;">${escapeHTML(task.sharedWith.substring(0, 2).toUpperCase())}</div>`;
    }

    row.innerHTML = `
      <div class="task-left" style="flex-wrap: wrap; flex: 1; min-width: 0;">
        <div style="display: flex; align-items: center; width: 100%;">
          <div class="drag-handle" title="Drag to reorder">☰</div>
          <label class="checkbox-container">
            <input type="checkbox" ${task.completed ? 'checked' : ''} data-id="${task.id}">
            <span class="checkmark"></span>
          </label>
          <div class="task-content-group">
            <span class="task-title">${escapeHTML(task.title)}</span>
            ${tagHTML}
            ${priorityHTML}
            ${dueDateHTML}
            ${sharedAvatarHTML}
          </div>
        </div>
        ${notesHTML}
        ${subtasksHTML}
      </div>
      <div class="task-actions" style="display: flex; gap: 6px; align-self: flex-start; margin-top: 4px;">
        <button class="btn-ai-breakdown" data-id="${task.id}" title="AI Auto-Breakdown 🧠" style="background: none; border: none; cursor: pointer; font-size: 16px; opacity: 0.6; transition: 0.2s;">🧠</button>
        <button class="btn-invite" data-id="${task.id}" title="Share Task" style="background: none; border: none; cursor: pointer; font-size: 16px; opacity: 0.6; transition: 0.2s;">🔗</button>
        <button class="btn-delete" data-id="${task.id}" title="Delete task" style="background: none; border: none; cursor: pointer; color: var(--color-error); opacity: 0.6; transition: 0.2s; width: 24px; height: 24px; padding: 0;">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.2" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
          </svg>
        </button>
      </div>
    `;

    // Drag and Drop Event Listeners
    row.draggable = true;
    row.addEventListener('dragstart', function(e) {
      draggedTaskId = this.dataset.id || task.id;
      e.dataTransfer.effectAllowed = 'move';
      this.style.opacity = '0.4';
    });
    row.addEventListener('dragover', function(e) {
      e.preventDefault();
      this.classList.add('drag-over');
    });
    row.addEventListener('dragleave', function(e) {
      this.classList.remove('drag-over');
    });
    row.addEventListener('drop', function(e) {
      e.stopPropagation();
      this.classList.remove('drag-over');
      const targetId = task.id;
      if (draggedTaskId && draggedTaskId !== targetId) {
        const srcIndex = tasks.findIndex(t => t.id === draggedTaskId);
        const destIndex = tasks.findIndex(t => t.id === targetId);
        if(srcIndex !== -1 && destIndex !== -1) {
          const srcTask = tasks[srcIndex];
          tasks.splice(srcIndex, 1);
          tasks.splice(destIndex, 0, srcTask);
          saveLocalTasks();
          render();
        }
      }
    });
    row.addEventListener('dragend', function(e) {
      this.style.opacity = '1';
    });

    row.querySelector('input[type="checkbox"]').addEventListener('change', (e) => {
      const isChecked = e.target.checked;
      if (isChecked) {
        const rect = e.target.getBoundingClientRect();
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;
        addConfetti(x, y);
      }
      toggleTaskCompletion(task.id);
    });
    row.querySelector('.btn-delete').addEventListener('click', () => deleteTask(task.id));
    
    // AI Breakdown Button
    const btnAi = row.querySelector('.btn-ai-breakdown');
    if (btnAi) {
      btnAi.addEventListener('click', () => {
        generateAISubtasks(task.id);
      });
    }

    // Invite Button
    const btnInvite = row.querySelector('.btn-invite');
    if (btnInvite) {
      btnInvite.addEventListener('click', () => {
        const email = prompt("Enter email to share this task with:");
        if (email) {
          task.sharedWith = email;
          saveLocalTasks();
          render();
          showNotification(`Task shared with ${email}`, 'success');
        }
      });
    }

    // Subtask event listeners
    row.querySelectorAll('.subtask-cb').forEach(cb => {
      cb.addEventListener('change', (e) => {
        const tId = e.target.getAttribute('data-task-id');
        const sIdx = parseInt(e.target.getAttribute('data-subtask-idx'));
        const t = tasks.find(x => x.id === tId);
        if (t && t.subtasks && t.subtasks[sIdx]) {
          t.subtasks[sIdx].completed = e.target.checked;
          saveLocalTasks();
          render();
        }
      });
    });
    const addForm = row.querySelector('.add-subtask-form');
    if (addForm) {
      addForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const tId = e.target.getAttribute('data-task-id');
        const input = e.target.querySelector('.subtask-input');
        const val = input.value.trim();
        if (val) {
          const t = tasks.find(x => x.id === tId);
          if (t) {
            if (!t.subtasks) t.subtasks = [];
            t.subtasks.push({ title: val, completed: false });
            saveLocalTasks();
            render();
          }
        }
      });
    }

    taskListContainer.appendChild(row);
  });
  
  renderPomodoroChart();
  
  if (typeof applyTiltEffect === 'function') {
    setTimeout(applyTiltEffect, 100);
  }
}

// Render empty state placeholder
function renderEmptyState() {
  let message = 'No tasks matches found.';
  if (searchQuery) {
    message = `No tasks matching "${escapeHTML(searchQuery)}"`;
  } else if (currentFilter === 'completed') {
    message = 'No completed tasks. Work hard!';
  } else if (currentFilter !== 'all') {
    message = `No tasks in category "${escapeHTML(currentFilter)}"`;
  } else {
    message = 'All tasks complete! Add a new one below.';
  }

  taskListContainer.innerHTML = `
    <div class="empty-state">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="empty-icon">
        <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
      </svg>
      <p>${message}</p>
    </div>
  `;
}

// Accent Color Theme Selector logic
function applyTheme(themeName) {
  activeTheme = themeName;
  document.body.className = `theme-${themeName}`;
  
  // Highlight active dot in Settings Modal
  document.querySelectorAll('.theme-dot').forEach(dot => {
    if (dot.getAttribute('data-theme') === themeName) {
      dot.classList.add('active');
    } else {
      dot.classList.remove('active');
    }
  });

  // Save selection
  if (firebaseEnabled && auth.currentUser) {
    const uid = auth.currentUser.uid;
    setDoc(doc(db, 'users', uid, 'settings', 'preferences'), { theme: themeName }, { merge: true })
      .catch(e => console.error("Firestore theme save error:", e));
  } else {
    localStorage.setItem('sleektask_theme', themeName);
  }
}

// Load local theme on startup
function loadThemePreference() {
  const localTheme = localStorage.getItem('sleektask_theme') || 'blue';
  applyTheme(localTheme);
}

// Theme Mode toggle logic
function applyThemeMode(mode) {
  activeMode = mode;
  if (mode === 'light') {
    document.body.classList.add('light-mode');
    if (themeIconSun) themeIconSun.classList.add('hidden');
    if (themeIconMoon) themeIconMoon.classList.remove('hidden');
    if (themeIconSunAuth) themeIconSunAuth.classList.add('hidden');
    if (themeIconMoonAuth) themeIconMoonAuth.classList.remove('hidden');
  } else {
    document.body.classList.remove('light-mode');
    if (themeIconSun) themeIconSun.classList.remove('hidden');
    if (themeIconMoon) themeIconMoon.classList.add('hidden');
    if (themeIconSunAuth) themeIconSunAuth.classList.remove('hidden');
    if (themeIconMoonAuth) themeIconMoonAuth.classList.add('hidden');
  }
  localStorage.setItem('sleektask_mode', mode);
}

function loadThemeModePreference() {
  const localMode = localStorage.getItem('sleektask_mode') || 'dark';
  applyThemeMode(localMode);
}

// Synchronize profile preferences from Firestore
async function syncUserThemeFirestore(uid) {
  try {
    const prefDoc = await getDoc(doc(db, 'users', uid, 'settings', 'preferences'));
    if (prefDoc.exists() && prefDoc.data().theme) {
      applyTheme(prefDoc.data().theme);
    } else {
      loadThemePreference();
    }
  } catch (err) {
    loadThemePreference();
  }
}

// Display custom notifications (modern toasts)
function showNotification(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const notification = document.createElement('div');
  notification.className = `toast ${type}`;
  notification.textContent = message;
  container.appendChild(notification);

  // Trigger reflow for animation
  void notification.offsetWidth;
  notification.classList.add('show');

  setTimeout(() => {
    notification.classList.remove('show');
    notification.addEventListener('transitionend', () => {
      notification.remove();
    });
  }, 3000);
}

// Update current date label helper
function updateDate() {
  if (!dateLabel) return;
  const options = { weekday: 'long', month: 'long', day: 'numeric' };
  dateLabel.textContent = new Date().toLocaleDateString('en-US', options);
}

// Event Bindings setup
function setupEventListeners() {
  // Auth view toggles and forms
  if (authToggleLink) authToggleLink.addEventListener('click', toggleAuthMode);
  
  if (btnTogglePassword) {
    btnTogglePassword.addEventListener('click', () => {
      const isPassword = authPassword.getAttribute('type') === 'password';
      authPassword.setAttribute('type', isPassword ? 'text' : 'password');
      if (isPassword) {
        eyeIconVisible.classList.add('hidden');
        eyeIconHidden.classList.remove('hidden');
      } else {
        eyeIconVisible.classList.remove('hidden');
        eyeIconHidden.classList.add('hidden');
      }
    });
  }

  // Theme mode toggles
  const handleToggleMode = () => {
    const newMode = activeMode === 'dark' ? 'light' : 'dark';
    applyThemeMode(newMode);
    showNotification(`Theme mode changed to ${newMode}!`);
  };

  if (btnToggleTheme) btnToggleTheme.addEventListener('click', handleToggleMode);
  if (btnToggleThemeAuth) btnToggleThemeAuth.addEventListener('click', handleToggleMode);
  if (btnToggleThemeSettings) btnToggleThemeSettings.addEventListener('click', handleToggleMode);

  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      currentSort = e.target.value;
      render();
    });
  }

  if (audioToggle) {
    audioToggle.addEventListener('change', (e) => {
      isAudioEnabled = e.target.checked;
      localStorage.setItem('sleektask_audio', isAudioEnabled);
    });
  }

  if (authForm) authForm.addEventListener('submit', handleAuthSubmit);
  if (btnGuestAuth) btnGuestAuth.addEventListener('click', handleGuestSignIn);
  if (btnGoogleAuth) btnGoogleAuth.addEventListener('click', handleGoogleSignIn);

  // Task form submissions
  if (addTaskForm) {
    addTaskForm.addEventListener('submit', (e) => {
      e.preventDefault();
      addTask(
        newTaskInput.value.trim(), 
        taskTagSelect.value,
        taskPrioritySelect.value,
        taskDateInput.value
      );
    });
  }

  // Task querying
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.toLowerCase();
      render();
    });
  }

  // Filter tabs bindings
  if (navTasks) navTasks.addEventListener('click', () => setFilter('all'));
  if (navCompleted) navCompleted.addEventListener('click', () => setFilter('completed'));

  // Sidebar Category link bindings (using event delegation for dynamic categories)
  const categoriesContainer = document.getElementById('sidebar-categories-container');
  if (categoriesContainer) {
    categoriesContainer.addEventListener('click', (e) => {
      const btn = e.target.closest('.category-item');
      if (btn) {
        const tag = btn.getAttribute('data-tag-filter');
        setFilter(tag);
      }
    });
  }

  // Layout Tab bindings
  document.querySelectorAll('.layout-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      const layoutName = btn.getAttribute('data-layout');
      
      // Update Active Navigation Item
      document.querySelectorAll('.layout-tab').forEach(t => t.classList.remove('active'));
      if (navTasks) navTasks.classList.remove('active');
      if (navCompleted) navCompleted.classList.remove('active');
      document.querySelectorAll('.category-item').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');

      // Hide all layout views
      document.querySelectorAll('.layout-view').forEach(view => {
        view.classList.add('hidden');
        view.classList.remove('active');
      });

      // Show selected layout
      const targetView = document.getElementById(`layout-${layoutName}`);
      if (targetView) {
        targetView.classList.remove('hidden');
        targetView.classList.add('active');
      }
      
      // Update Heading if needed
      if(layoutName === 'tasks') pageHeading.textContent = currentFilter === 'all' ? 'My Tasks' : (currentFilter === 'completed' ? 'Completed Tasks' : `${currentFilter} Tasks`);
      if(layoutName === 'focus') pageHeading.textContent = 'Focus Mode';
      if(layoutName === 'analytics') {
        pageHeading.textContent = 'Analytics Dashboard';
        renderGamification();
        render(); // Force full stats and charts update
      }
    });
  });

  // Theme dot selectors bindings
  document.querySelectorAll('.theme-dot').forEach(dot => {
    dot.addEventListener('click', () => {
      const theme = dot.getAttribute('data-theme');
      applyTheme(theme);
      showNotification(`Theme changed to ${theme}!`);
    });
  });

  // Analytics Dashboard Stat Cards Click Handlers (filtering shortcuts)
  const progressCard = document.getElementById('stat-completion-card');
  if (progressCard) {
    progressCard.style.cursor = 'pointer';
    progressCard.addEventListener('click', () => setFilter('completed'));
  }
  const highCard = document.getElementById('stat-high-card');
  if (highCard) {
    highCard.style.cursor = 'pointer';
    highCard.addEventListener('click', () => setFilter('priority-high'));
  }
  const upcomingCard = document.getElementById('stat-upcoming-card');
  if (upcomingCard) {
    upcomingCard.style.cursor = 'pointer';
    upcomingCard.addEventListener('click', () => setFilter('upcoming'));
  }

  // Settings modal
  if (navSettings) navSettings.addEventListener('click', () => settingsModal.classList.add('open'));
  if (settingsClose) settingsClose.addEventListener('click', () => settingsModal.classList.remove('open'));
  if (settingsModal) {
    settingsModal.addEventListener('click', (e) => {
      if (e.target === settingsModal) {
        settingsModal.classList.remove('open');
      }
    });
  }

  // Reset to default tasks
  if (btnResetMockup) {
    btnResetMockup.addEventListener('click', async () => {
      if (firebaseEnabled && auth.currentUser) {
        const uid = auth.currentUser.uid;
        const userTasksCol = collection(db, 'users', uid, 'tasks');
        try {
          const querySnapshot = await getDocs(userTasksCol);
          for (const doc of querySnapshot.docs) {
            await deleteDoc(doc.ref);
          }
          for (const task of DEFAULT_TASKS) {
            await addDoc(userTasksCol, task);
          }
          showNotification("Mockup tasks reset in database!");
        } catch (err) {
          console.error(err);
        }
      } else {
        tasks = DEFAULT_TASKS.map((t, idx) => ({ id: idx.toString(), ...t }));
        saveLocalTasks();
        render();
        showNotification("Mockup tasks reset locally!");
      }
      if (settingsModal) settingsModal.classList.add('open');
    });
  }

  // Wipe data store
  if (btnClearStorage) {
    btnClearStorage.addEventListener('click', async () => {
      if (firebaseEnabled && auth.currentUser) {
        const uid = auth.currentUser.uid;
        const userTasksCol = collection(db, 'users', uid, 'tasks');
        try {
          const querySnapshot = await getDocs(userTasksCol);
          for (const doc of querySnapshot.docs) {
            await deleteDoc(doc.ref);
          }
          showNotification("All database tasks wiped!");
        } catch (err) {
          console.error(err);
        }
      } else {
        tasks = [];
        saveLocalTasks();
        render();
        showNotification("All local tasks wiped!");
      }
      if (settingsModal) settingsModal.classList.add('open');
    });
  }

  // Sign out triggers
  if (btnSignOut) {
    btnSignOut.addEventListener('click', async () => {
      if (firebaseEnabled) {
        await signOut(auth);
      } else {
        sessionStorage.removeItem('sleektask_mock_user');
        currentUser = null;
        showView('auth');
      }
    });
  }

  // Clear completed tasks
  if (btnClearCompleted) {
    btnClearCompleted.addEventListener('click', async () => {
      const completedList = tasks.filter(t => t.completed);
      if (completedList.length === 0) return;

      if (firebaseEnabled && auth.currentUser) {
        const uid = auth.currentUser.uid;
        for (const task of completedList) {
          await deleteDoc(doc(db, 'users', uid, 'tasks', task.id));
        }
        showNotification("Cleared completed tasks from Firestore.");
      } else {
        tasks = tasks.filter(t => !t.completed);
        saveLocalTasks();
        render();
        showNotification("Cleared completed tasks locally.");
      }
    });
  }
}

// Simple HTML escaping helper to prevent XSS
function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}

// ==========================================================================
// TACTILE INTERACTIVE ENGINES (WEB AUDIO SYNTH & CONFETTI CANVAS PARTICLES)
// ==========================================================================
let audioCtx = null;
let isAudioEnabled = true;


// Confetti Particle Canvas Engine
const canvas = document.getElementById('confetti-canvas');
let ctx = null;
if (canvas) {
  ctx = canvas.getContext('2d');
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();
}

function resizeCanvas() {
  if (canvas) {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
}

let particles = [];
function addConfetti(x, y) {
  if (!canvas || !ctx) return;
  const colors = ['#3b82f6', '#a855f7', '#10b981', '#f97316', '#ec4899', '#eab308'];
  for (let i = 0; i < 40; i++) {
    particles.push({
      x: x,
      y: y,
      vx: (Math.random() - 0.5) * 8,
      vy: (Math.random() - 0.7) * 12 - 3,
      radius: Math.random() * 4 + 3,
      color: colors[Math.floor(Math.random() * colors.length)],
      alpha: 1,
      decay: Math.random() * 0.02 + 0.015,
      gravity: 0.35,
      tilt: Math.random() * 10
    });
  }
  if (particles.length === 40) {
    requestAnimationFrame(updateConfetti);
  }
}

function updateConfetti() {
  if (!canvas || !ctx || particles.length === 0) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.vy += p.gravity;
    p.x += p.vx;
    p.y += p.vy;
    p.alpha -= p.decay;
    p.tilt += 0.1;
    
    if (p.alpha <= 0 || p.x < 0 || p.x > canvas.width || p.y > canvas.height) {
      particles.splice(i, 1);
      continue;
    }
    
    ctx.save();
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  
  if (particles.length > 0) {
    requestAnimationFrame(updateConfetti);
  }
}

function loadAudioPreference() {
  const saved = localStorage.getItem('sleektask_audio');
  if (saved !== null) {
    isAudioEnabled = saved === 'true';
    if (audioToggle) {
      audioToggle.checked = isAudioEnabled;
    }
  }
}

// ==========================================================================
// ADVANCED FEATURES: POMODORO, BACKGROUND, SHORTCUTS, STREAKS
// ==========================================================================

let pomodoroMaxTime = 25 * 60;

function formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

const playIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style="width: 32px; height: 32px; margin-left: 4px;"><path fill-rule="evenodd" d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653Z" clip-rule="evenodd" /></svg>`;
const pauseIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" style="width: 32px; height: 32px;"><path fill-rule="evenodd" d="M6.75 5.25a.75.75 0 0 1 .75-.75H9a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75H7.5a.75.75 0 0 1-.75-.75V5.25Zm7.5 0A.75.75 0 0 1 15 4.5h1.5a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75H15a.75.75 0 0 1-.75-.75V5.25Z" clip-rule="evenodd" /></svg>`;

function updatePomodoroUI() {
  if (pomodoroTime) pomodoroTime.textContent = formatTime(pomodoroTimeLeft);
  
  const ring = document.getElementById('pomodoro-progress-ring');
  if (ring) {
    const percentage = pomodoroTimeLeft / pomodoroMaxTime;
    const offset = 289 - (percentage * 289);
    ring.style.strokeDashoffset = offset;
  }
}

function togglePomodoro() {
  if (isPomodoroRunning) {
    clearInterval(pomodoroInterval);
    isPomodoroRunning = false;
    if (btnPomodoroStart) btnPomodoroStart.innerHTML = playIconSvg;
    if (pomodoroStatus) pomodoroStatus.textContent = 'Paused';
  } else {
    isPomodoroRunning = true;
    if (btnPomodoroStart) btnPomodoroStart.innerHTML = pauseIconSvg;
    if (pomodoroStatus) pomodoroStatus.textContent = 'Focusing...';
    
    if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      Notification.requestPermission();
    }
    
    pomodoroInterval = setInterval(() => {
      pomodoroTimeLeft--;
      updatePomodoroUI();
      if (pomodoroTimeLeft <= 0) {
        clearInterval(pomodoroInterval);
        isPomodoroRunning = false;
        
        // Log to history if it was a 25-minute focus session
        if (pomodoroMode === 'focus') {
          pomodoroHistory.push({
            date: new Date().toISOString(),
            duration: 25 * 60
          });
          localStorage.setItem('pomodoroHistory', JSON.stringify(pomodoroHistory));
          gainEXP(25);
          showNotification("Focus session complete! +25 EXP", "success");
          render(); // Update stats and charts immediately!
          
          pomodoroMode = 'break';
          pomodoroMaxTime = 5 * 60;
          pomodoroTimeLeft = pomodoroMaxTime;
          if (pomodoroStatus) pomodoroStatus.textContent = "Short Break";
          
          if (Notification.permission === 'granted') {
            new Notification('Focus Session Complete!', {
              body: 'Great job! Time for a 5 minute break.',
              silent: true
            });
          }
        } else {
          pomodoroMode = 'focus';
          pomodoroMaxTime = 25 * 60;
          pomodoroTimeLeft = pomodoroMaxTime;
          if (pomodoroStatus) pomodoroStatus.textContent = "Ready to focus";
          
          if (Notification.permission === 'granted') {
            new Notification('Break Complete!', {
              body: 'Time to focus again.',
              silent: true
            });
          }
        }
        
        if (btnPomodoroStart) btnPomodoroStart.innerHTML = playIconSvg;
        updatePomodoroUI();
      }
    }, 1000);
  }
}

function resetPomodoro() {
  clearInterval(pomodoroInterval);
  isPomodoroRunning = false;
  pomodoroMode = 'focus';
  pomodoroMaxTime = 25 * 60;
  pomodoroTimeLeft = pomodoroMaxTime;
  if (btnPomodoroStart) btnPomodoroStart.innerHTML = playIconSvg;
  if (pomodoroStatus) pomodoroStatus.textContent = 'Ready to focus';
  updatePomodoroUI();
}

if (btnPomodoroStart) btnPomodoroStart.addEventListener('click', togglePomodoro);
if (btnPomodoroReset) btnPomodoroReset.addEventListener('click', resetPomodoro);

function loadCustomBackground() {
  const dynamicBgEnabled = localStorage.getItem('sleektask_dynamic_bg') === 'true';
  const bgToggle = document.getElementById('settings-bg-toggle');
  const auroraContainer = document.getElementById('aurora-bg-container');
  
  if (bgToggle) bgToggle.checked = dynamicBgEnabled;
  if (auroraContainer) {
    if (dynamicBgEnabled) {
      auroraContainer.classList.add('active');
    } else {
      auroraContainer.classList.remove('active');
    }
  }
}

const bgToggle = document.getElementById('settings-bg-toggle');
if (bgToggle) {
  bgToggle.addEventListener('change', (e) => {
    const isEnabled = e.target.checked;
    localStorage.setItem('sleektask_dynamic_bg', isEnabled);
    loadCustomBackground();
    showNotification(isEnabled ? 'Dynamic Background Enabled' : 'Dynamic Background Disabled');
  });
}

window.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
  
  if (e.key === 'n' || e.key === 'N') {
    e.preventDefault();
    if (newTaskInput) newTaskInput.focus();
  } else if (e.key === '/') {
    e.preventDefault();
    if (searchInput) searchInput.focus();
  } else if (e.key === 'd' || e.key === 'D') {
    e.preventDefault();
    if (btnToggleTheme) btnToggleTheme.click();
  }
});

function renderHeatmap() {
  const heatmapGrid = document.getElementById('heatmap-grid');
  if (!heatmapGrid) return;
  heatmapGrid.innerHTML = '';
  
  // Generate the last 30 days
  const last30Days = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    last30Days.push(d.toISOString().split('T')[0]);
  }
  
  // Group tasks completed by day
  const dailyCompletions = {};
  last30Days.forEach(day => dailyCompletions[day] = 0);
  
  tasks.forEach(task => {
    if (task.completed && task.completedAt) {
      const day = task.completedAt.split('T')[0];
      if (dailyCompletions[day] !== undefined) {
        dailyCompletions[day]++;
      }
    }
  });
  
  last30Days.forEach((day, index) => {
    const box = document.createElement('div');
    box.style.width = '12px';
    box.style.height = '12px';
    box.style.borderRadius = '2px';
    
    const count = dailyCompletions[day];
    const parts = day.split('-');
    const dateObj = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    const dateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    
    // Set box background color based on completions count
    if (count === 0) {
      box.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
      box.title = `No tasks completed on ${dateStr}`;
    } else {
      box.style.backgroundColor = 'var(--color-primary)';
      box.style.opacity = count === 1 ? '0.4' : (count === 2 ? '0.7' : '1.0');
      box.title = `${count} task${count !== 1 ? 's' : ''} completed on ${dateStr}`;
      box.style.boxShadow = `0 0 6px var(--color-primary)`;
    }
    
    // Today is index 29 (the last box)
    if (index === 29) {
      box.id = 'heatmap-today-box';
      box.style.border = '1.5px solid #f59e0b'; // Gold border for Today
    }
    
    heatmapGrid.appendChild(box);
  });
}

function renderPomodoroChart() {
  const chartContainer = document.getElementById('pomodoro-chart');
  if (!chartContainer) return;
  
  chartContainer.innerHTML = '';
  
  // Group history by last 7 days (timezone-neutral)
  const last7Days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    last7Days.push(getLocalDateString(d));
  }
  
  const dailyTotals = {};
  last7Days.forEach(day => dailyTotals[day] = 0);
  
  if (Array.isArray(pomodoroHistory)) {
    pomodoroHistory.forEach(session => {
      if (session && session.date) {
        try {
          const sessionDate = new Date(session.date);
          if (!isNaN(sessionDate.getTime())) {
            const day = getLocalDateString(sessionDate);
            if (dailyTotals[day] !== undefined) {
              const duration = parseInt(session.duration) || 0;
              // Convert seconds to minutes if duration is large, else treat as minutes
              const mins = duration > 120 ? Math.round(duration / 60) : duration;
              dailyTotals[day] += mins;
            }
          }
        } catch (e) {
          console.warn("Failed to parse session date:", session.date, e);
        }
      }
    });
  }
  
  const maxMins = Math.max(60, ...Object.values(dailyTotals)); // Minimum scale of 60m
  
  last7Days.forEach(day => {
    const mins = dailyTotals[day];
    const heightPercent = Math.max(5, (mins / maxMins) * 100);
    const parts = day.split('-');
    const dateObj = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dateObj.getDay()];
    
    chartContainer.innerHTML += `
      <div class="pomodoro-bar-wrapper">
        <div class="pomodoro-bar" style="height: ${heightPercent}%;" title="${mins} mins"></div>
        <span class="pomodoro-bar-label">${dayName}</span>
      </div>
    `;
  });
}

function updateStreakAndHeatmap() {
  const todayStr = getLocalDateString();
  const yesterdayStr = getLocalDateString(new Date(Date.now() - 86400000));
  
  let streak = parseInt(localStorage.getItem('sleektask_streak') || '0');
  const lastCompletionDate = localStorage.getItem('sleektask_last_completion_date');
  
  if (lastCompletionDate === todayStr) {
    // Already completed a task today, streak is maintained
  } else if (lastCompletionDate === yesterdayStr) {
    // Completed a task yesterday, completing today increments it
    streak++;
    localStorage.setItem('sleektask_streak', streak);
    localStorage.setItem('sleektask_last_completion_date', todayStr);
  } else {
    // Break in streak (last completion was before yesterday) or first completion
    streak = 1;
    localStorage.setItem('sleektask_streak', streak);
    localStorage.setItem('sleektask_last_completion_date', todayStr);
  }
  
  // Highlight today's box in the heatmap
  const todayBox = document.getElementById('heatmap-today-box');
  if (todayBox) {
    todayBox.style.backgroundColor = 'var(--color-primary)';
    todayBox.style.opacity = '1';
    todayBox.style.transform = 'scale(1.2)';
    setTimeout(() => { todayBox.style.transform = 'scale(1)'; }, 200);
  }
  
  renderGamification();
}

function renderTags() {
  if (!Array.isArray(customTags)) {
    customTags = [
      { id: 'work', name: 'Work', color: '#3b82f6' },
      { id: 'design', name: 'Design', color: '#ec4899' },
      { id: 'code', name: 'Code', color: '#10b981' },
      { id: 'personal', name: 'Personal', color: '#f59e0b' }
    ];
  }

  const selectEl = document.getElementById('task-tag-select');
  const listEl = document.getElementById('settings-tags-list');
  const categoriesContainer = document.getElementById('sidebar-categories-container');
  
  if (selectEl) {
    selectEl.innerHTML = customTags.map(t => `<option value="${t.id}">${t.name}</option>`).join('');
  }
  
  if (categoriesContainer) {
    categoriesContainer.innerHTML = customTags.map(t => `
      <button class="nav-item category-item ${currentFilter === t.id ? 'active' : ''}" data-tag-filter="${t.id}">
        <span class="category-dot" style="background-color: ${t.color};"></span>
        <span class="nav-label">${t.name}</span>
        <span class="badge" id="badge-${t.id}">0</span>
      </button>
    `).join('');
  }

  if (listEl) {
    listEl.innerHTML = customTags.map(t => `
      <div class="task-tag" style="background-color: ${t.color}20; color: ${t.color}; border-color: ${t.color}40; display: flex; align-items: center; gap: 4px;">
        ${t.name}
        <button class="btn-icon btn-delete-tag" data-tag-id="${t.id}" style="width: 16px; height: 16px; min-width: 16px; margin: 0; padding: 0;">&times;</button>
      </div>
    `).join('');
    
    listEl.querySelectorAll('.btn-delete-tag').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = e.target.getAttribute('data-tag-id');
        customTags = customTags.filter(t => t.id !== id);
        localStorage.setItem('customTags', JSON.stringify(customTags));
        renderTags();
        render();
      });
    });
  }
}

// Boot applications
function boot() {
  try {
    initializeFirebaseConnection();
  } catch (err) {
    console.error("Firebase Initialization failed, falling back to local mode:", err);
    firebaseEnabled = false;
  }
  
  try {
    loadThemeModePreference();
    loadAudioPreference();
    loadCustomBackground();
    renderHeatmap();
    renderTags();
    setupEventListeners();
    updateDate();
  } catch (err) {
    console.error("App initialization failed:", err);
  }
  if (document.getElementById('add-tag-form')) {
    document.getElementById('add-tag-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('new-tag-name').value.trim();
      const color = document.getElementById('new-tag-color').value;
      if (name) {
        const id = name.toLowerCase().replace(/[^a-z0-9]/g, '-');
        if (!customTags.find(t => t.id === id)) {
          customTags.push({ id, name, color });
          localStorage.setItem('customTags', JSON.stringify(customTags));
          renderTags();
          document.getElementById('new-tag-name').value = '';
        }
      }
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
// ==========================================
// NEW UI ENHANCEMENTS (Spotlight, Tilt, Fullscreen)
// ==========================================

// 1. Interactive Spotlight Cursor
const spotlight = document.getElementById('cursor-spotlight');
if (spotlight) {
  document.addEventListener('mousemove', (e) => {
    spotlight.style.transform = `translate(${e.clientX - 200}px, ${e.clientY - 200}px)`;
  });
}

// 2. Fullscreen Toggle
const btnFullscreen = document.getElementById('btn-fullscreen');
if (btnFullscreen) {
  btnFullscreen.addEventListener('click', () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  });
}

// 3. 3D Tilt Effect for Bento Cards
function applyTiltEffect() {
  const cards = document.querySelectorAll('.bento-card, .stat-card');
  cards.forEach(card => {
    card.classList.add('tilt-card');
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      
      const rotateX = ((y - centerY) / centerY) * -5; // max 5 deg
      const rotateY = ((x - centerX) / centerX) * 5;  // max 5 deg
      
      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
    });
    
    card.addEventListener('mouseleave', () => {
      card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale3d(1, 1, 1)';
    });
  });
}

// Apply tilt after a short delay to ensure elements are rendered
setTimeout(applyTiltEffect, 500);
