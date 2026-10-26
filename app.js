const user = JSON.parse(localStorage.getItem("user") || "null");
if (!user) location = "login.html";
const ROLES = { ADMIN: "الإدارة", TEACHER: "المعلم", PARENT: "ولي الأمر", STUDENT: "الطالب" };
const TYPES = { HIFZ: "حفظ", MURAJAA: "مراجعة", TASMEE: "تسميع" };
const ATT = { PRESENT: "حاضر", ABSENT: "غائب", EXCUSED: "بعذر", LATE: "متأخر" };
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const opts = (a, v, l) => a.map((x) => `<option value="${esc(x[v])}">${esc(l(x))}</option>`).join("");
const card = (t, h) => `<div class="card"><h2>${t}</h2>${h}</div>`;

async function api(p, m = "GET", b) {
  const r = await fetch(API_URL + "/api" + p, {
    method: m, body: b ? JSON.stringify(b) : undefined,
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + localStorage.getItem("token") },
  });
  const d = await r.json().catch(() => ({}));
  if (r.status === 401) { localStorage.clear(); location = "login.html"; }
  if (!r.ok) throw new Error(d.error === "Validation failed" ? "تحقق من البيانات المدخلة" : d.error || "حدث خطأ");
  return d;
}
const clean = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== ""));
function bind(id, fn, reload) {
  const f = document.getElementById(id);
  if (!f) return;
  f.onsubmit = async (e) => {
    e.preventDefault();
    try { await fn(clean(Object.fromEntries(new FormData(f)))); alert("تم الحفظ"); f.reset(); if (reload) reload(); }
    catch (err) { alert(err.message); }
  };
}

const VIEWS = {
  async stats() {
    const s = await api("/billing/stats");
    return card("إحصائيات المركز", `<div class="grid">
      <div class="stat"><b>${s.students}</b>الطلاب</div><div class="stat"><b>${s.teachers}</b>المعلمون</div>
      <div class="stat"><b>${s.revenuePaid}</b>المدفوع</div><div class="stat"><b>${s.revenuePending}</b>المستحق</div></div>`);
  },
  async requests() {
    const a = await api("/admissions");
    const rows = a.map((x) => `<tr><td>${esc(x.studentName)}<br><small>${esc(x.parentName)} - ${esc(x.phone)}</small></td><td>${esc(x.status)}</td>
      <td>${x.status === "PENDING" ? `<button class="sm" onclick="setReq('${x.id}','APPROVED')">قبول</button> <button class="sm red" onclick="setReq('${x.id}','REJECTED')">رفض</button>` : ""}</td></tr>`).join("");
    return card("طلبات الالتحاق", `<table>${rows || "<tr><td>لا توجد طلبات</td></tr>"}</table>`);
  },
  async accounts() {
    const [t, p, h] = await Promise.all([api("/students/teachers"), api("/students/parents"), api("/halaqat")]);
    return card("إنشاء حساب", `<form id="f-user"><input name="name" placeholder="الاسم" required><input name="email" type="email" placeholder="البريد" required>
      <input name="password" placeholder="كلمة المرور (8 أحرف على الأقل)" required minlength="8">
      <select name="role"><option value="STUDENT">طالب</option><option value="PARENT">ولي أمر</option><option value="TEACHER">معلم</option></select>
      <select name="parentId"><option value="">ولي الأمر (للطالب)</option>${opts(p, "id", (x) => x.name)}</select>
      <select name="halaqaId"><option value="">الحلقة (للطالب)</option>${opts(h, "id", (x) => x.name)}</select><button>إنشاء</button></form>`) +
      card("إنشاء حلقة", `<form id="f-halaqa"><input name="name" placeholder="اسم الحلقة" required>
      <select name="teacherId" required><option value="">المعلم</option>${opts(t, "id", (x) => x.name)}</select>
      <input name="zoomLink" type="url" placeholder="رابط زووم"><input name="schedule" placeholder="الموعد (مثال: الأحد والثلاثاء 5م)"><button>إنشاء</button></form>`);
  },
  async billing() {
    return card("توليد فواتير الشهر", `<form id="f-inv"><input name="month" placeholder="2026-11" pattern="\\d{4}-\\d{2}" required>
      <input name="amount" type="number" step="0.01" placeholder="قيمة الاشتراك" required><button>توليد لكل الطلاب</button></form>`);
  },
  async halaqat() {
    const h = await api("/halaqat");
    return card("حلقاتي", `<table>${h.map((x) => `<tr><td>${esc(x.name)}</td><td>${esc(x.schedule || "")}</td><td>${x.zoomLink ? `<a href="${esc(x.zoomLink)}" target="_blank" rel="noopener">زووم</a>` : ""}</td></tr>`).join("") || "<tr><td>لا توجد حلقات</td></tr>"}</table>`);
  },
  async record() {
    const s = await api("/students");
    return card("تسجيل حفظ / مراجعة", `<form id="f-prog"><select name="studentId" required><option value="">الطالب</option>${opts(s, "id", (x) => x.user.name)}</select>
      <select name="type">${Object.entries(TYPES).map(([k, v]) => `<option value="${k}">${v}</option>`).join("")}</select>
      <input name="surah" type="number" min="1" max="114" placeholder="رقم السورة" required>
      <input name="fromAyah" type="number" min="1" placeholder="من آية" required><input name="toAyah" type="number" min="1" placeholder="إلى آية" required>
      <select name="rating"><option value="5">ممتاز (5)</option><option value="4">جيد جدًا (4)</option><option value="3">جيد (3)</option><option value="2">مقبول (2)</option><option value="1">ضعيف (1)</option></select>
      <textarea name="note" placeholder="ملاحظة للطالب وولي الأمر"></textarea><button>حفظ</button></form>`);
  },
  async attendance() {
    const [h, s] = await Promise.all([api("/halaqat"), api("/students")]);
    window._stu = s;
    return card("تسجيل الحضور", `<form id="f-att"><select name="halaqaId" id="hsel" required onchange="fillAtt()"><option value="">الحلقة</option>${opts(h, "id", (x) => x.name)}</select>
      <input name="date" type="date" required><div id="att"></div><button>حفظ الحضور</button></form>`);
  },
  async progress() {
    const s = await api("/students");
    let out = "";
    for (const st of s) {
      const p = await api("/progress/student/" + st.id);
      const z = st.halaqa?.zoomLink ? ` - <a href="${esc(st.halaqa.zoomLink)}" target="_blank" rel="noopener">رابط الدرس</a>` : "";
      out += card(esc(st.user.name) + z, `<small>${esc(st.halaqa?.name || "")} ${esc(st.halaqa?.schedule || "")}</small><table>${p.map((x) =>
        `<tr><td>${TYPES[x.type]}</td><td>سورة ${x.surah}: ${x.fromAyah}-${x.toAyah}</td><td>${x.rating}/5</td><td>${esc(x.note || "")}</td></tr>`).join("") || "<tr><td>لا توجد سجلات بعد</td></tr>"}</table>`);
    }
    return out || card("التقدم", "لا يوجد طلاب");
  },
  async invoices() {
    const i = await api("/billing/mine");
    return card("الاشتراكات", `<table>${i.map((x) => `<tr><td>${esc(x.student.user.name)}</td><td>${x.month}</td><td>${x.amount}</td><td>${x.status === "PAID" ? "مدفوع" : "مستحق"}</td></tr>`).join("") || "<tr><td>لا توجد فواتير</td></tr>"}</table>`);
  },
};
const TABS = {
  ADMIN: [["الإحصائيات", ["stats"]], ["الطلبات", ["requests"]], ["الحسابات والحلقات", ["accounts"]], ["الفواتير", ["billing"]]],
  TEACHER: [["حلقاتي", ["halaqat"]], ["تسجيل الحفظ", ["record"]], ["الحضور", ["attendance"]]],
  PARENT: [["أبنائي", ["progress"]], ["الاشتراكات", ["invoices"]]],
  STUDENT: [["تقدمي", ["progress"]]],
};
window.setReq = async (id, status) => { try { await api("/admissions/" + id, "PATCH", { status }); show(cur); } catch (e) { alert(e.message); } };
window.fillAtt = () => {
  const h = $("#hsel").value;
  $("#att").innerHTML = (window._stu || []).filter((x) => x.halaqaId === h).map((x) =>
    `<div>${esc(x.user.name)} <select name="s_${x.id}">${Object.entries(ATT).map(([k, v]) => `<option value="${k}">${v}</option>`).join("")}</select></div>`).join("");
};
let cur = [];
async function show(views) {
  cur = views;
  $("#view").innerHTML = "جارٍ التحميل...";
  try {
    $("#view").innerHTML = (await Promise.all(views.map((v) => VIEWS[v]()))).join("");
    const again = () => show(views);
    bind("f-user", (d) => api("/auth/users", "POST", d), again);
    bind("f-halaqa", (d) => api("/halaqat", "POST", d), again);
    bind("f-inv", (d) => api("/billing/generate", "POST", { month: d.month, amount: Number(d.amount) }));
    bind("f-prog", (d) => api("/progress", "POST", { ...d, surah: +d.surah, fromAyah: +d.fromAyah, toAyah: +d.toAyah, rating: +d.rating }));
    bind("f-att", (d) => api(`/halaqat/${d.halaqaId}/sessions`, "POST", {
      date: d.date, attendance: Object.entries(d).filter(([k]) => k.startsWith("s_")).map(([k, v]) => ({ studentId: k.slice(2), status: v })),
    }), again);
  } catch (e) { $("#view").innerHTML = `<p class="msg">${esc(e.message)}</p>`; }
}
$("#who").textContent = `${user.name} - ${ROLES[user.role]}`;
const tabs = TABS[user.role] || [];
$("#tabs").innerHTML = tabs.map((t, i) => `<button data-i="${i}">${t[0]}</button>`).join("");
$("#tabs").onclick = (e) => {
  const i = e.target.dataset.i; if (i === undefined) return;
  [...$("#tabs").children].forEach((b) => b.classList.toggle("on", b.dataset.i === i));
  show(tabs[i][1]);
};
$("#tabs").firstChild?.click();
