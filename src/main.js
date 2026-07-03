import "./style.css";

// the NASA API key comes from the .env file and is injected by Vite at build time
const apiKey = import.meta.env.VITE_NASA_API_KEY;

const app = document.querySelector("#app");

// today's date as YYYY-MM-DD, used as the default and the latest day you can pick
const today = new Date().toISOString().slice(0, 10);

// put the title and date picker at the top, with an empty area for the picture below
app.innerHTML = `
  <h1>NASA Picture of the Day</h1>
  <input type="date" id="datePicker" max="${today}" value="${today}" />
  <div id="content"></div>
`;

const content = document.querySelector("#content");
const datePicker = document.querySelector("#datePicker");

// load a new picture whenever the chosen date changes
datePicker.addEventListener("change", () => loadPicture(datePicker.value));

// load today's picture when the page first opens
loadPicture(today);

function loadPicture(date) {
  const url = `https://api.nasa.gov/planetary/apod?api_key=${apiKey}&date=${date}`;

  content.innerHTML = "<p>Loading...</p>";

  fetch(url)
    .then((response) => response.json())
    .then((data) => {
      // decide how to show the media, since APOD can be an image or a video
      let media;

      if (data.media_type === "image") {
        media = `<img src="${data.url}" alt="${data.title}" />`;
      } else if (isYouTube(data.url)) {
        media = `<iframe src="${data.url}" title="${data.title}" frameborder="0" allowfullscreen></iframe>`;
      } else {
        media = `<video src="${data.url}" controls></video>`;
      }

      // write into the content area so the date picker stays on the page
      content.innerHTML = `
        <h2>${data.title}</h2>
        <p>${data.date}</p>
        ${media}
        <p>${data.explanation}</p>
      `;
    })
    .catch((error) => {
      content.innerHTML = "<p>Sorry, something went wrong loading the picture.</p>";
      console.log(error);
    });
}

// returns true if the link is a YouTube video
function isYouTube(link) {
  return link.includes("youtube.com") || link.includes("youtu.be");
}

// make a shooting star at the given screen position
function createShootingStar(x, y) {
  const star = document.createElement("div");
  star.className = "shooting-star";
  // center the 100x2 streak on the given point so it starts at the cursor
  star.style.left = x - 50 + "px";
  star.style.top = y - 1 + "px";
  document.body.appendChild(star);

  // remove it once the animation ends so they do not pile up
  star.addEventListener("animationend", () => star.remove());
}

// send a shooting star across a random spot every couple of seconds
setInterval(() => {
  // do not spawn while the tab is hidden, or they pile up and all burst through on return
  if (document.hidden) return;
  const x = Math.random() * window.innerWidth;
  const y = Math.random() * window.innerHeight * 0.6;
  createShootingStar(x, y);
}, 2000);

// clicking the background makes a shooting star
document.addEventListener("click", (event) => {
  // ignore clicks on the picture card or the date picker
  if (event.target.closest("#content") || event.target.id === "datePicker") return;
  createShootingStar(event.clientX, event.clientY);
});
