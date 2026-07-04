# NASA Picture of the Day

A small web page that shows NASA's Astronomy Picture of the Day (APOD), the day's title, image (or video), and explanation pulled live from NASA's public API.

**Live demo:** https://flyingchickensaucer.github.io/NASA_Site/

![Screenshot of the page](screenshot.png)

## What it does

- Fetches the Astronomy Picture of the Day from the NASA APOD API
- Shows the title, the media (image, video, or embedded YouTube), and NASA's explanation for it
- Lets you pick any past date to view that day's picture
- Has an animated starfield with shooting stars, and clicking the background launches one
- Defaults to today's entry each time it loads

## Tech used

- **Vite** - build tool / dev server
- **Vanilla JavaScript, HTML, and CSS** - no framework
- **NASA APOD API** - the data source
- **GitHub Pages + GitHub Actions** - hosting and automatic deploys

## Run it locally

1. Make sure you have Node.js v20+ installed.
2. Clone the repo and install dependencies:
   ```bash
   git clone https://github.com/flyingchickensaucer/NASA_Site.git
   cd NASA_Site
   npm install
   ```
3. Get a free API key from https://api.nasa.gov and create a `.env` file in the
   project root:
   ```
   VITE_NASA_API_KEY=your_key_here
   ```
   (See `.env.example` for the format. The `.env` file is git-ignored so your key
   is never committed.)
4. Start the dev server:
   ```bash
   npm run dev
   ```
   Then open the URL it prints (e.g. http://localhost:5173/NASA_Site/).

## How the deploy works

Pushing to the `main` branch triggers a GitHub Actions workflow that installs dependencies, runs `npm run build`, and publishes the `dist/` folder to GitHub Pages. The NASA API key is injected at build time from a GitHub Actions secret (`VITE_NASA_API_KEY`), so it never appears in the source code.
