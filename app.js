// SleekTask - Upgraded Client-side Logic (Obsidian Dark Theme & Spotlight Glow)

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
  getFirestore, 
  collection, 
  doc, 
  addDoc, 
  deleteDoc, 
  updateDoc, 
  onSnapshot,
  getDocs,
  setDoc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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

// Generate dynamic default dates (today, tomorrow, overdue) for the mockup preview
const todayISO = new Date().toISOString().split('T')[0];
const tomorrowISO = new Date(Date.now() + 86400000).toISOString().split('T')[0];
const overdueISO = new Date(Date.now() - 86400000 * 2).toISOString().split('T')[0];

const DEFAULT_TASKS = [
  { title: 'Review Project Proposal', completed: false, tag: 'Work', priority: 'High', dueDate: tomorrowISO },
  { title: 'Update Firebase Rules', completed: false, tag: 'Code', priority: 'Medium', dueDate: todayISO },
  { title: 'Design Landing Page', completed: true, tag: 'Design', priority: 'Low', dueDate: overdueISO }
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
const audioToggle = document.getElementById('settings-audio-toggle');

// Initialize Firebase & Mock fallbacks
function initializeFirebaseConnection() {
  if (isFirebasePlaceholder(firebaseConfig)) {
    setupLocalMode();
  } else {
    try {
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
  const savedSession = sessionStorage.getItem('sleektask_mock_user');
  if (savedSession) {
    currentUser = JSON.parse(savedSession);
    transitionToDashboard();
  } else {
    showView('auth');
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
      showView('auth');
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
    let accounts = JSON.parse(localStorage.getItem('sleektask_mock_accounts') || '[]');
    
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
  currentUser = {
    uid: 'guest_user',
    email: 'guest@sleektask.dev',
    displayName: 'Guest Demo',
    isGuest: true
  };
  
  if (!firebaseEnabled) {
    sessionStorage.setItem('sleektask_mock_user', JSON.stringify(currentUser));
  }
  
  showNotification("Entering guest workspace...");
  transitionToDashboard();
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

  const newTaskData = {
    title: title,
    completed: false,
    tag: tag || 'Work',
    priority: priority || 'Medium',
    dueDate: dueDate || ''
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
async function toggleTask(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;

  if (firebaseEnabled && auth.currentUser) {
    try {
      const uid = auth.currentUser.uid;
      const taskDoc = doc(db, 'users', uid, 'tasks', id);
      await updateDoc(taskDoc, { completed: !task.completed });
    } catch (err) {
      console.error("Firestore update failed:", err);
    }
  } else {
    task.completed = !task.completed;
    saveLocalTasks();
    
    const element = document.getElementById(`task-row-${id}`);
    if (element) {
      if (task.completed) {
        element.classList.add('checked');
      } else {
        element.classList.remove('checked');
      }
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
  } else {
    // It's a tag filter
    const activeCategoryBtn = document.querySelector(`.category-item[data-tag-filter="${filter}"]`);
    if (activeCategoryBtn) {
      activeCategoryBtn.classList.add('active');
    }
    pageHeading.textContent = `${filter} Tasks`;
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
function render() {
  taskListContainer.innerHTML = '';

  // Filter tasks list
  let filtered = tasks;
  
  if (currentFilter === 'all') {
    // Show all
  } else if (currentFilter === 'completed') {
    filtered = tasks.filter(t => t.completed);
  } else {
    // Filter by tag category
    filtered = tasks.filter(t => t.tag === currentFilter);
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
  
  progressFill.style.width = `${percentVal}%`;
  progressPercent.textContent = `${percentVal}%`;

  const activeRemainingCount = tasks.filter(t => !t.completed).length;
  taskCountText.textContent = `${activeRemainingCount} task${activeRemainingCount !== 1 ? 's' : ''} remaining`;
  
  // Set badge values
  badgeAll.textContent = activeRemainingCount;
  badgeCompleted.textContent = completedTasks;
  
  // Tag counts (Only count active tasks)
  const tagList = ['Work', 'Design', 'Code', 'Personal'];
  tagList.forEach(tagName => {
    const badgeEl = document.getElementById(`badge-${tagName.toLowerCase()}`);
    if (badgeEl) {
      badgeEl.textContent = tasks.filter(t => t.tag === tagName && !t.completed).length;
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
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today.getTime() + 86400000);
    tomorrow.setHours(0, 0, 0, 0);
    
    const upcomingCount = tasks.filter(t => {
      if (t.completed || !t.dueDate) return false;
      const due = new Date(t.dueDate);
      due.setHours(0, 0, 0, 0);
      return due.getTime() === today.getTime() || due.getTime() === tomorrow.getTime();
    }).length;
    upcomingValEl.textContent = upcomingCount;
  }

  if (filtered.length === 0) {
    renderEmptyState();
    return;
  }

  // Populate list
  filtered.forEach(task => {
    const row = document.createElement('div');
    row.className = `task-row ${task.completed ? 'checked' : ''}`;
    row.id = `task-row-${task.id}`;

    // Tag Pill
    const tagClass = `tag-${task.tag ? task.tag.toLowerCase() : 'work'}`;
    const tagHTML = `<span class="task-tag ${tagClass}">${task.tag || 'Work'}</span>`;

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

    row.innerHTML = `
      <div class="task-left">
        <label class="checkbox-container">
          <input type="checkbox" ${task.completed ? 'checked' : ''} data-id="${task.id}">
          <span class="checkmark"></span>
        </label>
        <div class="task-content-group">
          <span class="task-title">${escapeHTML(task.title)}</span>
          ${tagHTML}
          ${priorityHTML}
          ${dueDateHTML}
        </div>
      </div>
      <button class="btn-delete" data-id="${task.id}" title="Delete task">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.2" stroke="currentColor" class="trash-icon">
          <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
        </svg>
      </button>
    `;

    row.querySelector('input[type="checkbox"]').addEventListener('change', (e) => {
      const isChecked = e.target.checked;
      if (isChecked) {
        const rect = e.target.getBoundingClientRect();
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;
        addConfetti(x, y);
        playTactileSound('complete');
      } else {
        playTactileSound('click');
      }
      toggleTask(task.id);
    });
    row.querySelector('.btn-delete').addEventListener('click', () => deleteTask(task.id));

    taskListContainer.appendChild(row);
  });
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

// Display custom notifications (monochromatic toasts)
function showNotification(message) {
  const existingNotification = document.querySelector('.toast-notification');
  if (existingNotification) {
    existingNotification.remove();
  }

  const notification = document.createElement('div');
  notification.className = 'toast-notification';
  notification.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    background-color: var(--color-text-main);
    color: var(--bg-app);
    padding: 14px 24px;
    border-radius: var(--radius-md);
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
    font-size: 13px;
    font-weight: 700;
    z-index: 1000;
    opacity: 0;
    transform: translateY(10px);
    transition: all var(--transition-normal);
    border: 1px solid rgba(255, 255, 255, 0.1);
  `;
  
  notification.textContent = message;
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.opacity = '1';
    notification.style.transform = 'translateY(0)';
  }, 10);

  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transform = 'translateY(10px)';
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
  authToggleLink.addEventListener('click', toggleAuthMode);
  
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

  authForm.addEventListener('submit', handleAuthSubmit);
  btnGuestAuth.addEventListener('click', handleGuestSignIn);
  btnGoogleAuth.addEventListener('click', handleGoogleSignIn);

  // Task form submissions
  addTaskForm.addEventListener('submit', (e) => {
    e.preventDefault();
    addTask(
      newTaskInput.value.trim(), 
      taskTagSelect.value,
      taskPrioritySelect.value,
      taskDateInput.value
    );
  });

  // Task querying
  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value.toLowerCase();
    render();
  });

  // Filter tabs bindings
  navTasks.addEventListener('click', () => setFilter('all'));
  navCompleted.addEventListener('click', () => setFilter('completed'));

  // Sidebar Category link bindings
  document.querySelectorAll('.category-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const tag = btn.getAttribute('data-tag-filter');
      setFilter(tag);
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

  // Settings modal
  navSettings.addEventListener('click', () => settingsModal.classList.add('open'));
  settingsClose.addEventListener('click', () => settingsModal.classList.remove('open'));
  settingsModal.addEventListener('click', (e) => {
    if (e.target === settingsModal) {
      settingsModal.classList.remove('open');
    }
  });

  // Reset to default tasks
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
    settingsModal.classList.remove('open');
  });

  // Wipe data store
  btnClearStorage.addEventListener('click', async () => {
    if (firebaseEnabled && auth.currentUser) {
      const uid = auth.currentUser.uid;
      const userTasksCol = collection(db, 'users', uid, 'tasks');
      try {
        const querySnapshot = await getDocs(userTasksCol);
        for (const doc of querySnapshot.docs) {
          await deleteDoc(doc.ref);
        }
        showNotification("Wiped all database tasks!");
      } catch (err) {
        console.error(err);
      }
    } else {
      tasks = [];
      saveLocalTasks();
      render();
      showNotification("Wiped all local tasks!");
    }
    settingsModal.classList.remove('open');
  });

  // Sign out triggers
  btnSignOut.addEventListener('click', handleSignOut);

  // Clear completed tasks
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

function playTactileSound(type) {
  if (!isAudioEnabled) return;
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    
    const now = audioCtx.currentTime;
    
    if (type === 'complete') {
      const osc1 = audioCtx.createOscillator();
      const osc2 = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(523.25, now);
      osc1.frequency.exponentialRampToValueAtTime(783.99, now + 0.12);
      
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(1046.5, now + 0.06);
      
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      
      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(audioCtx.destination);
      
      osc1.start(now);
      osc2.start(now + 0.06);
      osc1.stop(now + 0.35);
      osc2.stop(now + 0.35);
      
    } else if (type === 'add') {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(450, now + 0.08);
      
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      
      osc.start(now);
      osc.stop(now + 0.12);
      
    } else if (type === 'delete') {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(380, now);
      osc.frequency.exponentialRampToValueAtTime(120, now + 0.15);
      
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      
      osc.start(now);
      osc.stop(now + 0.2);
      
    } else if (type === 'click') {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(200, now + 0.03);
      
      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      
      osc.start(now);
      osc.stop(now + 0.05);
    }
  } catch (err) {
    console.warn("Web Audio failed", err);
  }
}

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

// Boot applications
function boot() {
  try {
    initializeFirebaseConnection();
    loadThemeModePreference();
    loadAudioPreference();
    setupEventListeners();
    updateDate();
  } catch (err) {
    console.error("Initialization failed:", err);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
