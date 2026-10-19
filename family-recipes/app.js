// Family Recipes: all data lives in localStorage under one key.
const STORAGE_KEY = "family-recipes:v1";
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const MEALS = ["Breakfast", "Lunch", "Dinner"];

let state = load();
let editingId = null;
let viewingId = null;

function load() {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (data && Array.isArray(data.recipes)) return { recipes: data.recipes, menu: data.menu || {}, checked: data.checked || {} };
  } catch {}
  return { recipes: [], menu: {}, checked: {} };
}

function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
  render();
}

const $ = (sel) => document.querySelector(sel);
const lines = (text) => text.split("\n").map((s) => s.trim()).filter(Boolean);
const escapeHtml = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const findRecipe = (id) => state.recipes.find((r) => r.id === id);

// ---------- Tabs ----------
document.querySelectorAll("nav button").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll("nav button").forEach((b) => b.classList.toggle("active", b === btn));
    document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t.id === `tab-${btn.dataset.tab}`));
  });
});

// ---------- Recipes ----------
function renderRecipes() {
  const q = $("#search").value.trim().toLowerCase();
  const list = state.recipes
    .filter((r) => !q || [r.name, r.category, ...r.ingredients].join(" ").toLowerCase().includes(q))
    .sort((a, b) => a.name.localeCompare(b.name));

  $("#recipe-list").innerHTML = list.length
    ? list.map((r) => `
        <div class="card" data-id="${r.id}">
          <h3>${escapeHtml(r.name)}</h3>
          <div class="meta">${[r.category, r.servings && `serves ${r.servings}`, r.time && `${r.time} min`].filter(Boolean).map(escapeHtml).join(" · ")}</div>
          <div class="meta">${r.ingredients.length} ingredients</div>
        </div>`).join("")
    : `<p class="empty">${state.recipes.length ? "No recipes match your search." : "No recipes yet. Add one, or import sample-data.json."}</p>`;

  const categories = [...new Set(state.recipes.map((r) => r.category).filter(Boolean))];
  $("#categories").innerHTML = categories.map((c) => `<option value="${escapeHtml(c)}">`).join("");
}

$("#search").addEventListener("input", renderRecipes);
$("#recipe-list").addEventListener("click", (e) => {
  const card = e.target.closest(".card");
  if (card) openView(card.dataset.id);
});

function openEditor(id = null) {
  editingId = id;
  const r = id ? findRecipe(id) : null;
  const f = $("#recipe-form");
  f.reset();
  $("#dialog-title").textContent = r ? "Edit recipe" : "New recipe";
  $("#delete-recipe").hidden = !r;
  if (r) {
    f.name.value = r.name;
    f.category.value = r.category || "";
    f.servings.value = r.servings || "";
    f.time.value = r.time || "";
    f.ingredients.value = r.ingredients.join("\n");
    f.steps.value = r.steps.join("\n");
    f.notes.value = r.notes || "";
  }
  $("#recipe-dialog").showModal();
}

$("#new-recipe").addEventListener("click", () => openEditor());
$("#cancel-recipe").addEventListener("click", () => $("#recipe-dialog").close());

$("#recipe-form").addEventListener("submit", () => {
  const f = $("#recipe-form");
  const recipe = {
    id: editingId || crypto.randomUUID(),
    name: f.name.value.trim(),
    category: f.category.value.trim(),
    servings: Number(f.servings.value) || null,
    time: Number(f.time.value) || null,
    ingredients: lines(f.ingredients.value),
    steps: lines(f.steps.value),
    notes: f.notes.value.trim(),
  };
  state.recipes = editingId ? state.recipes.map((r) => (r.id === editingId ? recipe : r)) : [...state.recipes, recipe];
  save();
});

$("#delete-recipe").addEventListener("click", () => {
  const r = findRecipe(editingId);
  if (!r || !confirm(`Delete "${r.name}"?`)) return;
  state.recipes = state.recipes.filter((x) => x.id !== editingId);
  for (const key of Object.keys(state.menu)) if (state.menu[key] === editingId) delete state.menu[key];
  $("#recipe-dialog").close();
  save();
});

function openView(id) {
  viewingId = id;
  const r = findRecipe(id);
  $("#view-body").innerHTML = `
    <h2>${escapeHtml(r.name)}</h2>
    <p class="meta">${[r.category, r.servings && `serves ${r.servings}`, r.time && `${r.time} min`].filter(Boolean).map(escapeHtml).join(" · ")}</p>
    <h3>Ingredients</h3>
    <ul>${r.ingredients.map((i) => `<li>${escapeHtml(i)}</li>`).join("")}</ul>
    <h3>Steps</h3>
    <ol>${r.steps.map((s) => `<li>${escapeHtml(s)}</li>`).join("")}</ol>
    ${r.notes ? `<h3>Notes</h3><p>${escapeHtml(r.notes)}</p>` : ""}`;
  $("#view-dialog").showModal();
}

$("#close-view").addEventListener("click", () => $("#view-dialog").close());
$("#edit-from-view").addEventListener("click", () => {
  $("#view-dialog").close();
  openEditor(viewingId);
});

// ---------- Weekly menu ----------
function renderMenu() {
  const options = (selected) =>
    `<option value="">—</option>` +
    [...state.recipes]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((r) => `<option value="${r.id}" ${r.id === selected ? "selected" : ""}>${escapeHtml(r.name)}</option>`)
      .join("");

  $("#menu-table").innerHTML =
    `<tr><th></th>${MEALS.map((m) => `<th>${m}</th>`).join("")}</tr>` +
    DAYS.map((d) => `<tr><th>${d}</th>${MEALS.map((m) => `<td><select data-slot="${d}|${m}">${options(state.menu[`${d}|${m}`])}</select></td>`).join("")}</tr>`).join("");
}

$("#menu-table").addEventListener("change", (e) => {
  const slot = e.target.dataset.slot;
  if (!slot) return;
  if (e.target.value) state.menu[slot] = e.target.value;
  else delete state.menu[slot];
  save();
});

$("#clear-menu").addEventListener("click", () => {
  if (!confirm("Clear the whole week's menu?")) return;
  state.menu = {};
  state.checked = {};
  save();
});

// ---------- Shopping list ----------
function renderShopping() {
  const items = new Map();
  for (const id of Object.values(state.menu)) {
    const r = findRecipe(id);
    if (!r) continue;
    for (const ing of r.ingredients) {
      const key = ing.toLowerCase();
      const entry = items.get(key) || { text: ing, recipes: new Set() };
      entry.recipes.add(r.name);
      items.set(key, entry);
    }
  }

  $("#shopping-list").innerHTML = items.size
    ? [...items.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, { text, recipes }]) => `
          <li class="${state.checked[key] ? "done" : ""}">
            <label><input type="checkbox" data-key="${escapeHtml(key)}" ${state.checked[key] ? "checked" : ""}>
            <span>${escapeHtml(text)}</span> <small class="meta">(${[...recipes].map(escapeHtml).join(", ")})</small></label>
          </li>`).join("")
    : `<li class="empty">Add recipes to the weekly menu to build a shopping list.</li>`;
}

$("#shopping-list").addEventListener("change", (e) => {
  const key = e.target.dataset.key;
  if (!key) return;
  if (e.target.checked) state.checked[key] = true;
  else delete state.checked[key];
  save();
});

// ---------- Export / Import ----------
$("#export-btn").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `family-recipes-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
});

$("#import-file").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  e.target.value = "";
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    if (!Array.isArray(data.recipes)) throw new Error("missing recipes");
    const merge = state.recipes.length && confirm("Merge with your existing recipes? (Cancel replaces everything.)");
    if (merge) {
      const ids = new Set(state.recipes.map((r) => r.id));
      state.recipes.push(...data.recipes.filter((r) => !ids.has(r.id)));
    } else {
      state = { recipes: data.recipes, menu: data.menu || {}, checked: data.checked || {} };
    }
    save();
  } catch (err) {
    alert(`Could not import that file: ${err.message}`);
  }
});

function render() {
  renderRecipes();
  renderMenu();
  renderShopping();
}

render();
