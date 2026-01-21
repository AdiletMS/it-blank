const WA_NUMBER = "996700020525";

const REVIEWS_ENDPOINT = "https://script.google.com/macros/s/AKfycbyTBXxO1szr9EVBAPoH8Unk-sqnEGWRHVhI83JztC3DSmYPSdYf57w6mbvNiU3546tcPQ/exec";

const FORM_ENDPOINT =
  "https://script.google.com/macros/s/AKfycbzRzGsLPM8zG2O75OF0EslZZpV-5QcMDrM2qrpleDjKEJkkWYUA7sdwPlel5EJNTq7A/exec";

// анти-спам настройки
const MIN_SECONDS_BEFORE_SEND = 8; // человек обычно не успевает за 1-2 сек

function byIdInForm(form, id) {
  const el = form.querySelector(`#${CSS.escape(id)}`);
  return el ? String(el.value || "").trim() : "";
}

function collectFormData(form) {
  return {
    name: byIdInForm(form, "name"),
    phone: byIdInForm(form, "phone"),
    service: (form.querySelector("#service")?.value || "").trim(),
    time: byIdInForm(form, "time"),
    address: byIdInForm(form, "address"),
    comment: byIdInForm(form, "comment"),
    page: window.location.href,

    // anti-spam fields
    website: byIdInForm(form, "website"), // honeypot
    form_ts: byIdInForm(form, "form_ts"), // timestamp
  };
}

function validate(data) {
  if (!data.name) return alert("⚠️ Укажите имя."), false;
  if (!data.service) return alert("⚠️ Выберите услугу."), false;
  return true;
}

function isSpam(data) {
  // 1) honeypot: если заполнен — это бот
  if (data.website && data.website.length > 0) return true;

  // 2) таймер: если отправили слишком быстро
  const ts = Number(data.form_ts || "0");
  if (!ts) return true; // нет timestamp — подозрительно
  const seconds = (Date.now() - ts) / 1000;
  if (seconds < MIN_SECONDS_BEFORE_SEND) return true;

  return false;
}

function buildText(data) {
  const lines = [
    "Заявка на IT-услугу",
    `Имя: ${data.name || "-"}`,
    data.phone ? `Контакт: ${data.phone}` : null,
    `Услуга: ${data.service || "-"}`,
    data.time ? `Время: ${data.time}` : null,
    data.address ? `Адрес: ${data.address}` : null,
    data.comment ? `Комментарий: ${data.comment}` : null,
    "Отправлено с сайта.",
  ].filter(Boolean);

  return lines.join("\n");
}

function openWhatsApp(data) {
  // анти-спам поля не включаем в сообщение
  const safe = { ...data };
  delete safe.website;
  delete safe.form_ts;

  const msg = encodeURIComponent(buildText(safe));
  window.open(`https://wa.me/${WA_NUMBER}?text=${msg}`, "_blank", "noopener");
}

async function sendToBot(data) {
  const url = new URL(FORM_ENDPOINT);

  // анти-спам поля можно НЕ отправлять на сервер (они для фронта),
  // но если хочешь можно отправлять — оставим только полезные:
  const payload = { ...data };
  delete payload.website;

  Object.entries(payload).forEach(([k, v]) => {
    if (v) url.searchParams.set(k, v);
  });

  await fetch(url.toString(), { method: "GET", mode: "no-cors" });
}

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("requestForm");
  if (!form) return;

  // чтобы Enter не делал submit
  form.addEventListener("submit", (e) => e.preventDefault());

  // запишем timestamp при загрузке/первом открытии формы
  const tsEl = form.querySelector("#form_ts");
  if (tsEl) tsEl.value = String(Date.now());

  const waBtn = document.getElementById("waBtn");
  const tgBtn = document.getElementById("tgBtn");

  if (waBtn) {
    waBtn.addEventListener("click", (e) => {
      e.preventDefault();
      const data = collectFormData(form);

      if (!validate(data)) return;

      if (isSpam(data)) {
        alert("⚠️ Похоже на автоматическую отправку. Попробуйте ещё раз через несколько секунд.");
        return;
      }

      openWhatsApp(data);
    });
  }

  if (tgBtn) {
    tgBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      const data = collectFormData(form);

      if (!validate(data)) return;

      if (isSpam(data)) {
        alert("⚠️ Похоже на автоматическую отправку. Попробуйте ещё раз через несколько секунд.");
        return;
      }

      tgBtn.disabled = true;
      try {
        await sendToBot(data);
        alert("✅ Заявка отправлена в Telegram. Я скоро свяжусь с вами.");
        form.reset();
        // после reset снова ставим ts, чтобы повторная отправка была осмысленной
        if (tsEl) tsEl.value = String(Date.now());
      } catch (err) {
        alert("⚠️ Не удалось отправить в Telegram. Отправьте через WhatsApp.");
        console.error(err);
      } finally {
        tgBtn.disabled = false;
      }
    });
  }

  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();
});

function stars(n){
  n = Math.max(1, Math.min(5, Number(n||5)));
  return "★★★★★".slice(0,n) + "☆☆☆☆☆".slice(0,5-n);
}

function fmtDate(d){
  try{
    const dt = new Date(d);
    if (isNaN(dt)) return "";
    return dt.toLocaleDateString("ru-RU");
  }catch(_){ return ""; }
}

// JSONP loader
function loadJSONP(url) {
  return new Promise((resolve, reject) => {
    const cb = "cb_" + Math.random().toString(36).slice(2);
    const script = document.createElement("script");

    const cleanup = () => {
      try { delete window[cb]; } catch (_) {}
      script.remove();
    };

    window[cb] = (data) => {
      cleanup();
      resolve(data);
    };

    script.onerror = () => {
      cleanup();
      reject(new Error("JSONP load failed (script error)"));
    };

    script.src = url + (url.includes("?") ? "&" : "?") + "callback=" + cb;
    document.body.appendChild(script);

    setTimeout(() => {
      cleanup();
      reject(new Error("JSONP timeout (no response)"));
    }, 8000);
  });
}

async function renderReviews(){
  const track = document.getElementById("reviewsTrack");
  if (!track) return;

  const data = await loadJSONP(`${REVIEWS_ENDPOINT}?action=list`);
  const items = (data && data.items) ? data.items : [];

  track.innerHTML = "";
  if (!items.length){
    track.innerHTML = `<div class="review-skeleton">Пока нет опубликованных отзывов. Будь первым 🙂</div>`;
    return;
  }

  items.forEach(it => {
    const el = document.createElement("div");
    el.className = "review";
    el.innerHTML = `
      <div class="review-head">
        <div class="review-name">${(it.name||"")}</div>
        <div class="review-stars">${stars(it.rating)}</div>
      </div>
      <div class="review-text">${(it.text||"").replace(/</g,"&lt;")}</div>
      <div class="review-date">${fmtDate(it.date)}</div>
    `;
    track.appendChild(el);
  });
}

async function sendReview(){
  try {
    const name = document.getElementById("revName")?.value.trim() || "";
    const rating = document.getElementById("revRating")?.value || "5";
    const text = document.getElementById("revText")?.value.trim() || "";

    if (!name || !text){
      alert("⚠️ Заполните имя и текст отзыва.");
      return;
    }

    const url = `${REVIEWS_ENDPOINT}?action=add&name=${encodeURIComponent(name)}&rating=${encodeURIComponent(rating)}&text=${encodeURIComponent(text)}`;
    const res = await loadJSONP(url);

    if (res && res.ok){
      alert("✅ Спасибо! Отзыв отправлен и появится после модерации.");
      document.getElementById("reviewForm")?.reset();
    } else {
      alert("⚠️ Не удалось отправить отзыв. Проверь Apps Script / доступ.");
      console.log("Ответ сервера:", res);
    }
  } catch (e) {
    console.error("sendReview error:", e);
    alert("⚠️ Ошибка отправки отзыва. Открой консоль (F12) — там причина.");
  }
}


document.addEventListener("DOMContentLoaded", () => {
  // кнопки прокрутки
  const track = document.getElementById("reviewsTrack");
  document.getElementById("revPrev")?.addEventListener("click", () => {
    track?.scrollBy({ left: -360, behavior: "smooth" });
  });
  document.getElementById("revNext")?.addEventListener("click", () => {
    track?.scrollBy({ left: 360, behavior: "smooth" });
  });

  document.getElementById("revSend")?.addEventListener("click", (e) => {
    e.preventDefault();
    sendReview();
  });

  renderReviews();
});
