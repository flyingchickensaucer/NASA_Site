import "./style.css";

// the NASA API key comes from the .env file and is injected by Vite at build time
// fall back to NASA's public DEMO_KEY so the page still works without a key set
const apiKey = import.meta.env.VITE_NASA_API_KEY || "DEMO_KEY";

// APOD only has entries from this date onward, so it is the floor for navigation
const MIN_DATE = "1995-06-16";
const MEMO_KEY = "apod-memos";

const app = document.querySelector("#app");

// today in UTC as YYYY-MM-DD, the default view and the latest pickable day
const today = new Date().toISOString().slice(0, 10);
let currentDate = today;
let memoEditing = false;

// static shell, the entry and notes list are filled in later
app.innerHTML = `
  <h1>Picture of the Day</h1>
  <div class="controls">
    <button id="prev" class="nav-arrow" title="Previous day" aria-label="Previous day">&lsaquo;</button>
    <input type="date" id="datePicker" min="${MIN_DATE}" max="${today}" value="${today}" aria-label="Pick a date" />
    <button id="next" class="nav-arrow" title="Next day" aria-label="Next day">&rsaquo;</button>
    <button id="random">Surprise me</button>
  </div>
  <main id="content"></main>
  <section class="notebook">
    <p class="notebook-label">Your notes</p>
    <div id="noteList"></div>
  </section>
`;

const content = document.querySelector("#content");
const datePicker = document.querySelector("#datePicker");
const prevBtn = document.querySelector("#prev");
const nextBtn = document.querySelector("#next");
const randomBtn = document.querySelector("#random");
const noteList = document.querySelector("#noteList");

// picking a date loads that day
datePicker.addEventListener("change", () => goTo(datePicker.value));

// step one day at a time
prevBtn.addEventListener("click", () => goTo(addDays(currentDate, -1)));
nextBtn.addEventListener("click", () => goTo(addDays(currentDate, 1)));

// left/right arrows do the same, unless you are typing in a field
document.addEventListener("keydown", (event) => {
  const el = document.activeElement;
  if (el === datePicker || el.tagName === "TEXTAREA") return;
  if (event.key === "ArrowLeft") goTo(addDays(currentDate, -1));
  if (event.key === "ArrowRight") goTo(addDays(currentDate, 1));
});

// jump to a random valid day
randomBtn.addEventListener("click", () => goTo(randomDate()));

// clicking a note opens its day, clicking its remove button deletes it
noteList.addEventListener("click", (event) => {
  const chip = event.target.closest(".note-chip");
  if (!chip) return;
  const date = chip.dataset.date;
  if (event.target.classList.contains("note-remove")) {
    setMemo(date, "");
    renderNotes();
    if (currentDate === date) {
      memoEditing = false;
      loadPicture(currentDate);
    }
  } else {
    goTo(date);
  }
});

// first paint
renderNotes();
loadPicture(today);

// central place to change the day: clamp, sync the picker, drop any open editor, fetch
function goTo(date) {
  if (date < MIN_DATE) date = MIN_DATE;
  if (date > today) date = today;
  currentDate = date;
  datePicker.value = date;
  memoEditing = false;
  loadPicture(date);
}

function loadPicture(date) {
  const url = `https://api.nasa.gov/planetary/apod?api_key=${apiKey}&date=${date}`;

  content.innerHTML = `<p class="status">Loading…</p>`;
  updateNav();

  fetch(url)
    .then((response) => response.json())
    .then((data) => {
      // APOD can be an image or a video, so pick the right element
      let media;
      if (data.media_type === "image") {
        media = `<img src="${data.url}" alt="${data.title}" />`;
      } else if (isYouTube(data.url)) {
        media = `<iframe src="${data.url}" title="${data.title}" allowfullscreen></iframe>`;
      } else {
        media = `<video src="${data.url}" controls></video>`;
      }

      const credit = data.copyright ? ` &middot; &copy; ${data.copyright.trim()}` : "";
      // the API hands us a hi-res url for images
      const hdLink =
        data.media_type === "image" && data.hdurl
          ? `<a class="hd" href="${data.hdurl}" target="_blank" rel="noopener">View in HD ↗</a>`
          : "";

      content.innerHTML = `
        <article class="entry">
          ${anniversaryHtml(data.date)}
          <div class="media">${media}</div>
          <div class="entry-head"><h2>${data.title}</h2></div>
          <p class="meta">${formatDate(data.date)}${credit}</p>
          <p class="explanation">${data.explanation}</p>
          ${hdLink}
          ${memoHtml(data.date)}
        </article>
      `;

      wireMemo(data.date);
    })
    .catch((error) => {
      content.innerHTML = `<p class="status">Couldn't load this day. Try another date.</p>`;
      console.log(error);
    });
}

// grey out prev/next when there is nowhere further to go
function updateNav() {
  prevBtn.disabled = currentDate <= MIN_DATE;
  nextBtn.disabled = currentDate >= today;
}

// --- anniversary notes ---

// notes on the same month-day from an earlier year than the one shown
function anniversaries(date) {
  const md = date.slice(5);
  const year = +date.slice(0, 4);
  return loadMemos()
    .filter((m) => m.date.slice(5) === md && +m.date.slice(0, 4) < year)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

function anniversaryHtml(date) {
  return anniversaries(date)
    .map((m) => {
      const yrs = +date.slice(0, 4) - +m.date.slice(0, 4);
      return `
        <div class="anniv">
          <span class="spark">&#9733;</span>
          <span>
            <span class="when">${yrs} year${yrs > 1 ? "s" : ""} ago &middot; ${formatMonthDay(m.date)}</span>
            <span class="note-text">${escapeHtml(m.text)}</span>
          </span>
        </div>`;
    })
    .join("");
}

// the note block under the picture: existing note, an editor, or the add button
function memoHtml(date) {
  const memo = getMemo(date);
  if (memoEditing) {
    return `
      <div class="memo">
        <p class="memo-label">${memo ? "Edit your note" : "Add a note"}</p>
        <div class="memo-editor">
          <textarea id="memoInput" placeholder="What happened on this day? It'll come back to you next year…">${memo ? escapeHtml(memo.text) : ""}</textarea>
          <div class="memo-actions">
            <button id="saveMemo" class="primary">Save note</button>
            <button id="cancelMemo">Cancel</button>
          </div>
        </div>
      </div>`;
  }
  if (memo) {
    return `
      <div class="memo">
        <p class="memo-label">Your note &middot; comes back every ${formatMonthDay(date)}</p>
        <p class="memo-text">${escapeHtml(memo.text)}</p>
        <div class="memo-actions">
          <button id="editMemo">Edit</button>
          <button id="deleteMemo">Delete</button>
        </div>
      </div>`;
  }
  return `
    <div class="memo">
      <button id="addMemo" class="memo-add">＋ Add a note to this day</button>
    </div>`;
}

function wireMemo(date) {
  const add = document.querySelector("#addMemo");
  const edit = document.querySelector("#editMemo");
  const del = document.querySelector("#deleteMemo");
  const save = document.querySelector("#saveMemo");
  const cancel = document.querySelector("#cancelMemo");
  if (add) add.addEventListener("click", () => { memoEditing = true; loadPicture(date); });
  if (edit) edit.addEventListener("click", () => { memoEditing = true; loadPicture(date); });
  if (del) del.addEventListener("click", () => { setMemo(date, ""); memoEditing = false; loadPicture(date); renderNotes(); });
  if (cancel) cancel.addEventListener("click", () => { memoEditing = false; loadPicture(date); });
  if (save) save.addEventListener("click", () => {
    setMemo(date, document.querySelector("#memoInput").value);
    memoEditing = false;
    loadPicture(date);
    renderNotes();
  });
  if (memoEditing) {
    const t = document.querySelector("#memoInput");
    if (t) t.focus();
  }
}

function renderNotes() {
  const list = loadMemos().sort((a, b) => (a.date < b.date ? 1 : -1));
  if (list.length === 0) {
    noteList.innerHTML = `<p class="notes-empty">No notes yet. Open any day and jot one down. It returns to you on that date next year.</p>`;
    return;
  }
  noteList.innerHTML = list
    .map((m) => {
      const snip = m.text.length > 60 ? m.text.slice(0, 60) + "…" : m.text;
      return `
        <div class="note-chip" data-date="${m.date}">
          <button class="note-open">
            <span class="note-date">${formatDate(m.date)}</span>
            <span class="note-snippet">${escapeHtml(snip)}</span>
          </button>
          <button class="note-remove" title="Delete" aria-label="Delete">×</button>
        </div>`;
    })
    .join("");
}

// --- memo storage in localStorage ---

function loadMemos() {
  try {
    return JSON.parse(localStorage.getItem(MEMO_KEY)) || [];
  } catch {
    return [];
  }
}

function saveMemos(list) {
  localStorage.setItem(MEMO_KEY, JSON.stringify(list));
}

function getMemo(date) {
  return loadMemos().find((m) => m.date === date);
}

function setMemo(date, text) {
  const list = loadMemos().filter((m) => m.date !== date);
  if (text.trim()) list.push({ date, text: text.trim() });
  saveMemos(list);
}

// --- small helpers ---

// stop user text from breaking the markup when written into the page
function escapeHtml(s) {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

// shift a YYYY-MM-DD string by whole days, done in UTC to avoid timezone drift
function addDays(dateStr, delta) {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

// a random day between the first APOD and today
function randomDate() {
  const start = Date.parse(MIN_DATE + "T00:00:00Z");
  const end = Date.parse(today + "T00:00:00Z");
  const t = start + Math.random() * (end - start);
  return new Date(t).toISOString().slice(0, 10);
}

// "2026-07-04" -> "July 4, 2026"
function formatDate(str) {
  return new Date(str + "T00:00:00Z").toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

// "2026-07-04" -> "July 4"
function formatMonthDay(str) {
  return new Date(str + "T00:00:00Z").toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

function isYouTube(link) {
  return link.includes("youtube.com") || link.includes("youtu.be");
}

// ambient shooting stars, kept occasional
function shootingStar(x, y) {
  const star = document.createElement("div");
  star.className = "shooting-star";
  star.style.left = x - 45 + "px";
  star.style.top = y - 1 + "px";
  document.body.appendChild(star);
  star.addEventListener("animationend", () => star.remove());
}

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
if (!reduceMotion) {
  setInterval(() => {
    // do not spawn while the tab is hidden, or they pile up and burst on return
    if (document.hidden) return;
    shootingStar(Math.random() * window.innerWidth, Math.random() * window.innerHeight * 0.6);
  }, 3500);
}
