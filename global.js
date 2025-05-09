console.log('IT’S ALIVE!');

const BASE_PATH =
  location.hostname === "localhost" || location.hostname === "127.0.0.1"
    ? "/"
    : "/portfolio/";

function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}


let pages = [
    { url: '', title: 'Home' },
    { url: 'projects/', title: 'Projects' },
    { url: 'contact/', title: 'Contact Me'},
    { url: 'resume/', title: 'Resume'},
    { url: 'https://github.com/ethanhaus3', title: 'Github Profile'},
    { url: 'meta/', title: 'Meta'}
  ];

let nav = document.createElement('nav');
document.body.prepend(nav);

for (let p of pages) {
    let url = p.url;
    let title = p.title;
    const BASE_PATH = (location.hostname === "localhost" || location.hostname === "127.0.0.1")
      ? "/"                  // Local server
      : "/portfolio/";         // GitHub Pages repo name

    url = !url.startsWith('http') ? BASE_PATH + url : url;
    let a = document.createElement('a');
    a.href = url;
    a.textContent = title;
    nav.append(a);
  }


const navLinks = $$("nav a");

for (let a of navLinks) {
    console.log(`Link: ${a.href} → host: ${a.host} vs current: ${location.host}`);
  }
  

for (let a of navLinks) {
    const isExternal = a.host !== location.host;

    // Add 'current' class if it matches the current page
    a.classList.toggle("current", a.host === location.host && a.pathname === location.pathname);
  
    console.log(`Checking: ${a.href} — external? ${isExternal}`);

  // Add target if it's external
  if (isExternal) {
    a.setAttribute("target", "_blank");
    a.setAttribute("rel", "noopener");
  }
  }



document.body.insertAdjacentHTML(
  'afterbegin',
  `
  <label class="color-scheme">
    Theme:
    <select id="scheme-select">
      <option value="auto">Automatic</option>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
    </select>
  </label>
`
);

// Grab the select element
const schemeSelect = document.getElementById("scheme-select");

// Load any saved preference
const savedScheme = localStorage.getItem("preferred-color-scheme");
if (savedScheme) {
  schemeSelect.value = savedScheme;
  if (savedScheme === "auto") {
    document.documentElement.style.removeProperty("color-scheme");
  } else {
    document.documentElement.style.setProperty("color-scheme", savedScheme);
  }
}

// Save and apply changes when user selects a different theme
schemeSelect.addEventListener("change", () => {
  const scheme = schemeSelect.value;
  localStorage.setItem("preferred-color-scheme", scheme);

  if (scheme === "auto") {
    document.documentElement.style.removeProperty("color-scheme");
  } else {
    document.documentElement.style.setProperty("color-scheme", scheme);
  }
  localStorage.colorScheme = event.target.value;
});

export async function fetchJSON(url) {
  try {
    // Fetch the JSON file from the given URL
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch projects: ${response.statusText}`);
    }
    const data = await response.json();
    return data;
    console.log(response);
  } catch (error) {
    console.error('Error fetching or parsing JSON data:', error);
  }
}

export function renderProjects(project, containerElement, headingLevel = 'h2') {
  containerElement.innerHTML = '';

  const projectsTitle = document.querySelector(".projects-title");
  if (projectsTitle) {
    projectsTitle.textContent = `${project.length} Projects`;
  }


  project.forEach(project => {
    // Create the article element
    const article = document.createElement('article');

    // Create the inner HTML for the article
    article.innerHTML = `
      <${headingLevel}>${project.title}</${headingLevel}>
      <img src="${project.image}" alt="${project.title}">
      <p>${project.description}<br> <span style="color: grey;">${project.year}</span></p>
    `;

    // Append the article to the container element
    containerElement.appendChild(article);
  });
};

export async function fetchGithubData(username) {
  return fetchJSON(`https://api.github.com/users/${username}`);
}


