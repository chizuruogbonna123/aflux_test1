// AFLUX storefront. Hash-routed single page: #/ , #/shop, #/product/<id>, #/cart, #/checkout ...
const $ = (s, r = document) => r.querySelector(s);
const app = $("#app");

/* ---------- Currency and country selector ---------- */
const ngn = (n) => "₦" + n.toLocaleString("en-NG");
// [name, flag code, currency, locale]. Add or remove countries here.
const COUNTRIES = [
  ["Nigeria", "ng", "NGN", "en-NG"],
  ["Ghana", "gh", "GHS", "en-GH"],
  ["Kenya", "ke", "KES", "en-KE"],
  ["South Africa", "za", "ZAR", "en-ZA"],
  ["Egypt", "eg", "EGP", "en-EG"],
  ["Togo", "tg", "XOF", "fr-FR"],
  ["United States", "us", "USD", "en-US"],
  ["Canada", "ca", "CAD", "en-CA"],
  ["United Kingdom", "gb", "GBP", "en-GB"],
  ["Ireland", "ie", "EUR", "en-IE"],
  ["France", "fr", "EUR", "fr-FR"],
  ["Germany", "de", "EUR", "de-DE"],
  ["Italy", "it", "EUR", "it-IT"],
  ["Spain", "es", "EUR", "es-ES"],
  ["Netherlands", "nl", "EUR", "nl-NL"],
  ["Australia", "au", "AUD", "en-AU"],
  ["United Arab Emirates", "ae", "AED", "en-AE"],
  ["India", "in", "INR", "en-IN"],
  ["Japan", "jp", "JPY", "ja-JP"],
  ["Brazil", "br", "BRL", "pt-BR"],
];
let rates = JSON.parse(localStorage.getItem("aflux_rates") || "{}");
let country =
  COUNTRIES.find((c) => c[1] === localStorage.getItem("aflux_country")) ||
  COUNTRIES[0];
const rateFor = (code) =>
  code === "NGN" ? 1 : (rates.r && rates.r[code]) || 0;
function money(n) {
  const r = rateFor(country[2]);
  return new Intl.NumberFormat(r ? country[3] : "en-NG", {
    style: "currency",
    currency: r ? country[2] : "NGN",
    maximumFractionDigits: 0,
  }).format(n * (r || 1));
}
async function loadRates() {
  if (rates.t && Date.now() - rates.t < 43200000) return; // reuse saved rates for 12 hours
  try {
    const data = await (
      await fetch("https://open.er-api.com/v6/latest/NGN")
    ).json();
    if (data.rates) {
      rates = { t: Date.now(), r: data.rates };
      localStorage.setItem("aflux_rates", JSON.stringify(rates));
      // Only re-render pages that show prices, so forms and selections aren't reset
      const h = location.hash;
      if (
        country[2] !== "NGN" &&
        (!h || h === "#/" || /^#\/(shop|search|product|cart|favorites)/.test(h))
      )
        route();
    }
  } catch (e) {
    /* if rates can't load, prices stay in NGN */
  }
}
const flag = (c) =>
  `<img src="https://flagcdn.com/24x18/${c[1]}.png" width="24" height="18" alt="">`;
const paintCountryBtn = () => {
  const h = `${flag(country)} ${country[2]}`;
  $("#countryBtn").innerHTML = h;
  $("#navCountry").innerHTML = `Currency: ${h} <i class="chev"></i>`;
};
document.body.insertAdjacentHTML(
  "beforeend",
  `<dialog id="countryDlg" aria-labelledby="cTitle"><button class="x" id="cClose" aria-label="Close">×</button>
  <h2 id="cTitle">Select your country</h2><p>Select a country or region below to shop in your local currency.</p>
  <div class="csel"><button type="button" class="cbox" id="cBox" aria-expanded="false"></button>
  <div class="cpanel" id="cPanel" hidden><input id="cSearch" type="search" placeholder="Search for a country…" aria-label="Search for a country"><ul id="cList"></ul></div></div>
  <button class="btn block" id="cUpdate">UPDATE</button>
  <p class="tag" style="margin:1rem 0 0">Prices are converted for reference. Orders are charged in NGN. Rates by <a href="https://www.exchangerate-api.com" target="_blank" rel="noopener"><u>ExchangeRate-API</u></a>.</p></dialog>`,
);
let pick = country;
const dlg = $("#countryDlg");
const paintBox = () =>
  ($("#cBox").innerHTML = `${flag(pick)} ${pick[0]} (${pick[2]})`);
function paintList(q = "") {
  const list = COUNTRIES.filter((c) =>
    c[0].toLowerCase().includes(q.toLowerCase()),
  );
  $("#cList").innerHTML =
    list
      .map(
        (c) =>
          `<li><button type="button" data-cc="${c[1]}">${flag(c)} ${c[0]} (${c[2]})</button></li>`,
      )
      .join("") || `<li class="tag" style="padding:.8rem">No match.</li>`;
}
$("#countryBtn").onclick = () => {
  pick = country;
  paintBox();
  $("#cPanel").hidden = true;
  dlg.showModal();
};
$("#cBox").onclick = () => {
  const opening = $("#cPanel").hidden;
  $("#cPanel").hidden = !opening;
  $("#cBox").setAttribute("aria-expanded", opening);
  if (opening) {
    $("#cSearch").value = "";
    paintList();
    $("#cSearch").focus();
  }
};
$("#cSearch").oninput = (e) => paintList(e.target.value);
$("#cList").onclick = (e) => {
  const b = e.target.closest("[data-cc]");
  if (!b) return;
  pick = COUNTRIES.find((c) => c[1] === b.dataset.cc);
  paintBox();
  $("#cPanel").hidden = true;
  $("#cBox").setAttribute("aria-expanded", "false");
};
$("#cClose").onclick = () => dlg.close();
$("#cUpdate").onclick = () => {
  country = pick;
  localStorage.setItem("aflux_country", country[1]);
  pushSync();
  paintCountryBtn();
  dlg.close();
  const h = location.hash;
  if (h.startsWith("#/checkout"))
    $("#sum").innerHTML = summary(
      ($("[name=ship]:checked") || {}).value || "standard",
    );
  else if (!h.startsWith("#/admin")) route();
};
const priceOf = (p) => p.sale || p.price;
const byId = (id) => PRODUCTS.find((p) => p.id === id);
const esc = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (ch) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        ch
      ],
  );

let productsReady;
function loadProducts() {
  return (productsReady ||= (async () => {
    try {
      const { data, error } = await db.from("products").select("*").order("created_at", { ascending: false });
      if (!error && data && data.length) {
        PRODUCTS.splice(0, PRODUCTS.length, ...data.map((r) => ({
          id: r.id, name: r.name, cat: r.cat, price: r.price, sale: r.sale || undefined,
          colors: r.colors, sizes: r.sizes, desc: r.descr, details: r.details, care: r.care,
          images: r.images && r.images.length ? r.images : undefined,
          soldOut: r.sold_out, pop: r.popularity, date: (r.created_at || "").slice(0, 10),
        })));
      }
    } catch (e) { /* if the database can't be reached, the products in data.js are used */ }
    cart = cart.filter((i) => byId(i.id)); // drop products that no longer exist
    saveCart();
  })());
}
const SITE = {};
let siteReady;
function loadSite() {
  return (siteReady ||= (async () => {
    try {
      const { data } = await db.from("site_content").select("value").eq("key", "site").maybeSingle();
      if (data && data.value) Object.assign(SITE, data.value);
    } catch (e) { /* the built-in text is used */ }
    const bar = $(".announce");
    if (bar && SITE.announce) bar.textContent = SITE.announce;
  })());
}
const S = (g, k, d) => ((SITE[g] && SITE[g][k]) || "").trim() || d;

const SETTINGS = { freeOver: 100000, standard: 5000, express: 12000 };
let settingsReady;
function loadSettings() {
  return (settingsReady ||= (async () => {
    try {
      const { data } = await db.from("site_content").select("value").eq("key", "settings").maybeSingle();
      const v = data && data.value;
      if (v) {
        ["freeOver", "standard", "express"].forEach((k) => { if (typeof v[k] === "number") SETTINGS[k] = v[k]; });
        if (Array.isArray(v.codes)) {
          Object.keys(DISCOUNT_CODES).forEach((k) => delete DISCOUNT_CODES[k]);
          v.codes.forEach((c) => { DISCOUNT_CODES[c.code] = c.percent / 100; });
        }
      }
    } catch (e) { /* the built-in values are used */ }
  })());
}

/* ---------- Cart (localStorage: product ids, size, colour, qty only) ---------- */
let cart = JSON.parse(localStorage.getItem("aflux_cart") || "[]");
let discount = localStorage.getItem("aflux_code") || "";
const saveCart = () => {
  localStorage.setItem("aflux_cart", JSON.stringify(cart));
  const n = cart.reduce((s, i) => s + i.qty, 0);
  $("#bagCount").textContent = n;
  $("#bagCount").hidden = !n;
};
function addToCart(id, color, size, qty) {
  const hit = cart.find(
    (i) => i.id === id && i.color === color && i.size === size,
  );
  hit ? (hit.qty += qty) : cart.push({ id, color, size, qty });
  saveCart();
}
const subtotal = () =>
  cart.reduce((n, i) => n + priceOf(byId(i.id)) * i.qty, 0);
const discAmt = () => Math.round(subtotal() * (DISCOUNT_CODES[discount] || 0));
const shipCost = (method) =>
  !cart.length
    ? 0
    : method === "express"
      ? SETTINGS.express
      : SETTINGS.freeOver > 0 && subtotal() - discAmt() >= SETTINGS.freeOver
        ? 0
        : SETTINGS.standard;
        

/* ---------- Product art: SVG garments stand in until real photos are added ---------- */
const SHAPES = {
  tees: "M60 30 86 20Q100 40 114 20L140 30 182 72 158 94 144 82V214H56V82L42 94 18 72Z",
  streetwear:
    "M62 34 86 22Q100 46 114 22L138 34 186 190 160 198 144 110V214H56V110L40 198 14 190Z",
  signature:
    "M64 24 88 18 100 40 112 18 136 24 188 196 162 204 144 120V220H56V120L38 204 12 196Z",
  essentials: "M62 20H138L152 222H110L100 92 90 222H48Z",
};
function art(p, hex, view = 0) {
  const vb = view === 1 ? "50 20 100 110" : "0 0 200 240";
  const bg = view === 2 ? "#F7F4EE" : "#D9D2C7";
  return `<svg viewBox="${vb}" role="img" aria-label="${esc(p.name)} illustration" preserveAspectRatio="xMidYMid slice"><rect x="-50" y="-50" width="300" height="340" fill="${bg}"/><path d="${SHAPES[p.cat]}" fill="${hex}" stroke="rgba(23,23,23,.25)" stroke-width="1.5"/>${p.cat === "signature" ? '<path d="M100 40V220" stroke="rgba(247,244,238,.35)"/>' : ""}</svg>`;
}
const media = (p, ci = 0, view = 0) =>
  p.images
    ? `<img src="${p.images[view] || p.images[0]}" alt="${esc(p.name)}" loading="lazy">`
    : art(p, p.colors[ci].hex, view);

function card(p) {
  return `<div class="cw"><a class="card" href="#/product/${p.id}"><div class="img">${media(p)}</div><div class="info"><div class="name">${p.name}</div>
  <div class="price">${p.sale ? `<s>${money(p.price)}</s>${money(p.sale)}` : money(p.price)}</div>
  <div class="sw">${p.colors.map((c, i) => `<button type="button" data-sw="${p.id}|${i}" aria-pressed="${i === 0}" aria-label="${c.name}" title="${c.name}" style="background:${c.hex}"></button>`).join("")}</div>
  ${p.soldOut ? '<div class="tag">Sold out</div>' : ""}</div></a>${heartBtn(p.id)}</div>`;
}

/* ---------- Pages ---------- */
function news() {
  return `<section class="news section"><div class="wrap"><h2>First access to new releases.</h2><p>One email when a collection drops. Unsubscribe any time.</p>
  <form data-form="news" novalidate><label class="field" style="margin:0"><span class="sr" hidden>Email</span><input name="email" type="email" placeholder="Email address" aria-label="Email address" required></label><button class="btn">SUBSCRIBE</button></form>
  <p class="err" role="status" data-msg></p></div></section>`;
}
function home() {
  const best = [...PRODUCTS].sort((a, b) => b.pop - a.pop).slice(0, 4);
  const newest = [...PRODUCTS]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 4);
  return `<section class="hero"><div class="hero-text"><p class="eyebrow">${esc(S("hero", "eyebrow", "Premium contemporary fashion"))}</p><h1>${esc(S("hero", "title", "More than\njust clothing.")).replace(/\n/g, "<br>")}</h1>
  <p class="lead">${esc(S("hero", "lead", "AFLUX is where modern style meets everyday comfort. Designed for those who move differently."))}</p>
  <a class="btn hero-btn" href="#/shop">${esc(S("hero", "button", "SHOP NOW"))} <span aria-hidden="true">→</span></a></div>
  <div class="hero-art"><img src="${esc(S("hero", "image", "images/hero.jpg"))}" alt="AFLUX hero photo" fetchpriority="high" onerror="this.remove()"><span class="hero-cap">Our studio is in Lagos</span></div></section>
  <section class="section" id="best-sellers" style="padding-top:0"><div class="wrap"><div class="head"><h2>Best sellers</h2><a class="link" href="#new-arrivals">View new arrivals</a></div><div class="grid g4">${best.map(card).join("")}</div></div></section>
  <section class="section" id="shop"><div class="wrap"><div class="head"><h2>Shop all</h2></div><div class="grid g4">${PRODUCTS.map(card).join("")}</div></div></section>
  <section class="section" id="new-arrivals"><div class="wrap"><div class="head"><h2>New arrivals</h2><a class="link" href="#shop">Explore best sellers</a></div><div class="grid g4">${newest.map(card).join("")}</div></div></section>
  <section class="statement section" id="about"><div class="wrap"><div><span class="tag">${esc(S("about", "tag", "OUR APPROACH"))}</span><h2>${esc(S("about", "title", "Made slowly, worn for years."))}</h2></div><div><p>${esc(S("about", "body1", "AFLUX is a contemporary fashion label built around refined streetwear and everyday essentials. We design a small number of pieces each season, in heavyweight fabrics and quiet colours, and we make them to last."))}</p><p>${esc(S("about", "body2", "Our studio is in Lagos. Quiet colours, considered proportions, and nothing that dates by next season."))}</p></div></div></section>
  <section class="campaign section"><div class="wrap"><div>${art(byId("drift-hoodie") || PRODUCTS[0], "#4A525A").replace(/<rect[^>]*>/, "")}</div><div><h2>The Autumn Edit is here.</h2><p>Heavy fleece, wide trousers and structured outerwear in an earthy, muted palette.</p><a class="btn" href="#new-arrivals">EXPLORE NEW ARRIVALS</a></div></div></section>
  <section class="section" id="contact"><div class="wrap two"><div><span class="tag">WE ARE HERE TO HELP</span><h2>Get in touch.</h2><p>Questions about a piece or an order? Send us a note and our Lagos team will be happy to help.</p><p><a class="link" href="mailto:hello@aflux.example">hello@aflux.example</a><br>Lekki Phase 1, Lagos</p></div>
  <form data-form="Contact" novalidate><div class="field"><label for="home-contact-name">Name</label><input id="home-contact-name" name="name" required><span class="err" data-for="name"></span></div><div class="field"><label for="home-contact-email">Email</label><input id="home-contact-email" name="email" type="email" required><span class="err" data-for="email"></span></div><div class="field"><label for="home-contact-message">Message</label><textarea id="home-contact-message" name="message" rows="5" required></textarea><span class="err" data-for="message"></span></div><button class="btn">SEND MESSAGE</button><p class="err" role="status" data-msg></p></form></div></section>
  <section class="section" id="shipping"><div class="wrap page"><h2>Shipping and returns</h2><p><strong>Delivery.</strong> Standard (3–5 working days) is ${SETTINGS.freeOver > 0 ? `free over ${ngn(SETTINGS.freeOver)}, otherwise ` : ""}${ngn(SETTINGS.standard)}. Express (1–2 working days) is ${ngn(SETTINGS.express)}.</p><p><strong>Returns.</strong> Return unworn items with tags within 14 days for a refund or exchange. These policies are sample text for this prototype.</p></div></section>
  <section class="section" id="privacy"><div class="wrap page"><h2>Privacy policy</h2><p>This is sample policy text for this prototype. In production, this section should explain what information is collected, why it is collected, and how customers can request its deletion.</p></div></section>
  <section class="section" id="terms"><div class="wrap page"><h2>Terms</h2><p>This is sample terms text for this prototype. Review the terms for orders, pricing, delivery and returns before launch.</p></div></section>`;
}

const F = {
  cat: "all",
  size: "",
  color: "",
  max: 200000,
  sort: "featured",
  shown: 8,
  q: "",
};
function shop(q) {
  F.cat = q.get("cat") || "all";
  F.sort = q.get("sort") || "featured";
  F.q = q.get("q") || "";
  F.size = "";
  F.color = "";
  F.max = 200000;
  F.shown = 8;
  const colors = [
    ...new Map(
      PRODUCTS.flatMap((p) => p.colors).map((c) => [c.name, c]),
    ).values(),
  ];
  const title = F.q
    ? `Results for “${esc(F.q)}”`
    : F.cat === "all"
      ? "Shop all"
      : CATEGORIES[F.cat];
  app.innerHTML = `<div class="wrap"><div class="shop"><aside class="filters" aria-label="Filters"><fieldset><legend>Category</legend>
  ${[["all", "All"], ...Object.entries(CATEGORIES)].map(([k, v]) => `<label><input type="radio" name="cat" value="${k}" ${k === F.cat ? "checked" : ""}> ${v}</label>`).join("")}</fieldset>
  <fieldset><legend>Size</legend><label><input type="radio" name="size" value="" checked> Any</label>${SIZES.map((s) => `<label><input type="radio" name="size" value="${s}"> ${s}</label>`).join("")}</fieldset>
  <fieldset><legend>Colour</legend><label><input type="radio" name="color" value="" checked> Any</label>${colors.map((c) => `<label><input type="radio" name="color" value="${c.name}"> ${c.name}</label>`).join("")}</fieldset>
  <fieldset><legend>Max price: <span id="maxLabel">${money(F.max)}</span></legend><input type="range" name="max" min="20000" max="200000" step="5000" value="${F.max}" style="width:100%" aria-label="Maximum price"></fieldset></aside>
  <section><h1 style="font-size:2.4rem">${title}</h1><div class="bar"><span id="resultCount" role="status"></span><label>Sort <select name="sort">${[
    ["featured", "Featured"],
    ["newest", "Newest"],
    ["popular", "Most popular"],
    ["low", "Price: low to high"],
    ["high", "Price: high to low"],
  ]
    .map(
      ([v, l]) =>
        `<option value="${v}" ${v === F.sort ? "selected" : ""}>${l}</option>`,
    )
    .join("")}</select></label></div>
  <div class="grid g3" id="grid"></div><p style="text-align:center;margin-top:2rem"><button class="btn ghost" id="more" hidden>LOAD MORE</button></p></section></div></div>`;
  app.querySelector(".filters").addEventListener("input", onFilter);
  app.querySelector("[name=sort]").addEventListener("change", onFilter);
  $("#more").onclick = () => {
    F.shown += 8;
    paint();
  };
  paint();
}
function onFilter(e) {
  const { name, value } = e.target;
  if (!(name in F)) return;
  F[name] = name === "max" ? +value : value;
  F.shown = 8;
  if (name === "max") $("#maxLabel").textContent = money(F.max);
  paint();
}
function paint() {
  let list = PRODUCTS.filter(
    (p) =>
      (F.cat === "all" || p.cat === F.cat) &&
      (!F.size || p.sizes.includes(F.size)) &&
      (!F.color || p.colors.some((c) => c.name === F.color)) &&
      priceOf(p) <= F.max &&
      (!F.q ||
        (p.name + p.desc + CATEGORIES[p.cat])
          .toLowerCase()
          .includes(F.q.toLowerCase())),
  );
  const sorts = {
    newest: (a, b) => b.date.localeCompare(a.date),
    popular: (a, b) => b.pop - a.pop,
    low: (a, b) => priceOf(a) - priceOf(b),
    high: (a, b) => priceOf(b) - priceOf(a),
    featured: () => 0,
  };
  list.sort(sorts[F.sort]);
  $("#resultCount").textContent =
    `${list.length} ${list.length === 1 ? "product" : "products"}`;
  $("#grid").innerHTML = list.length
    ? list.slice(0, F.shown).map(card).join("")
    : `<div class="empty"><h2>No matches.</h2><p style="margin-inline:auto">Try a different size, colour or a higher price limit.</p><a class="btn ghost" href="#/shop">CLEAR FILTERS</a></div>`;
  $("#more").hidden = list.length <= F.shown;
}

function product(id, q = new URLSearchParams()) {
  const p = byId(id);
  if (!p) return notFound();
  const lastColor = p.colors.length - 1;
  let ci = Math.min(Math.max(+q.get("ci") || 0, 0), lastColor),
    size = "",
    qty = 1,
    view = 0;
  const related = PRODUCTS.filter((x) => x.cat === p.cat && x.id !== p.id)
    .concat(PRODUCTS.filter((x) => x.cat !== p.cat))
    .slice(0, 4);
  const draw = () => {
    app.innerHTML = `<div class="wrap"><div class="pdp"><div><div class="main-img">${media(p, ci, view)}</div><div class="thumbs">${[0, 1, 2].map((v) => `<button aria-pressed="${v === view}" data-view="${v}" aria-label="View ${v + 1}">${media(p, ci, v)}</button>`).join("")}</div></div>
    <div class="pinfo"><p class="tag"><a href="#/shop?cat=${p.cat}">${CATEGORIES[p.cat]}</a></p><h1 style="font-size:2.6rem">${p.name}</h1>
    <p class="price" style="font-size:1.3rem">${p.sale ? `<s>${money(p.price)}</s>${money(p.sale)}` : money(p.price)}</p><p>${p.desc}</p>
    <strong>Colour: ${p.colors[ci].name}</strong><div class="opts">${p.colors.map((c, i) => `<button class="dot" data-ci="${i}" aria-pressed="${i === ci}" aria-label="${c.name}" style="background:${c.hex}"></button>`).join("")}</div>
    <strong>Size</strong> <button class="link" data-act="guide">Size guide</button><div class="opts" role="group" aria-label="Size">${p.sizes.map((s) => `<button class="opt" data-size="${s}" aria-pressed="${s === size}">${s}</button>`).join("")}</div>
    <div id="guide" hidden class="notice">Chest (cm): S 94–99 · M 100–105 · L 106–111 · XL 112–117. Waist (cm): S 76–81 · M 82–87 · L 88–93 · XL 94–99. Between sizes? Size up for a relaxed fit.</div>
    <p class="err" id="sizeErr" role="alert"></p>
    <p>${p.soldOut ? "<strong>Sold out</strong>" : "<strong class='ok'>In stock</strong>"}</p>
    <div class="qty" role="group" aria-label="Quantity"><button data-q="-1" aria-label="Decrease">−</button><span aria-live="polite">${qty}</span><button data-q="1" aria-label="Increase">+</button></div>
    <div class="buy"><div class="buy-row"><button class="btn" data-act="add" ${p.soldOut ? "disabled" : ""}>ADD TO CART</button>${heartBtn(p.id, "big")}</div><button class="btn ghost block" data-act="buy" ${p.soldOut ? "disabled" : ""}>BUY NOW</button></div>
    <p id="added" class="ok" role="status"></p>
    <details><summary>Product details</summary><ul>${p.details.map((d) => `<li>${d}</li>`).join("")}</ul></details>
    <details><summary>Care instructions</summary><p>${p.care}</p></details>
    <details><summary>Shipping and returns</summary><p>Standard delivery in Nigeria takes 3–5 working days. Express takes 1–2. Unworn items can be returned within 14 days.</p></details></div></div>
    <section class="section"><h2>You may also like</h2><div class="grid g4">${related.map(card).join("")}</div></section></div>`;
  };
  const validate = () => {
    if (!size) {
      $("#sizeErr").textContent = "Select a size to continue.";
      return false;
    }
    return true;
  };
  if (p.images) view = Math.min(ci, 2);
  draw();
  app.onclick = (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.view) {
      view = +b.dataset.view;
      if (p.images) ci = Math.min(view, lastColor); // thumbnail picks the matching colour
      draw();
    } else if (b.dataset.ci) {
      ci = +b.dataset.ci;
      if (p.images) view = Math.min(ci, 2); // swatch picks the matching photo
      draw();
    } else if (b.dataset.size) {
      size = b.dataset.size;
      draw();
    } else if (b.dataset.q) {
      qty = Math.min(10, Math.max(1, qty + +b.dataset.q));
      b.parentNode.querySelector("span").textContent = qty;
    } else if (b.dataset.act === "guide")
      $("#guide").hidden = !$("#guide").hidden;
    else if (b.dataset.act === "add" && validate()) {
      addToCart(p.id, p.colors[ci].name, size, qty);
      $("#added").textContent = "Added to your bag.";
    } else if (b.dataset.act === "buy" && validate()) {
      addToCart(p.id, p.colors[ci].name, size, qty);
      location.hash = "#/checkout";
    }
  };
}

function cartPage() {
  const rows = cart
    .map((i, n) => {
      const p = byId(i.id),
        h = (p.colors.find((c) => c.name === i.color) || p.colors[0]).hex;
      return `<div class="line"><div class="t">${p.images ? media(p) : art(p, h)}</div><div><a href="#/product/${p.id}"><strong>${p.name}</strong></a><br><span class="tag">${i.color} · Size ${i.size}</span><br><button class="link" data-rm="${n}">Remove</button></div>
  <div style="text-align:right"><div class="qty"><button data-n="${n}" data-d="-1" aria-label="Decrease">−</button><span>${i.qty}</span><button data-n="${n}" data-d="1" aria-label="Increase">+</button></div><div class="price">${money(priceOf(p) * i.qty)}</div></div></div>`;
    })
    .join("");
  app.innerHTML = `<div class="wrap"><h1 style="font-size:2.6rem;padding-top:var(--s4)">Your bag</h1>${
    !cart.length
      ? `<div class="empty"><p style="margin-inline:auto">Your bag is empty.</p><a class="btn" href="#/shop">CONTINUE SHOPPING</a></div>`
      : `<div class="two"><div>${rows}</div><aside class="box">${summary("standard")}
  <form data-form="code" class="field" style="margin-top:1rem"><label for="code">Discount code</label><div style="display:flex;gap:.5rem"><input id="code" name="code" value="${esc(discount)}" style="flex:1"><button class="btn ghost">APPLY</button></div><span class="err" data-msg></span></form>
  <a class="btn block" href="#/checkout">CHECKOUT</a><p style="text-align:center;margin:1rem 0 0"><a class="link" href="#/shop">Continue shopping</a></p></aside></div>`
  }</div>`;
  app.onclick = (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.rm) cart.splice(+b.dataset.rm, 1);
    else if (b.dataset.n) {
      const i = cart[+b.dataset.n];
      i.qty = Math.min(10, Math.max(1, i.qty + +b.dataset.d));
    } else return;
    saveCart();
    cartPage();
  };
}
function summary(method) {
  const d = discAmt(),
    s = shipCost(method),
    t = subtotal() - d + s;
  return `<h2 style="font-size:1.4rem">Order summary</h2><div class="row"><span>Subtotal</span><span>${money(subtotal())}</span></div>${d ? `<div class="row"><span>Discount (${discount})</span><span>−${money(d)}</span></div>` : ""}
  <div class="row"><span>Shipping</span><span>${s ? money(s) : "Free"}</span></div><div class="row total"><span>Total</span><span>${money(t)}</span></div>
  ${country[2] !== "NGN" && rateFor(country[2]) ? `<p class="tag" style="margin-top:.6rem">Shown in ${country[2]} for reference. You will be charged ${ngn(t)} (NGN).</p>` : ""}`;
}

function checkout() {
  if (!cart.length) {
    location.hash = "#/cart";
    return;
  }
  const f = (n, l, t = "text", ac = "") =>
    `<div class="field"><label for="${n}">${l}</label><input id="${n}" name="${n}" type="${t}" autocomplete="${ac}" required><span class="err" data-for="${n}"></span></div>`;
  app.innerHTML = `<div class="wrap"><h1 style="font-size:2.6rem;padding-top:var(--s4)">Checkout</h1><div class="notice"><strong>Demo checkout.</strong> No payment is taken. A payment provider (such as Paystack) is needed for real orders.</div>
  <form data-form="checkout" class="two" novalidate style="padding-top:0"><div><h2 style="font-size:1.4rem">Contact</h2>${f("email", "Email", "email", "email")}${f("phone", "Phone", "tel", "tel")}
  <h2 style="font-size:1.4rem">Delivery address</h2>${f("name", "Full name", "text", "name")}${f("address", "Street address", "text", "street-address")}${f("city", "City", "text", "address-level2")}${f("state", "State", "text", "address-level1")}
  <h2 style="font-size:1.4rem">Shipping method</h2><label><input type="radio" name="ship" value="standard" checked> Standard, 3–5 days</label><br><label><input type="radio" name="ship" value="express"> Express, 1–2 days (₦12,000)</label>
  <h2 style="font-size:1.4rem;margin-top:1.5rem">Payment</h2><label><input type="radio" name="pay" value="paystack" checked> Pay online with card or transfer (Paystack, not connected)</label><br><label><input type="radio" name="pay" value="cod"> Pay on delivery</label></div>
  <aside class="box"><div id="sum">${summary("standard")}</div><button class="btn block" style="margin-top:1rem">PLACE DEMO ORDER</button></aside></form></div>`;
  app
    .querySelectorAll("[name=ship]")
    .forEach(
      (r) => (r.onchange = () => ($("#sum").innerHTML = summary(r.value))),
    );
}

const PAGES = {
  about: [
    "About AFLUX",
    "<p>AFLUX is a contemporary fashion label built around refined streetwear and everyday essentials. We design a small number of pieces each season, in heavyweight fabrics and quiet colours, and we make them to last.</p><p>Our studio is in Lagos. Everything on this site is a prototype collection.</p>",
  ],
  shipping: [
    "Shipping and returns",
    "<p><strong>Delivery.</strong> Standard (3–5 working days) is free over ₦100,000, otherwise ₦5,000. Express (1–2 working days) is ₦12,000.</p><p><strong>Returns.</strong> Return unworn items with tags within 14 days for a refund or exchange.</p><p>These policies are sample text for the prototype.</p>",
  ],
  privacy: [
    "Privacy policy",
    "<p>Sample policy for the prototype. In production, state what data you collect (contact details, delivery address, order history), why, how long you keep it, and how customers can request deletion. Payment details are handled only by your payment provider.</p>",
  ],
  terms: [
    "Terms",
    "<p>Sample terms for the prototype. Replace with terms reviewed by a qualified professional before launch, covering orders, pricing, delivery, returns and liability.</p>",
  ],
};
const staticPage = (k) =>
  (app.innerHTML = `<div class="wrap page"><h1>${PAGES[k][0]}</h1>${PAGES[k][1]}</div>`);
const form = (kind, fields, btn, extra = "") =>
  `<div class="wrap page"><h1>${kind}</h1>${extra}<form data-form="${kind}" novalidate style="max-width:420px">${fields.map(([n, l, t]) => `<div class="field"><label for="${n}">${l}</label>${t === "textarea" ? `<textarea id="${n}" name="${n}" rows="5" required></textarea>` : `<input id="${n}" name="${n}" type="${t}" required>`}<span class="err" data-for="${n}"></span></div>`).join("")}<button class="btn">${btn}</button><p class="err" role="status" data-msg></p></form></div>`;

/* ---------- Account ---------- */
async function account(q = new URLSearchParams()) {
  const {
    data: { session },
  } = await db.auth.getSession();
  if (!session) return accountForms(q.get("next") || "");
  const user = session.user;
  const { data: me } = await db.from("admins").select("user_id").maybeSingle();
  const { data: orders } = await db
    .from("orders")
    .select("ref,created_at,status,total,items")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  const name = (user.user_metadata && user.user_metadata.name) || user.email;
  app.innerHTML = `<div class="wrap page"><h1>Hello, ${esc(name)}</h1><p class="tag">${esc(user.email)}</p>
  <div class="btns" style="margin:var(--s2) 0 var(--s4)">${me ? '<a class="btn" href="#/admin">ADMIN DASHBOARD</a>' : ""}<button class="btn ghost" id="signout">SIGN OUT</button></div>
  <h2 style="font-size:1.5rem">Your orders</h2>
  ${orders && orders.length ? orders.map((o) => `<div class="order"><strong>${esc(o.ref)}</strong> · ${esc(new Date(o.created_at).toLocaleDateString("en-NG"))} · ${esc(o.status)}<br><span class="tag">${(o.items || []).map((i) => `${esc(i.qty)} × ${esc(i.name)} (${esc(i.color)}, ${esc(i.size)})`).join("; ")}</span><br>${ngn(o.total || 0)}</div>`).join("") : "<p>No orders yet. Orders placed while you’re signed in will appear here.</p>"}</div>`;
  $("#signout").onclick = async () => {
    await db.auth.signOut();
    account();
  };
}
function accountForms(next = "") {
  const f = (id, label, type, ac) =>
    `<div class="field"><label for="${id}">${label}</label><input id="${id}" type="${type}" autocomplete="${ac}" required></div>`;
  app.innerHTML = `<div class="wrap auth"><form id="signin" novalidate><h1 style="font-size:2rem">Sign in</h1>${f("si-email", "Email", "email", "username")}${f("si-pass", "Password", "password", "current-password")}<button class="btn">SIGN IN</button><p class="err" role="alert" data-msg></p></form>
  <form id="signup" novalidate><h1 style="font-size:2rem">Create account</h1>${f("su-name", "Full name", "text", "name")}${f("su-email", "Email", "email", "email")}${f("su-pass", "Password (8+ characters)", "password", "new-password")}<button class="btn ghost">CREATE ACCOUNT</button><p class="err" role="alert" data-msg></p></form></div>`;
  const say = (fm, text, ok) => {
    const m = fm.querySelector("[data-msg]");
    m.className = ok ? "ok" : "err";
    m.textContent = text;
  };
  $("#signin").onsubmit = async (e) => {
    e.preventDefault();
    const { error } = await db.auth.signInWithPassword({
      email: $("#si-email").value.trim(),
      password: $("#si-pass").value,
    });
    if (error)
      return say(
        e.target,
        /confirm/i.test(error.message)
          ? "Please confirm your email first. Check your inbox."
          : "Wrong email or password.",
      );
    if (next === "admin") location.hash = "#/admin";
    else account();
  };
  $("#signup").onsubmit = async (e) => {
    e.preventDefault();
    const name = $("#su-name").value.trim(),
      email = $("#su-email").value.trim(),
      password = $("#su-pass").value;
    if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return say(e.target, "Enter your name and a valid email.");
    if (password.length < 8)
      return say(e.target, "Use at least 8 characters for your password.");
    const { data, error } = await db.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    if (error) return say(e.target, error.message);
    if (data.session) return account();
    say(e.target, "Check your email to confirm your account, then sign in.", true);
  };
}
function notFound() {
  app.innerHTML = `<div class="wrap page"><h1>Page not found.</h1><p>The page you’re looking for has moved or doesn’t exist.</p><a class="btn" href="#/shop">BACK TO THE SHOP</a></div>`;
}

/* ---------- Forms (front-end validation only) ---------- */
document.addEventListener("submit", async (e) => {
  const fm = e.target.closest("[data-form]");
  if (!fm) return;
  e.preventDefault();
  const kind = fm.dataset.form,
    msg =
      fm.querySelector("[data-msg]") ||
      fm.parentNode.querySelector("[data-msg]");
  let bad = 0;
  fm.querySelectorAll("input[required],textarea[required]").forEach((el) => {
    let m = "";
    const v = el.value.trim();
    if (!v) m = "This field is required.";
    else if (el.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v))
      m = "Enter a valid email address.";
    else if (el.type === "password" && v.length < 8)
      m = "Use at least 8 characters.";
    el.setAttribute("aria-invalid", !!m);
    const s = fm.querySelector(`[data-for="${el.name}"]`);
    if (s) s.textContent = m;
    if (m) {
      bad++;
      if (bad === 1) el.focus();
    }
  });
  if (kind === "code") {
    discount = fm.code.value.trim().toUpperCase();
    if (discount && !DISCOUNT_CODES[discount]) {
      discount = "";
      msg.textContent = "That code isn’t valid.";
      return;
    }
    localStorage.setItem("aflux_code", discount);
    return cartPage();
  }
  if (bad) {
    if (msg)
      msg.textContent = kind === "news" ? "Enter a valid email address." : "";
    return;
  }
  if (kind === "checkout") {
    const btn = fm.querySelector("button");
    btn.disabled = true;
    const d = Object.fromEntries(new FormData(fm));
    const ref = "AFX-" + Math.random().toString(36).slice(2, 8).toUpperCase();
    const total = subtotal() - discAmt() + shipCost(d.ship);
    const {
      data: { session },
    } = await db.auth.getSession();
    const order = {
      ref,
      total,
      user_id: session ? session.user.id : null,
      customer: {
        name: d.name,
        email: d.email,
        phone: d.phone,
        address: d.address,
        city: d.city,
        state: d.state,
        shipping: d.ship,
        payment: d.pay,
      },
      items: cart.map((i) => ({
        id: i.id,
        name: byId(i.id).name,
        color: i.color,
        size: i.size,
        qty: i.qty,
        price: priceOf(byId(i.id)),
      })),
    };
    const { error } = await db.from("orders").insert(order);
    if (error) {
      btn.disabled = false;
      alert("We couldn’t place your order. Please try again.");
      return;
    }
    cart = [];
    saveCart();
    discount = "";
    localStorage.removeItem("aflux_code");
    app.innerHTML = `<div class="wrap page"><h1>Thank you.</h1><div class="notice"><strong>Order ${ref} received.</strong> Online payment isn’t connected yet, so no payment has been taken.</div><p>We’ll contact you at ${esc(d.email)} to confirm payment and delivery.</p><a class="btn" href="#/shop">CONTINUE SHOPPING</a></div>`;
    scrollTo(0, 0);
    return;
  }
  msg.className = "ok";
  msg.textContent =
    kind === "news"
      ? "You’re on the list."
      : kind === "Contact"
        ? "Message checked. A backend is needed to send it."
        : "Details look valid. A backend is needed to continue.";
  fm.reset();
});

/* ---------- Admin (#/admin) ---------- */
const STATUSES = ["new", "paid", "shipped", "delivered", "cancelled"];
async function admin() {
  const {
    data: { session },
  } = await db.auth.getSession();
  if (!session) {
    location.hash = "#/account?next=admin";
    return;
  }
  const { data: me } = await db.from("admins").select("user_id").maybeSingle();
  if (!me) {
    app.innerHTML = `<div class="wrap page"><h1>Not authorised</h1><p>This account doesn’t have admin access.</p><a class="btn" href="#/account">BACK TO MY ACCOUNT</a></div>`;
    return;
  }
  const { data: orders, error } = await db
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    app.innerHTML = `<div class="wrap page"><h1>Orders</h1><p class="err">Couldn’t load orders: ${esc(error.message)}</p></div>`;
    return;
  }
  const rows = orders
    .map((o) => {
      const c = o.customer || {};
      return `<tr>
    <td>${esc(o.ref)}<br><span class="tag">${esc(new Date(o.created_at).toLocaleString("en-NG"))}</span></td>
    <td>${esc(c.name || "")}<br>${esc(c.email || "")}<br>${esc(c.phone || "")}<br><span class="tag">${esc(c.address || "")}, ${esc(c.city || "")}, ${esc(c.state || "")}</span></td>
    <td>${(o.items || []).map((i) => `${esc(i.qty)} × ${esc(i.name)} (${esc(i.color)}, ${esc(i.size)})`).join("<br>")}</td>
    <td>${ngn(o.total || 0)}<br><span class="tag">${esc(c.shipping || "")} · ${esc(c.payment || "")}</span></td>
    <td><select data-id="${esc(o.id)}" aria-label="Order status">${STATUSES.map((s) => `<option ${s === o.status ? "selected" : ""}>${s}</option>`).join("")}</select></td></tr>`;
    })
    .join("");
  app.innerHTML = `<div class="wrap" style="padding:var(--s4) 0"><div class="head"><h1 style="font-size:2.4rem;margin:0">Orders (${orders.length})</h1><button class="btn ghost" id="out">SIGN OUT</button></div>
  <p id="saved" class="ok" role="status"></p>
  ${orders.length ? `<div class="scroll"><table class="tbl" id="orders"><thead><tr><th>Order</th><th>Customer</th><th>Items</th><th>Total</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table></div>` : "<p>No orders yet.</p>"}</div>`;
  $("#out").onclick = async () => {
    await db.auth.signOut();
    location.hash = "#/account";
  };
  const t = $("#orders");
  if (t) {
    t.onchange = async (e) => {
      const { error } = await db
        .from("orders")
        .update({ status: e.target.value })
        .eq("id", e.target.dataset.id);
      $("#saved").textContent = error
        ? "Couldn’t save that change."
        : "Status saved.";
    };
  }
}

/* ---------- Favorites (saved in this browser only) ---------- */
let favs = JSON.parse(localStorage.getItem("aflux_favs") || "[]");
const HEART = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.5l-1.3-1.2C5.9 15 3 12.4 3 9.1 3 6.5 5 4.5 7.5 4.5c1.7 0 3.4.8 4.5 2.1 1.1-1.3 2.8-2.1 4.5-2.1C19 4.5 21 6.5 21 9.1c0 3.3-2.9 5.9-7.7 10.2L12 20.5z"/></svg>`;
const favLabel = (id) =>
  favs.includes(id) ? "Remove from favorites" : "Save to favorites";
const heartBtn = (id, cls = "") =>
  `<button class="fav ${cls}" data-fav="${id}" aria-pressed="${favs.includes(id)}" aria-label="${favLabel(id)}">${HEART}</button>`;
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-fav]");
  if (!b) return;
  const id = b.dataset.fav;
  favs = favs.includes(id) ? favs.filter((f) => f !== id) : [...favs, id];
  localStorage.setItem("aflux_favs", JSON.stringify(favs));
  pushSync();
  document.querySelectorAll(`[data-fav="${id}"]`).forEach((x) => {
    x.setAttribute("aria-pressed", favs.includes(id));
    x.setAttribute("aria-label", favLabel(id));
  });
  if (location.hash.startsWith("#/favorites")) favorites();
});
function favorites() {
  const list = PRODUCTS.filter((p) => favs.includes(p.id));
  app.innerHTML = `<div class="wrap"><h1 style="font-size:2.4rem;padding-top:var(--s4)">Favorites</h1>${list.length ? `<div class="grid g4">${list.map(card).join("")}</div>` : `<div class="empty"><p style="margin-inline:auto">You haven’t saved anything yet. Tap the heart on a product to save it here.</p><a class="btn" href="#/shop">BROWSE THE SHOP</a></div>`}</div>`;
}

/* ---------- Colour dots on product cards ---------- */
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-sw]");
  if (!b) return;
  e.preventDefault(); // stops the card link opening the product page
  const [id, i] = b.dataset.sw.split("|"),
    p = byId(id),
    c = p.colors[+i];
  const link = b.closest(".card"),
    box = link.querySelector(".img");
  if (c.images)
    box.innerHTML = `<img src="${c.images[0]}" alt="${esc(p.name)} in ${c.name}">`;
  else if (!p.images) box.innerHTML = art(p, c.hex);
    else if (p.images) box.innerHTML = `<img src="${p.images[+i] || p.images[0]}" alt="${esc(p.name)} in ${c.name}">`;
  link.href = `#/product/${id}?ci=${i}`; // opening the card now keeps this colour
  link
    .querySelectorAll("[data-sw]")
    .forEach((x) => x.setAttribute("aria-pressed", x === b));
});

/* ---------- Account sync: bag, favorites and country follow a signed-in customer ---------- */
let syncUser = null, syncTimer;
function pushSync() {
  if (!syncUser) return;
  clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    db.from("user_data").upsert({ user_id: syncUser, cart, favs, country: country[1], updated_at: new Date().toISOString() });
  }, 800);
}
async function pullSync(session) {
  syncUser = session.user.id;
  await loadProducts();
  const { data } = await db.from("user_data").select("*").eq("user_id", syncUser).maybeSingle();
  if (data) {
    if (localStorage.getItem("aflux_owner") === syncUser) {
      cart = data.cart || [];            // same customer as before: the account is the source of truth
      favs = data.favs || [];
    } else {                             // just signed in: merge this device's guest bag into the account
      const map = new Map();
      [...(data.cart || []), ...cart].forEach((i) => {
        const k = `${i.id}|${i.color}|${i.size}`, o = map.get(k);
        map.set(k, o ? { ...o, qty: Math.max(o.qty, i.qty) } : i);
      });
      cart = [...map.values()];
      favs = [...new Set([...(data.favs || []), ...favs])];
    }
    const c = COUNTRIES.find((x) => x[1] === data.country);
    if (c) { country = c; localStorage.setItem("aflux_country", c[1]); paintCountryBtn(); }
  }
  cart = cart.filter((i) => byId(i.id));
  localStorage.setItem("aflux_owner", syncUser);
  localStorage.setItem("aflux_favs", JSON.stringify(favs));
  pushSync();
  saveCart(); // also saves the merged result to the account
  const h = location.hash;
  if (!h || h === "#/" || /^#\/(shop|search|product|cart|favorites)/.test(h)) route();
}
db.auth.onAuthStateChange((event, session) => {
  setTimeout(() => {
    if (session && syncUser !== session.user.id) pullSync(session);
    else if (!session && syncUser) { // signed out: don't leave this customer's bag on the device
      syncUser = null; cart = []; favs = [];
      localStorage.removeItem("aflux_favs"); localStorage.removeItem("aflux_owner");
      saveCart(); route();
    }
  }, 0);
});

/* ---------- Router and chrome ---------- */
async function route() {
    await Promise.all([loadProducts(), loadSettings()]);
  if (location.hash && !location.hash.startsWith("#/")) {
    let target = document.getElementById(
      decodeURIComponent(location.hash.slice(1)),
    );
    if (!target) {
      app.onclick = null;
      app.innerHTML = home();
      app.insertAdjacentHTML("beforeend", news());
      target = document.getElementById(
        decodeURIComponent(location.hash.slice(1)),
      );
    }
    if (target) {
      setNav(false);
      $("#menuBtn").setAttribute("aria-label", "Open menu");
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
  }
    await Promise.all([loadProducts(), loadSite()]);
  app.onclick = null;
  const [path, qs] = location.hash.slice(1).split("?"),
    parts = path.split("/").filter(Boolean),
    q = new URLSearchParams(qs || "");
  const r = parts[0] || "home";
  let withNews = false;
  if (r === "home") {
    app.innerHTML = home();
    withNews = true;
  } else if (r === "shop") shop(q);
  else if (r === "search") {
    q.set("q", q.get("q") || "");
    shop(q);
  } else if (r === "product") product(parts[1], q);
  else if (r === "cart") cartPage();
  else if (r === "checkout") checkout();
  else if (r === "account") account(q);
  else if (r === "favorites") favorites();
    else if (r === "admin") location.replace("admin.html");
  else if (r === "contact")
    app.innerHTML = form(
      "Contact",
      [
        ["name", "Name", "text"],
        ["email", "Email", "email"],
        ["message", "Message", "textarea"],
      ],
      "SEND MESSAGE",
    );
  else if (PAGES[r]) staticPage(r);
  else notFound();
  if (withNews) app.insertAdjacentHTML("beforeend", news());
  setNav(false);
  document.title = "AFLUX — Premium contemporary fashion";
  scrollTo({ top: 0, behavior: "smooth" });
}
addEventListener("hashchange", route);
function setNav(open) {
  $("#nav").classList.toggle("open", open);
  $("#menuBtn").setAttribute("aria-expanded", open);
  document.body.style.overflow = open ? "hidden" : "";
}
$("#menuBtn").onclick = () => setNav(!$("#nav").classList.contains("open"));
$("#navClose").onclick = () => setNav(false);
$("#nav").addEventListener("click", (e) => {
  if (e.target.closest("a")) setNav(false);
});
$("#navCountry").onclick = () => {
  setNav(false);
  $("#countryBtn").click();
};
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") setNav(false);
});
$("#searchForm").onsubmit = (e) => {
  e.preventDefault();
  location.hash = "#/search?q=" + encodeURIComponent($("#searchInput").value);
};
addEventListener(
  "scroll",
  () => $("#header").classList.toggle("scrolled", scrollY > 10),
  { passive: true },
);
saveCart();
paintCountryBtn();
loadRates();
route();