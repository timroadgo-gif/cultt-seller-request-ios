// Seller request 24647849 as a full-screen iOS screen. Copy and the successful timeline come from the web overlay
// (seller-request bundle, request 24647849); pausing mirrors its "Снять с продажи" flow.

const STAGES = [
  { label: "Рассматриваем заявку", state: "done" },
  {
    label: "Предпродажная подготовка",
    state: "current",
    substages: [
      { label: "Передайте лот в THE CULTT", state: "done" },
      { label: "Ваш лот поступил в офис", state: "done" },
      { label: "Проверка на подлинность", state: "done" },
      { label: "Передайте лот в THE CULTT", state: "current", note: "Для ювелирных изделий оформление сделки, подготовка и съёмка может занимать до 14 дней." },
      { label: "Передайте лот в THE CULTT", state: "pending" },
    ],
  },
  { label: "Ваш лот опубликован", state: "pending" },
  { label: "Ваш лот заказали", state: "pending" },
  { label: "Выплата", state: "pending" },
];
// Paused flow (bundle: tone "paused", managerLink): the current stage is kept as done, the pause becomes current.
const PAUSED = { label: "Вы приостановили сделку", state: "current", tone: "paused", note: "Если вы хотите возобновить продажу, ", link: "напишите менеджеру" };
const DISABLED = "Действие отключено в прототипе";

const $ = (id) => document.getElementById(id);
const timeline = $("timeline");
let paused = false;

const STATE_NAME = { done: "выполнено", current: "текущий этап", pending: "впереди" };
const node = (tag, cls, text) => Object.assign(document.createElement(tag), cls ? { className: cls } : {}, text != null ? { textContent: text } : {});

function stagesFor() {
  if (!paused) return STAGES;
  const i = STAGES.findIndex((s) => s.state === "current");
  return [...STAGES.slice(0, i), { ...STAGES[i], state: "done", substages: undefined }, PAUSED];
}

function render() {
  const stages = stagesFor();
  timeline.replaceChildren(
    ...stages.map((s, i) => {
      const nextDone = s.state === "done" && stages[i + 1]?.state === "done";
      const li = node("li", `stage stage--${s.state}${s.tone ? ` stage--${s.tone}` : ""}${nextDone ? " stage--next-done" : ""}`);
      if (s.state === "current") li.setAttribute("aria-current", "step");
      const marker = node("span", "stage__marker");
      marker.setAttribute("aria-hidden", "true");
      const body = node("div", "stage__body");
      const label = node("span", "stage__label", s.label);
      body.append(label, node("span", "sr-only", `, ${STATE_NAME[s.state]}`));
      if (s.note) {
        const p = node("p", "stage__note", s.note);
        if (s.link) {
          const a = node("a", null, s.link);
          a.href = "#";
          a.addEventListener("click", (e) => (e.preventDefault(), toast(DISABLED)));
          p.append(a);
        }
        body.append(p);
      }
      if (s.substages) body.append(subtimeline(s.substages));
      li.append(marker, body);
      return li;
    }),
  );
  $("restore").hidden = !paused;
  $("toolbar").hidden = paused;
  document.body.classList.toggle("is-paused", paused);
}

function subtimeline(items) {
  const ol = node("ol", "steps");
  for (const s of items) {
    const li = node("li", `step step--${s.state}`);
    if (s.state === "current") li.setAttribute("aria-current", "step");
    const dot = node("span", "step__dot");
    dot.setAttribute("aria-hidden", "true");
    const copy = node("div", "step__copy");
    copy.append(node("span", "step__label", s.label), node("span", "sr-only", `, ${STATE_NAME[s.state]}`));
    if (s.note) copy.append(node("p", "step__note", s.note));
    li.append(dot, copy);
    ol.append(li);
  }
  return ol;
}

// Navigation bar: inline title fades in when the large title passes under the bar; the scroll-edge effect only
// appears once content actually scrolls beneath the bar (iOS 26 behaviour).
const nav = $("nav");
const largeTitle = $("requestTitle");
function onScroll() {
  const barBottom = nav.querySelector(".nav__bar").getBoundingClientRect().bottom;
  nav.classList.toggle("is-scrolled", scrollY > 1);
  nav.classList.toggle("has-title", largeTitle.getBoundingClientRect().bottom < barBottom);
}
addEventListener("scroll", onScroll, { passive: true });
addEventListener("resize", onScroll);

$("copy").addEventListener("click", async (e) => {
  const btn = e.currentTarget;
  try { await navigator.clipboard.writeText("24647849"); } catch { /* clipboard unavailable: still confirm visually */ }
  btn.classList.add("is-done");
  setTimeout(() => btn.classList.remove("is-done"), 1400);
});

document.querySelectorAll("[data-disabled]").forEach((b) => b.addEventListener("click", () => toast(DISABLED)));

// Alert: focus moves to the safe action, Escape / Оставить cancel, focus returns to the trigger.
const alertLayer = $("alert");
let alertReturn = null;
function openAlert() {
  alertReturn = document.activeElement === document.body ? $("cancel") : document.activeElement;
  alertLayer.hidden = false;
  document.querySelector(".page").inert = true;
  nav.inert = $("toolbar").inert = true;
  requestAnimationFrame(() => alertLayer.classList.add("is-open"));
  $("alertKeep").focus({ preventScroll: true });
}
function closeAlert() {
  alertLayer.classList.remove("is-open");
  document.querySelector(".page").inert = nav.inert = $("toolbar").inert = false;
  setTimeout(() => (alertLayer.hidden = true), 200);
  (alertReturn?.isConnected && !alertReturn.closest("[hidden]") ? alertReturn : largeTitle).focus?.({ preventScroll: true });
}
$("cancel").addEventListener("click", openAlert);
$("alertKeep").addEventListener("click", closeAlert);
$("alertConfirm").addEventListener("click", () => {
  paused = true;
  render();
  alertReturn = $("restore");
  closeAlert();
  onScroll();
});
alertLayer.addEventListener("click", (e) => e.target === alertLayer && closeAlert());
alertLayer.addEventListener("keydown", (e) => {
  if (e.key === "Escape") return closeAlert();
  if (e.key !== "Tab") return;
  const items = [$("alertKeep"), $("alertConfirm")];
  const i = items.indexOf(document.activeElement);
  e.preventDefault();
  items[(i + (e.shiftKey ? -1 : 1) + items.length) % items.length].focus();
});

$("restore").addEventListener("click", () => {
  paused = false;
  render();
  $("cancel").focus({ preventScroll: true });
  onScroll();
});

let toastTimer = 0;
function toast(text) {
  const t = $("toast");
  t.textContent = text;
  t.classList.add("is-open");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("is-open"), 2200);
}

render();
onScroll();
