const WA_NUMBER = "996700020525";
const FORM_ENDPOINT =
  "https://script.google.com/macros/s/AKfycbzRzGsLPM8zG2O75OF0EslZZpV-5QcMDrM2qrpleDjKEJkkWYUA7sdwPlel5EJNTq7A/exec";

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
  };
}

function validate(data) {
  if (!data.name) return alert("⚠️ Укажите имя."), false;
  if (!data.service) return alert("⚠️ Выберите услугу."), false;
  return true;
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
  const msg = encodeURIComponent(buildText(data));
  window.open(`https://wa.me/${WA_NUMBER}?text=${msg}`, "_blank", "noopener");
}

async function sendToBot(data) {
  const url = new URL(FORM_ENDPOINT);
  Object.entries(data).forEach(([k, v]) => {
    if (v) url.searchParams.set(k, v);
  });
  await fetch(url.toString(), { method: "GET", mode: "no-cors" });
}

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("requestForm");
  if (form) form.addEventListener("submit", (e) => e.preventDefault());

  const waBtn = document.getElementById("waBtn");
  const tgBtn = document.getElementById("tgBtn");

  if (waBtn) {
    waBtn.addEventListener("click", (e) => {
      e.preventDefault();
      if (!form) return;

      const data = collectFormData(form);
      if (!validate(data)) return;

      openWhatsApp(data);
    });
  }

  if (tgBtn) {
    tgBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      if (!form) return;

      const data = collectFormData(form);
      if (!validate(data)) return;

      tgBtn.disabled = true;
      try {
        await sendToBot(data);
        alert("✅ Заявка отправлена в Telegram. Я скоро свяжусь с вами.");
        form.reset();
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
