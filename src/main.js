import "./style.css";

/* ================= LOGIN VIEW ================= */
document.querySelector("#app").innerHTML = `
<div class="login-container">

  <h1>Project Management</h1>
  <p>Corporate Project Dashboard</p>

  <form id="loginForm">

    <input type="email" id="email" placeholder="Email" required>
    <input type="password" id="password" placeholder="Password" required>

    <button type="submit">Sign In</button>

  </form>

  <p id="message"></p>

</div>
`;

/* ================= AUTO LOGIN ================= */
const currentUser = JSON.parse(localStorage.getItem("user"));
if (currentUser) renderDashboard(currentUser);

/* ❗ AGREGADO: protección de sesión */
if (!currentUser && !document.getElementById("loginForm")) {
  location.reload();
}

/* ================= LOGIN ================= */
const loginForm = document.getElementById("loginForm");

if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const message = document.getElementById("message");

    try {
      const res = await fetch("http://localhost:3000/users");
      const users = await res.json();

      const userFound = users.find(
        u => u.email === email && u.password === password
      );

      if (userFound) {
        localStorage.setItem("user", JSON.stringify(userFound));
        renderDashboard(userFound);
      } else {
        message.textContent = "Invalid email or password";
        message.style.color = "red";
      }

    } catch (err) {
      message.textContent = "Server error";
      message.style.color = "red";
    }
  });
}

/* ================= GET PROJECTS ================= */
async function getProjects() {
  const res = await fetch("http://localhost:3000/projects");
  return await res.json();
}

/* ================= DASHBOARD ================= */
async function renderDashboard(user) {

  const projects = await getProjects();

  let filtered = projects;

  if (user.role === "collaborator") {
    filtered = projects.filter(p => p.assignedTo === user.id);
  }

  const total = filtered.length;
  const completed = filtered.filter(p => p.status === "Completed").length;
  const inProgress = filtered.filter(p => p.status === "In Progress").length;

  document.querySelector("#app").innerHTML = `
  
  <div class="dashboard">

    <h1>Welcome ${user.name}</h1>
    <h2>Role: ${user.role}</h2>

    <div class="dashboard-card stats">
      <p>Total Projects: ${total}</p>
      <p>Completed: ${completed}</p>
      <p>In Progress: ${inProgress}</p>
    </div>

    ${user.role === "manager" ? `<button id="addProjectBtn">+ Add Project</button>` : ""}

    <div id="formContainer"></div>

    ${filtered.map(p => `
      <div class="dashboard-card">

        <h4>${p.name}</h4>

        <p class="text">${p.description}</p>

        <p class="status ${p.status.toLowerCase().replace(" ", "-")}">
          Status: ${p.status}
        </p>

        <!-- ❗ AGREGADO: fecha -->
        <p>Created: ${p.createdAt || "N/A"}</p>

        <div class="actions">
          <button class="edit-btn" data-id="${p.id}">Edit</button>
          <button class="delete-btn" data-id="${p.id}">Delete</button>
        </div>

      </div>
    `).join("")}

    <button id="logoutBtn">Logout</button>

  </div>
  `;
}

/* ================= EVENTS ================= */
document.addEventListener("click", async (e) => {

  const user = JSON.parse(localStorage.getItem("user"));

  /* ADD */
  if (e.target.id === "addProjectBtn") {
    showForm();
  }

  /* LOGOUT (NO MODIFICADO) */
  if (e.target.id === "logoutBtn") {
    logout();
  }

  /* ================= EDIT (AGREGADO CONTROL REAL) ================= */
  if (e.target.classList.contains("edit-btn")) {

    if (user.role !== "manager") return;

    const id = e.target.dataset.id;

    const option = prompt("1=Name 2=Description 3=Status");

    let updateData = {};

    if (option === "1") {
      const newName = prompt("New name:");
      if (!newName) return;
      updateData.name = newName;
    }

    else if (option === "2") {
      const newDesc = prompt("New description:");
      if (!newDesc) return;
      updateData.description = newDesc;
    }

    else if (option === "3") {
      const newStatus = prompt("New status:");
      if (!newStatus) return;
      updateData.status = newStatus;
    }

    await fetch(`http://localhost:3000/projects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updateData)
    });

    renderDashboard(user);
  }

  /* ================= COLLABORATOR STATUS ONLY ================= */
  if (e.target.classList.contains("status-btn")) {

    if (user.role !== "collaborator") return;

    const id = e.target.dataset.id;

    const newStatus = prompt("Update status:");

    await fetch(`http://localhost:3000/projects/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus })
    });

    renderDashboard(user);
  }

  /* DELETE */
  if (e.target.classList.contains("delete-btn")) {

    if (user.role !== "manager") return;

    const id = e.target.dataset.id;

    await fetch(`http://localhost:3000/projects/${id}`, {
      method: "DELETE"
    });

    renderDashboard(user);
  }
});

/* ================= FORM ================= */
function showForm() {

  const user = JSON.parse(localStorage.getItem("user"));

  if (user.role !== "manager") return;

  document.getElementById("formContainer").innerHTML = `
  
    <div class="dashboard-card">

      <input id="projectName" placeholder="Project name">
      <input id="projectDesc" placeholder="Description">

      <select id="projectStatus">
        <option>In Progress</option>
        <option>Completed</option>
      </select>

      <button id="saveProjectBtn">Save</button>

    </div>

  `;

  document.getElementById("saveProjectBtn")
    .addEventListener("click", saveProject);
}

/* ================= CREATE ================= */
async function saveProject() {

  const user = JSON.parse(localStorage.getItem("user"));

  const newProject = {
    name: document.getElementById("projectName").value,
    description: document.getElementById("projectDesc").value,
    status: document.getElementById("projectStatus").value,
    assignedTo: user.id,

    /* ❗ AGREGADO */
    createdAt: new Date().toLocaleString()
  };

  /* ❗ VALIDACIÓN AGREGADA */
  if (!newProject.name || !newProject.description) return;

  await fetch("http://localhost:3000/projects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(newProject)
  });

  renderDashboard(user);
}

/* ================= LOGOUT (NO TOCADO) ================= */
function logout() {
  localStorage.removeItem("user");
  location.reload();
}