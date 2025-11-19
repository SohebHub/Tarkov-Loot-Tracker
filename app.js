const STORAGE_KEY = "tarkovChecklist_v1";
const INITIAL_DATA_URL = "tarkov-checklist-from-tarkovdata.json";

// Simple placeholder icon
const PLACEHOLDER_IMAGE =
  "data:image/svg+xml;base64," +
  btoa(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80">
      <rect width="80" height="80" fill="#020617"/>
      <rect x="14" y="18" width="52" height="38" rx="6" ry="6" fill="#0f172a" stroke="#4ade80" stroke-width="2"/>
      <circle cx="62" cy="58" r="10" fill="#22c55e"/>
      <path d="M57 58l4 4 6-8" fill="none" stroke="#022c22" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`
  );

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveToStorage(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function getSeedItems() {
  // Only used if JSON file is missing
  return [];
}

let items = [];

// filters
let typeFilter = "all";
let statusFilter = "all";
let firFilter = "all";
let tagFilter = "all";
let searchQuery = "";

// DOM
const cardsEl = document.getElementById("cards");
const emptyStateEl = document.getElementById("emptyState");
const statsBarEl = document.getElementById("statsBar");
const tagFilterEl = document.getElementById("tagFilter");
const searchInput = document.getElementById("searchInput");

const modalBackdrop = document.getElementById("modalBackdrop");
const modalTitleEl = document.getElementById("modalTitle");
const addItemBtn = document.getElementById("addItemBtn");
const closeModalBtn = document.getElementById("closeModalBtn");
const saveItemBtn = document.getElementById("saveItemBtn");
const deleteItemBtn = document.getElementById("deleteItemBtn");

const itemNameInput = document.getElementById("itemNameInput");
const categorySelect = document.getElementById("categorySelect");
const firSelect = document.getElementById("firSelect");
const qtyNeededInput = document.getElementById("qtyNeededInput");
const prioritySelect = document.getElementById("prioritySelect");
const questNameInput = document.getElementById("questNameInput");
const traderInput = document.getElementById("traderInput");
const moduleInput = document.getElementById("moduleInput");
const craftableCheckbox = document.getElementById("craftableCheckbox");
const craftModuleInput = document.getElementById("craftModuleInput");
const craftLevelInput = document.getElementById("craftLevelInput");
const craftRecipeInput = document.getElementById("craftRecipeInput");
const rewardFromInput = document.getElementById("rewardFromInput");
const tagsInput = document.getElementById("tagsInput");
const imageInput = document.getElementById("imageInput");
const notesInput = document.getElementById("notesInput");

const exportBtn = document.getElementById("exportBtn");
const importInput = document.getElementById("importInput");

let editingId = null;

// stats
function computeStats(filtered) {
  const total = filtered.length;
  let done = 0,
    quest = 0,
    hideout = 0,
    both = 0;
  filtered.forEach((i) => {
    if (i.completed) done++;
    if (i.category === "quest") quest++;
    else if (i.category === "hideout") hideout++;
    else both++;
  });
  return { total, done, quest, hideout, both };
}

function renderStats(filtered) {
  const { total, done, quest, hideout, both } = computeStats(filtered);
  if (!total) {
    statsBarEl.innerHTML = "";
    return;
  }
  const pct = Math.round((done / total) * 100);
  statsBarEl.innerHTML = `
    <span class="stats-pill">Total: <strong>${total}</strong></span>
    <span class="stats-pill">Done: <strong>${done}</strong> (${pct}%)</span>
    <span class="stats-pill">Quest: ${quest}</span>
    <span class="stats-pill">Hideout: ${hideout}</span>
    <span class="stats-pill">Both: ${both}</span>
  `;
}

// filters
function getFilteredItems() {
  return items.filter((item) => {
    if (typeFilter !== "all" && item.category !== typeFilter) return false;
    if (statusFilter === "todo" && item.completed) return false;
    if (statusFilter === "done" && !item.completed) return false;
    if (firFilter !== "all" && item.fir !== firFilter) return false;
    if (tagFilter !== "all") {
      if (!item.tags || !item.tags.includes(tagFilter)) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const text = [
        item.name,
        item.questName,
        item.trader,
        item.module,
        item.notes,
        item.rewardFromQuest,
        item.craftRecipe,
        item.craftModule,
        (item.tags || []).join(" "),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!text.includes(q)) return false;
    }
    return true;
  });
}

function renderTagFilter() {
  const set = new Set();
  items.forEach((i) => (i.tags || []).forEach((t) => set.add(t)));
  const current = tagFilter;
  tagFilterEl.innerHTML = '<option value="all">All tags</option>';
  Array.from(set)
    .sort()
    .forEach((t) => {
      const opt = document.createElement("option");
      opt.value = t;
      opt.textContent = t;
      tagFilterEl.appendChild(opt);
    });
  if (set.has(current)) tagFilterEl.value = current;
  else {
    tagFilter = "all";
    tagFilterEl.value = "all";
  }
}

// render
function renderItems() {
  const filtered = getFilteredItems();
  cardsEl.innerHTML = "";
  emptyStateEl.textContent = filtered.length ? "" : "No items match your filters.";
  emptyStateEl.style.display = filtered.length ? "none" : "block";

  renderStats(filtered);
  renderTagFilter();

  filtered.forEach((item) => {
    const card = document.createElement("article");
    card.className = "card";

    const header = document.createElement("div");
    header.className = "card-header";

    const imgWrap = document.createElement("div");
    imgWrap.className = "card-image-wrap";
    const img = document.createElement("img");
    img.className = "card-image";
    img.src = item.image || PLACEHOLDER_IMAGE;
    img.alt = item.name || "";
    imgWrap.appendChild(img);

    const main = document.createElement("div");
    main.className = "card-main";

    const titleRow = document.createElement("div");
    titleRow.className = "card-title-row";

    const titleLeft = document.createElement("div");
    titleLeft.innerHTML = `<div class="card-title">${item.name}</div>`;

    const actions = document.createElement("div");
    actions.className = "card-actions";
    const editBtn = document.createElement("button");
    editBtn.className = "btn btn-ghost btn-sm";
    editBtn.textContent = "✏️";
    editBtn.title = "Edit";
    editBtn.addEventListener("click", () => openModal(item.id));
    actions.appendChild(editBtn);

    titleRow.appendChild(titleLeft);
    titleRow.appendChild(actions);

    const badgesRow = document.createElement("div");
    badgesRow.className = "badge-row";

    const cat = document.createElement("span");
    cat.className = "badge";
    if (item.category === "quest") {
      cat.classList.add("badge-quest");
      cat.textContent = "Quest";
    } else if (item.category === "hideout") {
      cat.classList.add("badge-hideout");
      cat.textContent = "Hideout";
    } else {
      cat.classList.add("badge-both");
      cat.textContent = "Quest + Hideout";
    }
    badgesRow.appendChild(cat);

    if (item.priority === "high") {
      const b = document.createElement("span");
      b.className = "badge badge-high";
      b.textContent = "High priority";
      badgesRow.appendChild(b);
    }

    if (item.completed) {
      const b = document.createElement("span");
      b.className = "badge badge-complete";
      b.textContent = "Complete";
      badgesRow.appendChild(b);
    }

    if (item.fir === "required") {
      const b = document.createElement("span");
      b.className = "badge";
      b.textContent = "FiR required";
      badgesRow.appendChild(b);
    } else if (item.fir === "not-required") {
      const b = document.createElement("span");
      b.className = "badge";
      b.textContent = "FiR not required";
      badgesRow.appendChild(b);
    }

    if (item.questName) {
      const b = document.createElement("span");
      b.className = "badge";
      b.textContent = item.questName;
      badgesRow.appendChild(b);
    }

    if (item.module) {
      const b = document.createElement("span");
      b.className = "badge";
      b.textContent = item.module;
      badgesRow.appendChild(b);
    }

    (item.tags || []).forEach((t) => {
      const b = document.createElement("span");
      b.className = "badge badge-tag";
      b.textContent = t;
      badgesRow.appendChild(b);
    });

    const qtyRow = document.createElement("div");
    qtyRow.className = "qty-row";
    const dot = document.createElement("div");
    dot.className = "progress-dot" + (item.completed ? " done" : "");
    qtyRow.appendChild(dot);

    const neededText =
      item.qtyNeeded != null && item.qtyNeeded !== "" ? item.qtyNeeded : "–";
    const qtyLabel = document.createElement("span");
    qtyLabel.textContent = `Have ${item.qtyOwned || 0} / ${neededText}`;
    qtyRow.appendChild(qtyLabel);

    const qtyInput = document.createElement("input");
    qtyInput.type = "number";
    qtyInput.min = "0";
    qtyInput.step = "1";
    qtyInput.value = item.qtyOwned || 0;
    qtyInput.addEventListener("change", () => {
      const v = parseInt(qtyInput.value, 10);
      item.qtyOwned = Number.isNaN(v) ? 0 : v;
      if (item.qtyNeeded && item.qtyOwned >= item.qtyNeeded) {
        item.completed = true;
      } else if (item.qtyOwned === 0) {
        item.completed = false;
      }
      saveToStorage(items);
      renderItems();
    });
    qtyRow.appendChild(qtyInput);

    main.appendChild(titleRow);
    main.appendChild(badgesRow);
    main.appendChild(qtyRow);

    header.appendChild(imgWrap);
    header.appendChild(main);

    const body = document.createElement("div");
    body.className = "card-body";

    if (item.craftable && (item.craftModule || item.craftRecipe)) {
      const block = document.createElement("div");
      const lvl =
        item.craftLevel != null && item.craftLevel !== ""
          ? ` L${item.craftLevel}`
          : "";
      block.innerHTML = `
        <div class="card-section-label">Crafting</div>
        <div><strong>${item.craftModule || "Station"}${lvl}</strong></div>
        <div>${item.craftRecipe || ""}</div>
      `;
      body.appendChild(block);
    }

    if (item.trader || item.rewardFromQuest) {
      const block = document.createElement("div");
      block.innerHTML = `
        <div class="card-section-label">Quest / reward</div>
        <div>
          ${item.trader ? `<strong>Trader:</strong> ${item.trader}<br>` : ""}
          ${
            item.rewardFromQuest
              ? `<strong>Rewarded from:</strong> ${item.rewardFromQuest}`
              : ""
          }
        </div>
      `;
      body.appendChild(block);
    }

    if (item.notes) {
      const block = document.createElement("div");
      block.innerHTML = `
        <div class="card-section-label">Notes</div>
        <div>${item.notes}</div>
      `;
      body.appendChild(block);
    }

    const footer = document.createElement("div");
    footer.className = "card-footer";

    const left = document.createElement("div");
    const label = document.createElement("label");
    label.className = "checkbox-label";
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = item.completed;
    cb.addEventListener("change", () => {
      item.completed = cb.checked;
      saveToStorage(items);
      renderItems();
    });
    const span = document.createElement("span");
    span.textContent = "Mark done";
    label.appendChild(cb);
    label.appendChild(span);
    left.appendChild(label);

    footer.appendChild(left);

    card.appendChild(header);
    card.appendChild(body);
    card.appendChild(footer);

    cardsEl.appendChild(card);
  });
}

// filters UI
function setupFilters() {
  function setupGroup(id, onChange) {
    const group = document.getElementById(id);
    group.addEventListener("click", (e) => {
      const btn = e.target.closest(".pill-toggle");
      if (!btn) return;
      const val = btn.dataset.value;
      group
        .querySelectorAll(".pill-toggle")
        .forEach((b) => b.classList.toggle("active", b === btn));
      onChange(val);
    });
  }

  setupGroup("typeFilter", (v) => {
    typeFilter = v;
    renderItems();
  });

  setupGroup("statusFilter", (v) => {
    statusFilter = v;
    renderItems();
  });

  setupGroup("firFilter", (v) => {
    firFilter = v;
    renderItems();
  });

  tagFilterEl.addEventListener("change", () => {
    tagFilter = tagFilterEl.value;
    renderItems();
  });

  searchInput.addEventListener("input", () => {
    searchQuery = searchInput.value;
    renderItems();
  });
}

// modal
function openModal(id = null) {
  editingId = id;
  if (id) {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    modalTitleEl.textContent = "Edit item";
    itemNameInput.value = item.name || "";
    categorySelect.value = item.category || "quest";
    firSelect.value = item.fir || "any";
    qtyNeededInput.value =
      item.qtyNeeded != null && item.qtyNeeded !== "" ? item.qtyNeeded : "";
    prioritySelect.value = item.priority || "medium";
    questNameInput.value = item.questName || "";
    traderInput.value = item.trader || "";
    moduleInput.value = item.module || "";
    craftableCheckbox.checked = !!item.craftable;
    craftModuleInput.value = item.craftModule || "";
    craftLevelInput.value =
      item.craftLevel != null && item.craftLevel !== "" ? item.craftLevel : "";
    craftRecipeInput.value = item.craftRecipe || "";
    rewardFromInput.value = item.rewardFromQuest || "";
    tagsInput.value = (item.tags || []).join(", ");
    imageInput.value =
      item.image && item.image !== PLACEHOLDER_IMAGE ? item.image : "";
    notesInput.value = item.notes || "";
    deleteItemBtn.style.display = "inline-flex";
  } else {
    modalTitleEl.textContent = "Add item";
    itemNameInput.value = "";
    categorySelect.value = "quest";
    firSelect.value = "required";
    qtyNeededInput.value = "";
    prioritySelect.value = "medium";
    questNameInput.value = "";
    traderInput.value = "";
    moduleInput.value = "";
    craftableCheckbox.checked = false;
    craftModuleInput.value = "";
    craftLevelInput.value = "";
    craftRecipeInput.value = "";
    rewardFromInput.value = "";
    tagsInput.value = "";
    imageInput.value = "";
    notesInput.value = "";
    deleteItemBtn.style.display = "none";
  }
  modalBackdrop.classList.add("show");
}

function closeModal() {
  modalBackdrop.classList.remove("show");
}

addItemBtn.addEventListener("click", () => openModal());
closeModalBtn.addEventListener("click", closeModal);
modalBackdrop.addEventListener("click", (e) => {
  if (e.target === modalBackdrop) closeModal();
});

saveItemBtn.addEventListener("click", () => {
  const name = itemNameInput.value.trim();
  if (!name) {
    alert("Name is required");
    return;
  }
  const category = categorySelect.value;
  const fir = firSelect.value;
  const qtyNeededRaw = qtyNeededInput.value.trim();
  const qtyNeeded =
    qtyNeededRaw === "" ? null : Number.parseInt(qtyNeededRaw, 10);
  const priority = prioritySelect.value;
  const questName = questNameInput.value.trim();
  const trader = traderInput.value.trim();
  const module = moduleInput.value.trim();
  const craftable = craftableCheckbox.checked;
  const craftModule = craftModuleInput.value.trim();
  const craftLevelRaw = craftLevelInput.value.trim();
  const craftLevel =
    craftLevelRaw === "" ? null : Number.parseInt(craftLevelRaw, 10);
  const craftRecipe = craftRecipeInput.value.trim();
  const rewardFromQuest = rewardFromInput.value.trim();
  const notes = notesInput.value.trim();
  const tags = tagsInput.value
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t);
  const imageUrl = imageInput.value.trim();
  const image = imageUrl || PLACEHOLDER_IMAGE;

  if (editingId) {
    const item = items.find((i) => i.id === editingId);
    if (!item) return;
    item.name = name;
    item.category = category;
    item.fir = fir;
    item.qtyNeeded = Number.isNaN(qtyNeeded) ? null : qtyNeeded;
    item.priority = priority;
    item.questName = questName;
    item.trader = trader;
    item.module = module;
    item.craftable = craftable;
    item.craftModule = craftModule;
    item.craftLevel = Number.isNaN(craftLevel) ? null : craftLevel;
    item.craftRecipe = craftRecipe;
    item.rewardFromQuest = rewardFromQuest;
    item.notes = notes;
    item.tags = tags;
    item.image = image;
  } else {
    const id = "item-" + Date.now() + "-" + Math.random().toString(16).slice(2);
    items.push({
      id,
      name,
      category,
      fir,
      qtyNeeded: Number.isNaN(qtyNeeded) ? null : qtyNeeded,
      qtyOwned: 0,
      priority,
      questName,
      trader,
      module,
      craftable,
      craftModule,
      craftLevel: Number.isNaN(craftLevel) ? null : craftLevel,
      craftRecipe,
      rewardFromQuest,
      notes,
      tags,
      image,
      completed: false,
    });
  }
  saveToStorage(items);
  renderItems();
  closeModal();
});

deleteItemBtn.addEventListener("click", () => {
  if (!editingId) return;
  if (!confirm("Delete this item?")) return;
  items = items.filter((i) => i.id !== editingId);
  saveToStorage(items);
  renderItems();
  closeModal();
});

// export / import
exportBtn.addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(items, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "tarkov-checklist.json";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
});

importInput.addEventListener("change", (e) => {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (evt) => {
    try {
      const data = JSON.parse(evt.target.result);
      if (!Array.isArray(data)) {
        alert("Invalid file");
        return;
      }
      if (!confirm("Replace current checklist with imported data?")) return;
      items = data;
      saveToStorage(items);
      renderItems();
      importInput.value = "";
    } catch {
      alert("Failed to parse JSON");
    }
  };
  reader.readAsText(file);
});

// init
async function initialize() {
  const stored = loadFromStorage();
  if (stored && stored.length) {
    items = stored;
    setupFilters();
    renderItems();
    return;
  }

  try {
    const resp = await fetch(INITIAL_DATA_URL, { cache: "no-cache" });
    if (resp.ok) {
      const data = await resp.json();
      if (Array.isArray(data) && data.length) {
        // normalize
        data.forEach((it) => {
          if (typeof it.qtyOwned !== "number") it.qtyOwned = 0;
          if (typeof it.completed !== "boolean") it.completed = false;
          if (!Array.isArray(it.tags)) it.tags = [];
          if (!it.image) it.image = PLACEHOLDER_IMAGE;
        });
        items = data;
        saveToStorage(items);
        setupFilters();
        renderItems();
        return;
      }
    }
    console.warn("Failed to load base JSON; falling back to seed");
  } catch (err) {
    console.error("Error fetching JSON", err);
  }

  items = getSeedItems();
  saveToStorage(items);
  setupFilters();
  renderItems();
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("service-worker.js")
      .catch((err) => console.error("SW registration failed", err));
  });
}

initialize();
