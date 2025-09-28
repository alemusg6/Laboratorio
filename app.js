const API_URL = 'http://localhost:4000';
let token = null;
let userId = null;

// ===== Registro =====
document.getElementById('btn-register').addEventListener('click', async () => {
  const name = document.getElementById('reg-name').value;
  const email = document.getElementById('reg-email').value;
  const password = document.getElementById('reg-password').value;

  try {
    const res = await fetch(`${API_URL}/users/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });

    const data = await res.json();
    if (res.ok) {
      alert(`Usuario registrado: ${data.user.name}`);
      token = data.token;
      userId = data.user.id;
      showTasksSection();
      fetchTasks();
    } else {
      alert(data.error);
    }
  } catch (err) {
    console.error(err);
  }
});

// ===== Login =====
document.getElementById('btn-login').addEventListener('click', async () => {
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;

  try {
    const res = await fetch(`${API_URL}/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();
    if (res.ok) {
      alert(`Bienvenido: ${data.user.name}`);
      token = data.token;
      userId = data.user.id;
      showTasksSection();
      fetchTasks();
    } else {
      alert(data.error);
    }
  } catch (err) {
    console.error(err);
  }
});

// ===== Crear tarea =====
document.getElementById('btn-create-task').addEventListener('click', async () => {
  const title = document.getElementById('task-title').value;
  const description = document.getElementById('task-desc').value;

  try {
    const res = await fetch(`${API_URL}/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ title, description })
    });

    const data = await res.json();
    if (res.ok) {
      fetchTasks();
    } else {
      alert(data.error);
    }
  } catch (err) {
    console.error(err);
  }
});

// ===== Listar tareas =====
async function fetchTasks() {
  const list = document.getElementById('tasks-list');
  list.innerHTML = '';
  try {
    const res = await fetch(`${API_URL}/tasks/${userId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const tasks = await res.json();
    tasks.forEach(task => {
      const li = document.createElement('li');
      li.textContent = `${task.title} [${task.status}]`;
      const btn = document.createElement('button');
      btn.textContent = 'Avanzar estado';
      btn.onclick = () => advanceTask(task.id);
      li.appendChild(btn);
      list.appendChild(li);
    });
  } catch (err) {
    console.error(err);
  }
}

// ===== Avanzar estado =====
async function advanceTask(id) {
  try {
    const res = await fetch(`${API_URL}/tasks/${id}/status`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    fetchTasks();
  } catch (err) {
    console.error(err);
  }
}

// ===== Logout =====
document.getElementById('btn-logout').addEventListener('click', () => {
  token = null;
  userId = null;
  document.getElementById('tasks-section').style.display = 'none';
  document.getElementById('login-section').style.display = 'block';
  document.getElementById('register-section').style.display = 'block';
});

function showTasksSection() {
  document.getElementById('tasks-section').style.display = 'block';
  document.getElementById('login-section').style.display = 'none';
  document.getElementById('register-section').style.display = 'none';
}
