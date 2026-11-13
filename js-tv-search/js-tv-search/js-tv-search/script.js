/*
"Talk is cheap. Show me the code."
—Linus Torvalds
*/

// Palabas · WS1 TV Show Search code-along (TVmaze API, no key needed)
// Open DevTools (F12): keep the Console AND the Network tab open.
// Sample or live mode: see config.js.

// ---------- Given: page elements ----------
const form = document.getElementById("searchForm");
const input = document.getElementById("query");
const statusText = document.getElementById("status");
const results = document.getElementById("results");
const dialog = document.getElementById("details");
const detailsBody = document.getElementById("detailsBody");
const closeBtn = document.getElementById("closeDetails");
const modeBadge = document.getElementById("modeBadge");

// ---------- Given: the API's URLs ----------
const API = "https://api.tvmaze.com";

// Turns "Breaking Bad" into "breaking-bad" (used for the sample-data file names)
function slug(text) {
  return text.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

// e.g. https://api.tvmaze.com/search/shows?q=breaking%20bad
function searchURL(query) {
  if (USE_SAMPLE_DATA) return `data/search/${slug(query)}.json`;
  return `${API}/search/shows?q=${encodeURIComponent(query)}`;
}

// e.g. https://api.tvmaze.com/shows/169
function showURL(id) {
  return USE_SAMPLE_DATA ? `data/shows/${id}.json` : `${API}/shows/${id}`;
}

// e.g. https://api.tvmaze.com/shows/169/cast
function castURL(id) {
  return USE_SAMPLE_DATA ? `data/cast/${id}.json` : `${API}/shows/${id}/cast`;
}

// e.g. https://api.tvmaze.com/shows/169/seasons
function seasonsURL(id) {
  return USE_SAMPLE_DATA ? `data/seasons/${id}.json` : `${API}/shows/${id}/seasons`;
}

// ---------- Given: helpers (no need to change) ----------

// Shows a message under the search box. type: "info", "loading" or "error"
function setStatus(message, type = "info") {
  statusText.textContent = message;
  statusText.className = "status " + type;
}

// Makes an element with an optional class and text: el("span", "year", "2008")
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

// A poster <img>, or a placeholder when the show has no image (image is null)
function createPoster(show, size = "medium") {
  if (!show.image) {
    return el("span", "poster none", "No poster");
  }
  const img = el("img", "poster");
  img.src = show.image[size] || show.image.medium;
  img.alt = `Poster: ${show.name}`;
  img.loading = "lazy";
  img.addEventListener("error", () => img.replaceWith(el("span", "poster none", "No poster")));
  return img;
}

// "2008–2013", or "2016–" for a show that is still running
function yearRange(show) {
  const start = show.premiered ? show.premiered.slice(0, 4) : "?";
  const end = show.ended ? show.ended.slice(0, 4) : "";
  return `${start}–${end}`;
}

// TVmaze summaries contain HTML like "<p><b>Friends</b> follows…</p>".
// This keeps only the text. (Never put text from an API into innerHTML:
// if it contained a <script> or an onerror, it could run on your page.)
function stripTags(html) {
  if (!html) return "No summary yet.";
  return new DOMParser().parseFromString(html, "text/html").body.textContent;
}

// Close the details pop-up (Step 4) with the × button or by clicking outside it
closeBtn.addEventListener("click", () => dialog.close());
dialog.addEventListener("click", (event) => {
  if (event.target === dialog) dialog.close();
});

// Show which mode we're in
modeBadge.textContent = USE_SAMPLE_DATA ? "Sample data" : "Live · TVmaze";
modeBadge.classList.toggle("live", !USE_SAMPLE_DATA);

// STEP 1 — Your first API request
// TODO: async function testRequest(): fetch searchURL("friends"), log the status and the JSON array

/*
  TASK 1: since Task 2 is already implemented dapat BURAHIN ang Task 1 code
  para ma prevent or maiwasan ito from running every time the file is saved and
  consuming unnecessary requests.

  // Example: Nagpapadala ng isang request para sa "friends" and the console print it.

  async function testRequest() {
    const url = searchURL("friends");
    console.log("Request URL:", url);

    const response = await fetch(url);           // waiting for the response
    console.log("Status:", response.status); 
    console.log("response.ok:", response.ok);    // true if 200-299 ang status

    const data = await response.json();          // this part nmn nag wait ng response or mabasa ng JSON
    console.log("Data:", data);                 
    console.log("Length:", data.length);     
    console.log("First show:", data[0].show.name, "| premiered:", data[0].show.premiered);
  }
  testRequest();
*/

// STEP 2 — Search and show the results
// TODO: renderResults(items), searchShows(query), and a submit listener on the form

// This function creates a card for each search result. It first clears the
// previous results, then displays each show's poster, title, year, genres,
// and rating. It also stores the show's ID in data-id to identify the
// selected show when a card is clicked.

function renderResults(items) {
  results.innerHTML = "";                     // erase the old card

  items.forEach((item) => {                 
    const show = item.show;                  

    const card = el("button", "card");        
    card.type = "button";
    card.dataset.id = show.id;              

    const rating = show.rating.average;  
    card.append(
      createPoster(show),
      el("span", "title", show.name),
      el("span", "year", yearRange(show)),
      el("span", "genres", show.genres.join(", ")),
      el("span", "rating", rating ? `★ ${rating}` : "Not rated yet")
    );

    results.appendChild(card);
  });
}

// This runs kapag pinindot ang Search button o enter sa search box.
// 1 preventDefault() para hindi mag-reload ang page
// 2 trim() nmn for getting ung na type
// 3 (return) if maung laog and if meron it calls searchShows.

form.addEventListener("submit", (event) => {
  event.preventDefault();                    
  const query = input.value.trim();           
  if (query === "") return;                   
  searchShows(query);
});

// STEP 3 — getJSON(): one careful helper for every request
// TODO: catch network errors, check 429 and response.ok; rewrite searchShows with try / catch and an empty-array check

// This function ang naghandle ng data from all requests tapus tig returns the JSON data
// if the request is successful and If an error occursit will show a clear error message
// para ma notice ng user tapus it also handles internet connection problems
// Since fetch only rejects when there is no response
// we need to check response.status and response.ok manually. and then
// If the server returns 429, it waits for 2 seconds and retries once before throwing an error.

async function getJSON(url, isRetry = false) {
  let response;
  try {
    response = await fetch(url);
  } catch (networkError) {
    // Walang internet and uni din ang nagrereject ang fetch kaya dito mapupunta
    throw new Error("Can't reach TVmaze. Check your internet, or set USE_SAMPLE_DATA = true in config.js.");
  }

  if (response.status === 429) {
    // 429 = sobrang daming request (mga 20 lang kada 10 segundo ang pinapayagan)
    if (!isRetry) {
      // ADDED (Extend · Option A): unang beses pa lang, kaya maghintay at subukan ulit
      setStatus("Busy, retrying…", "loading");                 
      await new Promise((r) => setTimeout(r, 2000));           // maghintay ng 2 secs (2000 ms)
      return getJSON(url, true);                              
    }
    // 2nd 429 na ito and at magpakita ng error
    throw new Error("Too many requests (429). Wait 10 seconds and try again.");
  }

  if (!response.ok) {
   
    throw new Error(
      USE_SAMPLE_DATA
        ? "Sample mode only knows: friends, office, breaking bad, stranger things, sherlock, thrones, sample."
        : `Request failed (HTTP ${response.status}).`
    );
  }

  return response.json();                   
}

async function searchShows(query) {
  setStatus(`Searching for "${query}"…`, "loading");   // ipakita ang spinner or loading screen
  results.innerHTML = "";                              

  try {
    const data = await getJSON(searchURL(query));

  
    if (data.length === 0) {
      setStatus(`No shows found for "${query}". Check the spelling.`, "error");
      return;
    }

    renderResults(data);
    setStatus(`${data.length} ${data.length === 1 ? "show" : "shows"} found for "${query}"`); 

  } catch (error) {
    setStatus(error.message, "error");                
  }
}

// STEP 4 — Click a show to see its details
// TODO: one click listener on #results, showDetails(id), renderDetails(show)

// This adds one click event listener to the #results container instead of
// assigning a separate listener to each card. It uses closest(".card") to find
// the clicked card, kahit sa poster or title mismo nag-click ang user.
// It also works for newly generated cards after another search.
// Once the card is identified, it gets the show's ID from data-id and
// passes it to showDetails() to display the show's information.

results.addEventListener("click", (event) => {
  const card = event.target.closest(".card");
  if (card) showDetails(card.dataset.id);
});

// STEP 5 — Promise.all: show + cast + seasons at the same time
// TODO: rewrite showDetails with Promise.all, and renderDetails(show, cast, seasons)

// This function opens the pop-up and fetches the show's details, cast, and seasons
// simultaneously using Promise.all, para mas mabilis kaysa mag-request one by one.
// It also measures and logs the total loading time in milliseconds.
// Once all requests are successful, it passes the three results to renderDetails().
// If any request fails, it displays the error message inside the pop-up.

async function showDetails(id) {
  detailsBody.replaceChildren(el("p", "status loading", "Loading details…"));   // Loading Message
  dialog.showModal();                                                           // pop-up

  try {
    const start = performance.now();                    
    const [show, cast, seasons] = await Promise.all([   
      getJSON(showURL(id)),
      getJSON(castURL(id)),
      getJSON(seasonsURL(id)),
    ]);
    console.log(`3 requests in ${Math.round(performance.now() - start)} ms`);
    renderDetails(show, cast, seasons);
  } catch (error) {
    detailsBody.replaceChildren(el("p", "status error", error.message));
  }
}

// This function builds the content of the pop-up, including the large poster,
// show title, year, network, number of seasons, runtime, genres, rating, and summary.
// It also displays up to 6 cast members with their character names and adds
// a link to the show's TVmaze page. It uses stripTags() to display the summary
// as plain text instead of using innerHTML. It also handles missing values
// such as network, runtime, and rating.

function renderDetails(show, cast, seasons) {
  // If the show has no network, it checks the webChannel instead.
  // If both are unavailable, it returns an empty string.
  const where = show.network ? show.network.name : show.webChannel ? show.webChannel.name : "";
  // If runtime is null, it uses averageRuntime as an alternative.
  const minutes = show.runtime || show.averageRuntime;
  // Displays "1 season" for one season and "5 seasons" for multiple seasons.
  const seasonText = seasons.length === 1 ? "1 season" : `${seasons.length} seasons`;

  const info = el("div", "info");
  info.append(
    el("h2", "", show.name),
    // filter(Boolean) removes empty values to avoid extra " · " separators.
    el("p", "meta", [yearRange(show), where, seasonText, minutes ? `${minutes} min` : ""].filter(Boolean).join(" · ")),
    el("p", "meta", show.genres.join(", ")),
    el("p", "score", show.rating.average ? `★ ${show.rating.average} / 10` : "Not rated yet"),
    el("p", "plot", stripTags(show.summary))            // Displays plain text instead of using innerHTML.
  );

  // Displays the first 6 cast members with their character names.
  // Example: "Bryan Cranston as Walter White".
  if (cast.length > 0) {
    const list = el("ul", "cast");
    cast.slice(0, 6).forEach((member) => {
      const li = el("li", "", member.person.name + " ");
      li.append(el("span", "", "as " + member.character.name));
      list.append(li);
    });
    info.append(el("h3", "", "Cast"), list);
  }

  // Creates a link to the show's TVmaze page, which opens in a new tab.
  const links = el("p", "links");
  const tvmaze = el("a", "", "View on TVmaze ↗");
  tvmaze.href = show.url;
  tvmaze.target = "_blank";
  links.append(tvmaze);
  info.append(links);

  detailsBody.replaceChildren(createPoster(show, "original"));  
  // Dizon: I used AI to help correct the grammar and improve the clarity of the 
  //code comments without changing the actual code we as a pair created.
}