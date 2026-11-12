
const STORAGE_KEY = "aafiyah_app_data_v1";

const defaultData = {
  family: [],
  medicines: [],
  moods: []
};

function loadData() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return {
      family: Array.isArray(saved?.family) ? saved.family : [],
      medicines: Array.isArray(saved?.medicines) ? saved.medicines : [],
      moods: Array.isArray(saved?.moods) ? saved.moods : []
    };
  } catch {
    return { ...defaultData };
  }
}

let data = loadData();

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  renderAll();
}

function makeId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2600);
}

const homeElements = [
  document.querySelector(".hero"),
  document.querySelector(".welcome-row"),
  document.querySelector(".stats-grid"),
  ...document.querySelectorAll("main > .section-block")
];

function navigate(page) {
  const isHome = page === "home";

  homeElements.forEach(element => {
    if (element) element.hidden = !isHome;
  });

  document.querySelectorAll(".page-view").forEach(view => {
    view.hidden = view.id !== `page-${page}`;
  });

  document.querySelectorAll(".nav-item").forEach(button => {
    button.classList.toggle("active", button.dataset.go === page);
  });

  window.scrollTo({ top: 0, behavior: "smooth" });

  if (page === "medicine") renderMedicines();
  if (page === "family") renderFamily();
  if (page === "mood") renderMoods();
}

document.querySelectorAll("[data-go]").forEach(button => {
  button.addEventListener("click", () => {
    navigate(button.dataset.go);
  });
});

function renderFamily() {
  const list = document.getElementById("familyList");
  const memberSelect = document.getElementById("medicineMember");

  if (data.family.length === 0) {
    list.innerHTML = '<div class="empty-state">لم تتم إضافة أفراد الأسرة بعد.</div>';
  } else {
    list.innerHTML = data.family.map(person => `
      <div class="record-item">
        <div>
          <strong>${escapeHTML(person.name)}</strong>
          <small>${escapeHTML(person.relation)}</small>
        </div>
        <button class="delete-btn" data-delete-family="${person.id}">حذف</button>
      </div>
    `).join("");
  }

  const previousValue = memberSelect.value;
  memberSelect.innerHTML = '<option value="">اختاري فرد الأسرة</option>' +
    data.family.map(person =>
      `<option value="${person.id}">${escapeHTML(person.name)} — ${escapeHTML(person.relation)}</option>`
    ).join("");

  if (data.family.some(person => person.id === previousValue)) {
    memberSelect.value = previousValue;
  }

  document.getElementById("familyCount").textContent = data.family.length;
}

document.getElementById("familyForm").addEventListener("submit", event => {
  event.preventDefault();

  const name = document.getElementById("memberName").value.trim();
  const relation = document.getElementById("memberRelation").value;

  if (!name || !relation) {
    showToast("أكملي البيانات أولًا");
    return;
  }

  data.family.push({
    id: makeId(),
    name,
    relation
  });

  event.target.reset();
  saveData();
  showToast("تمت إضافة فرد الأسرة بنجاح");
});

document.getElementById("familyList").addEventListener("click", event => {
  const button = event.target.closest("[data-delete-family]");
  if (!button) return;

  const id = button.dataset.deleteFamily;
  const hasMedicine = data.medicines.some(item => item.memberId === id);

  if (hasMedicine) {
    showToast("احذفي سجلات الأدوية المرتبطة بهذا الفرد أولًا");
    return;
  }

  data.family = data.family.filter(person => person.id !== id);
  saveData();
  showToast("تم حذف السجل");
});

function renderMedicines() {
  const list = document.getElementById("medicineList");

  if (data.medicines.length === 0) {
    list.innerHTML = '<div class="empty-state">لا توجد أدوية مسجلة. يمكنك إضافة دواء من النموذج أعلاه.</div>';
  } else {
    list.innerHTML = data.medicines.map(medicine => {
      const person = data.family.find(p => p.id === medicine.memberId);
      return `
        <div class="record-item">
          <div>
            <strong>${escapeHTML(medicine.name)}</strong>
            <small>${escapeHTML(person?.name || "فرد الأسرة")} • ${escapeHTML(medicine.time)}</small>
            ${medicine.note ? `<small>${escapeHTML(medicine.note)}</small>` : ""}
          </div>
          <button class="delete-btn" data-delete-medicine="${medicine.id}">حذف</button>
        </div>
      `;
    }).join("");
  }

  document.getElementById("medicineCount").textContent = data.medicines.length;

  const due = data.medicines.filter(item => item.time === currentTime());
  document.getElementById("reminderSummary").textContent =
    data.medicines.length === 0
      ? "أضيفي الأدوية لتنظيم مواعيدها هنا."
      : due.length
        ? `لديك ${due.length} موعد دوائي في هذا الوقت المسجل. راجعي تعليمات الوصفة.`
        : `لديك ${data.medicines.length} سجل دوائي. راجعي مواعيده في قسم إدارة الأدوية.`;
}

document.getElementById("medicineForm").addEventListener("submit", event => {
  event.preventDefault();

  const name = document.getElementById("medicineName").value.trim();
  const memberId = document.getElementById("medicineMember").value;
  const time = document.getElementById("medicineTime").value;
  const note = document.getElementById("medicineNote").value.trim();

  if (!name || !memberId || !time) {
    showToast("أكملي بيانات الدواء");
    return;
  }

  data.medicines.push({
    id: makeId(),
    name,
    memberId,
    time,
    note
  });

  event.target.reset();
  saveData();
  showToast("تم حفظ سجل الدواء");
});

document.getElementById("medicineList").addEventListener("click", event => {
  const button = event.target.closest("[data-delete-medicine]");
  if (!button) return;

  data.medicines = data.medicines.filter(
    item => item.id !== button.dataset.deleteMedicine
  );

  saveData();
  showToast("تم حذف سجل الدواء");
});

function renderMoods() {
  const list = document.getElementById("moodList");

  if (data.moods.length === 0) {
    list.innerHTML = '<div class="empty-state">لا توجد تسجيلات حتى الآن. يمكنك البدء بتسجيل شعورك اليوم.</div>';
  } else {
    list.innerHTML = [...data.moods].reverse().map(item => `
      <div class="record-item">
        <div>
          <strong>${escapeHTML(item.mood)}</strong>
          <small>${escapeHTML(item.date)}</small>
          ${item.note ? `<small>${escapeHTML(item.note)}</small>` : ""}
        </div>
        <button class="delete-btn" data-delete-mood="${item.id}">حذف</button>
      </div>
    `).join("");
  }

  document.getElementById("moodCount").textContent = data.moods.length;
}

document.getElementById("moodForm").addEventListener("submit", event => {
  event.preventDefault();

  const selected = document.querySelector('input[name="mood"]:checked');
  if (!selected) {
    showToast("اختاري الشعور أولًا");
    return;
  }

  const note = document.getElementById("moodNote").value.trim();

  data.moods.push({
    id: makeId(),
    mood: selected.value,
    note,
    date: new Date().toLocaleDateString("ar-SA")
  });

  event.target.reset();
  saveData();
  showToast("تم حفظ تسجيلك");
});

document.getElementById("moodList").addEventListener("click", event => {
  const button = event.target.closest("[data-delete-mood]");
  if (!button) return;

  data.moods = data.moods.filter(
    item => item.id !== button.dataset.deleteMood
  );

  saveData();
  showToast("تم حذف التسجيل");
});

function currentTime() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

function renderAll() {
  renderFamily();
  renderMedicines();
  renderMoods();
}

function updateDate() {
  document.getElementById("todayDate").textContent =
    new Date().toLocaleDateString("ar-SA", {
      weekday: "long",
      day: "numeric",
      month: "long"
    });
}

renderAll();
updateDate();
navigate("home");

// حفظ حالة قائمة سلامة الطفل على الجهاز
const safetyChecks = document.querySelectorAll("#safetyChecklist input");

safetyChecks.forEach((checkbox, index) => {
  const key = `aafiyah_safety_${index}`;
  checkbox.checked = localStorage.getItem(key) === "true";

  checkbox.addEventListener("change", () => {
    localStorage.setItem(key, checkbox.checked ? "true" : "false");
  });
});

// دعم تثبيت التطبيق عند توفر خيار التثبيت
let installPrompt = null;
const installButton = document.getElementById("installBtn");

window.addEventListener("beforeinstallprompt", event => {
  event.preventDefault();
  installPrompt = event;
  installButton.hidden = false;
});

installButton.addEventListener("click", async () => {
  if (!installPrompt) return;

  installPrompt.prompt();
  await installPrompt.userChoice;
  installPrompt = null;
  installButton.hidden = true;
});

window.addEventListener("appinstalled", () => {
  showToast("تم تثبيت عافية");
  installButton.hidden = true;
});

// تسجيل ملف العمل دون اتصال
if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js")
      .catch(error => console.log("تعذر تسجيل وضع عدم الاتصال", error));
  });
}
