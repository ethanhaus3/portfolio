console.log('IT’S ALIVE!');

function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}


let pages = [
    { url: '', title: 'Home' },
    { url: 'projects/', title: 'Projects' },
    { url: 'contact/', title: 'Contact Me'},
    { url: 'resume/', title: 'Resume'},
    { url: 'https://github.com/ethanhaus3', title: 'Github Profile'}
  ];

let nav = document.createElement('nav');
document.body.prepend(nav);

for (let p of pages) {
    let url = p.url;
    let title = p.title;
    const BASE_PATH = (location.hostname === "localhost" || location.hostname === "127.0.0.1")
  ? "/"                  // Local server
  : "/website/";         // GitHub Pages repo name

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



