import "./style.css";

// The NASA API key comes from the .env file and is injected by Vite at build time. It is never hardcoded here
const apiKey = import.meta.env.VITE_NASA_API_KEY;
const url = `https://api.nasa.gov/planetary/apod?api_key=${apiKey}`;

const app = document.querySelector("#app");

// Show a loading message while we wait for the data to come back
app.innerHTML = "<p>Loading today's picture...</p>";

fetch(url)
  .then((response) => response.json())
  .then((data) => {
    // Decide how to show the media, since APOD can be an image or a video
    let media;

    if (data.media_type === "image") {
      // A normal picture
      media = `<img src="${data.url}" alt="${data.title}" />`;
    } else if (isYouTube(data.url)) {
      // A YouTube video has to go in an iframe, not a video tag
      media = `<iframe src="${data.url}" title="${data.title}" frameborder="0" allowfullscreen></iframe>`;
    } else {
      // Some other kind of video we can play directly
      media = `<video src="${data.url}" controls></video>`;
    }

    // Build the whole page in one string, then set it once
    app.innerHTML = `
      <h1>${data.title}</h1>
      <p>${data.date}</p>
      ${media}
      <p>${data.explanation}</p>
    `;
  })
  .catch((error) => {
    // If anything goes wrong, show a message instead of a blank page
    app.innerHTML = "<p>Sorry, something went wrong loading the picture.</p>";
    console.log(error);
  });

// Returns true if the link is a YouTube video
function isYouTube(link) {
  return link.includes("youtube.com") || link.includes("youtu.be");
}