import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js';
import {
  getAuth,
  signOut,
  onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js';

const firebaseConfig = {
  apiKey: "AIzaSyAOpWwcoMFIwq6uFLhdG1m1tFt-T-fwD0k",
  authDomain: "todo-6776e.firebaseapp.com",
  projectId: "todo-6776e",
  storageBucket: "todo-6776e.firebasestorage.app",
  messagingSenderId: "380933464737",
  appId: "1:380933464737:web:d02b650208f18995bdc6e0",
  measurementId: "G-F5VZNRJNL2"
};

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);

const taskList = document.getElementById('task-list');
const taskInput = document.getElementById('task-input');
const addTaskForm = document.getElementById('add-task-form');
const taskCount = document.getElementById('task-count');
const pageTitle = document.getElementById('page-title');
const currentDate = document.getElementById('current-date');
const userEmail = document.getElementById('user-email');
const emptyState = document.getElementById('empty-state');
const navAllTasks = document.getElementById('nav-all-tasks');
const navCompletedTasks = document.getElementById('nav-completed-tasks');
const btnSignOut = document.getElementById('btn-dashboard-signout');

let tasks = [];
let currentFilter = 'all';

function init() {
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      window.location.href = 'index.html';
      return;
    }
    userEmail.textContent = user.email;
    loadTasks();
    setupEventListeners();
    updateDate();
  });
}

function setupEventListeners() {
  addTaskForm.addEventListener('submit', handleAddTask);
  navAllTasks.addEventListener('click', () => setFilter('all'));
  navCompletedTasks.addEventListener('click', () => setFilter('completed'));
  btnSignOut.addEventListener('click', handleSignOut);
}

function handleAddTask(e) {
  e.preventDefault();
  const title = taskInput.value.trim();
  if (!title) return;

  const task = {
    id: Date.now().toString(),
    title,
    completed: false
  };

  tasks.push(task);
  saveTasks();
  taskInput.value = '';
  render();
}

function handleToggleTask(id) {
  const task = tasks.find(t => t.id === id);
  if (task) {
    task.completed = !task.completed;
    saveTasks();
    render();
  }
}

function handleDeleteTask(id) {
  tasks = tasks.filter(t => t.id !== id);
  saveTasks();
  render();
}

function handleSignOut() {
  signOut(auth).then(() => {
    window.location.href = 'index.html';
  });
}

function setFilter(filter) {
  currentFilter = filter;

  if (filter === 'all') {
    navAllTasks.classList.add('active');
    navCompletedTasks.classList.remove('active');
    pageTitle.textContent = 'My Tasks';
  } else {
    navAllTasks.classList.remove('active');
    navCompletedTasks.classList.add('active');
    pageTitle.textContent = 'Completed';
  }

  render();
}

function loadTasks() {
  const stored = localStorage.getItem(`sleektask_${auth.currentUser.uid}`);
  tasks = stored ? JSON.parse(stored) : [];
}

function saveTasks() {
  localStorage.setItem(`sleektask_${auth.currentUser.uid}`, JSON.stringify(tasks));
}

function updateDate() {
  const options = { weekday: 'short', month: 'short', day: 'numeric' };
  currentDate.textContent = new Date().toLocaleDateString('en-US', options);
}

function render() {
  const filtered = tasks.filter(t => {
    if (currentFilter === 'all') return true;
    return t.completed;
  });

  taskList.innerHTML = '';
  emptyState.style.display = filtered.length === 0 ? 'flex' : 'none';

  filtered.forEach(task => {
    const row = document.createElement('div');
    row.className = `task-row ${task.completed ? 'completed' : ''}`;

    row.innerHTML = `
      <label class="task-checkbox">
        <input type="checkbox" ${task.completed ? 'checked' : ''} />
        <span class="checkmark"></span>
      </label>
      <span class="task-title">${escapeHTML(task.title)}</span>
      <button class="btn-task-delete" title="Delete task">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="icon">
          <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
        </svg>
      </button>
    `;

    const checkbox = row.querySelector('.task-checkbox input');
    checkbox.addEventListener('change', () => handleToggleTask(task.id));

    const deleteBtn = row.querySelector('.btn-task-delete');
    deleteBtn.addEventListener('click', () => handleDeleteTask(task.id));

    taskList.appendChild(row);
  });

  const remaining = tasks.filter(t => !t.completed).length;
  taskCount.textContent = `${remaining} task${remaining !== 1 ? 's' : ''}`;
}

function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[char]));
}

init();
