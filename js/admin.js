// AFLUX admin dashboard. Needs the Supabase tables from the setup SQL.
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const ngn = n => "₦" + Number(n || 0).toLocaleString("en-NG");
const STATUSES = ["new", "paid", "shipped", "delivered", "cancelled"];
const ICONS = {
  dashboard: '<path d="M4 4h7v9H4zM13 4h7v5h-7zM13 11h7v9h-7zM4 15h7v5H4z"/>',
  orders: '<path d="M3 4h2l2.4 11h10.2L20 7H6"/><circle cx="9" cy="19" r="1.3"/><circle cx="17" cy="19" r="1.3"/>',
  customers: '<circle cx="12" cy="8" r="4"/><path d="M4 21c.6-4.2 3.8-7 8-7s7.4 2.8 8 7"/>',
  box: '<path d="M12 3l8 4v10l-8 4-8-4V7zM4 7l8 4 8-4M12 11v10"/>',
  wallet: '<path d="M4 7h16v12H4zM4 7l2-3h12l2 3M16 13h2"/>',
  shirt: '<path d="M8 4L3 8l2.5 3L8 10v10h8V10l2.5 1L21 8l-5-4c-.8 1.4-2.2 2-4 2S8.800 5.400 8 4z"/>'
};
const svg = k => `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[k]}</svg>`;
ICONS.products = ICONS.shirt;
ICONS.settings = '<circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/>';
ICONS.site = '<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4"/>';
const NAV = [["dashboard", "Dashboard"], ["products", "Products"], ["site", "Website"], ["settings", "Settings"], ["orders", "Orders"], ["customers", "Customers"]];
const D = { site: {}, settings: {}, orders: [], people: [], prods: [], products: 0, name: "Admin" };
let OF = "all"; // orders filter
const DAY = 864e5;
const ago = d => { const m = Math.max(1, Math.round((Date.now() - new Date(d)) / 6e4)); return m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} d ago`; };
const pill = s => `<span class="pill ${esc(s)}">${esc(s)}</span>`;
function toast(msg) { const t = $("#toast"); t.textContent = msg; t.classList.add("show"); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove("show"), 2500); }

/* ---------- Sign in and data ---------- */
function gate(msg = "", note = "") {
  $("#shell").hidden = true; $("#gate").hidden = false;
  $("#gate").innerHTML = `<form class="gbox" id="gform"><span class="brand">AFLUX</span><h1>Admin sign in</h1>${note ? `<p>${esc(note)}</p>` : ""}
  <label>Email<input id="gemail" type="email" autocomplete="username" required></label>
  <label>Password<input id="gpass" type="password" autocomplete="current-password" required></label>
  <button class="btn">Sign in</button><p class="err" role="alert">${esc(msg)}</p><a class="mut" href="index.html">Back to the store</a></form>`;
  $("#gform").onsubmit = async e => {
    e.preventDefault();
    const { error } = await db.auth.signInWithPassword({ email: $("#gemail").value.trim(), password: $("#gpass").value });
    error ? gate("Wrong email or password.") : start();
  };
}
async function start() {
  const { data: { session } } = await db.auth.getSession();
  if (!session) return gate();
  const { data: me } = await db.from("admins").select("user_id").maybeSingle();
  if (!me) return gate("", "This account doesn’t have admin access. Sign in with an admin account.");
  const [o, pe, pr, st, se] = await Promise.all([
    db.from("orders").select("*").order("created_at", { ascending: false }),
    db.from("profiles").select("*").order("created_at", { ascending: false }),
    db.from("products").select("*").order("created_at", { ascending: false }),
    db.from("site_content").select("value").eq("key", "site").maybeSingle(),
    db.from("site_content").select("value").eq("key", "settings").maybeSingle()
  ]);
  if (o.error) return gate("Couldn’t load data: " + o.error.message);
  D.orders = o.data; D.people = pe.data || []; D.prods = pr.data || []; D.products = D.prods.length; D.site = (st.data && st.data.value) || {}; D.settings = (se.data && se.data.value) || {};
  D.name = (session.user.user_metadata && session.user.user_metadata.name) || "Admin";
  $("#gate").hidden = true; $("#shell").hidden = false;
  $("#hello").textContent = `Welcome back, ${D.name.split(" ")[0]}`;
  $("#av").textContent = D.name[0].toUpperCase();
  $("#menu").innerHTML = NAV.map(([k, l]) => `<a href="#${k}" data-k="${k}">${svg(k)}<span>${l}</span></a>`).join("");
  show();
}

/* ---------- Views ---------- */
function chart() {
  const days = [...Array(7)].map((_, i) => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - 6 + i); return d; });
  const vals = days.map(d => D.orders.filter(o => o.status !== "cancelled" && new Date(o.created_at).toDateString() === d.toDateString()).reduce((s, o) => s + (o.total || 0), 0));
  const W = 640, H = 230, max = Math.max(...vals, 1);
  const x = i => 90 + i * (W - 110) / 6, y = v => H - 34 - v / max * (H - 64);
  const pts = vals.map((v, i) => `${x(i)},${y(v)}`).join(" ");
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Revenue for the last 7 days">
  ${[0, .5, 1].map(f => `<line x1="90" x2="${W - 20}" y1="${y(max * f)}" y2="${y(max * f)}" stroke="#E7E2D9"/><text x="82" y="${y(max * f) + 4}" text-anchor="end">${ngn(Math.round(max * f))}</text>`).join("")}
  <polygon points="${x(0)},${y(0)} ${pts} ${x(6)},${y(0)}" fill="rgba(198,166,107,.2)"/><polyline points="${pts}" fill="none" stroke="#171717" stroke-width="2"/>
  ${vals.map((v, i) => `<circle cx="${x(i)}" cy="${y(v)}" r="3.5" fill="#171717"/><text x="${x(i)}" y="${H - 8}" text-anchor="middle">${days[i].toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</text>`).join("")}</svg>`;
}
const oRow = o => {
  const c = o.customer || {};
  return `<tr><td><strong>${esc(o.ref)}</strong><br><small>${esc(new Date(o.created_at).toLocaleString("en-NG"))}</small></td>
  <td>${esc(c.name)}<br><small>${esc(c.email)}<br>${esc(c.phone)}</small><br><small>${esc([c.address, c.city, c.state].filter(Boolean).join(", "))}</small></td>
  <td>${(o.items || []).map(i => `${esc(i.qty)} × ${esc(i.name)} <small>(${esc(i.color)}, ${esc(i.size)})</small>`).join("<br>")}</td>
  <td>${ngn(o.total)}<br><small>${esc(c.shipping)} · ${esc(c.payment)}</small></td>
  <td><select data-id="${esc(o.id)}" aria-label="Status for ${esc(o.ref)}">${STATUSES.map(s => `<option ${s === o.status ? "selected" : ""}>${s}</option>`).join("")}</select></td></tr>`;
};
function dashView() {
  const live = D.orders.filter(o => o.status !== "cancelled"), week = x => Date.now() - new Date(x.created_at) < 7 * DAY;
  const stat = (label, value, sub, icon) => `<div class="card stat"><span class="ico">${svg(icon)}</span><div><span class="lbl">${label}</span><strong>${value}</strong><small>${sub}</small></div></div>`;
  const feed = [...D.orders.slice(0, 5).map(o => ({ t: o.created_at, h: `New order ${esc(o.ref)}`, s: `${ngn(o.total)} from ${esc((o.customer || {}).name || "a guest")}` })),
    ...D.people.slice(0, 5).map(p => ({ t: p.created_at, h: "New customer registered", s: esc(p.email) }))].sort((a, b) => new Date(b.t) - new Date(a.t)).slice(0, 6);
  const imp = D.products ? "" : `<div class="card note"><div><strong>Move your products into the database</strong><p>Your store still reads products from <code>data.js</code>. Import them once so they can be managed here.</p></div><button class="btn" id="import">Import ${PRODUCTS.length} products</button></div>`;
  return `${imp}<div class="stats">
  ${stat("Total orders", D.orders.length, `${D.orders.filter(week).length} in the last 7 days`, "box")}
  ${stat("Customers", D.people.length, `${D.people.filter(week).length} joined in the last 7 days`, "customers")}
  ${stat("Revenue", ngn(live.reduce((s, o) => s + (o.total || 0), 0)), `${ngn(live.filter(week).reduce((s, o) => s + (o.total || 0), 0))} in the last 7 days`, "wallet")}
  ${stat("Products", D.products, "In the database", "shirt")}</div>
  <div class="cols"><div class="card"><h2>Sales overview</h2>${chart()}</div>
  <div class="card"><h2>Quick actions</h2><div class="acts"><a href="#products">Manage products</a><a href="#settings">Delivery and discounts</a><a href="#orders">View orders</a><a href="#customers">View customers</a><a href="index.html">View website</a></div></div></div>
  <div class="cols"><div class="card"><div class="bar"><h2>Latest orders</h2><a class="link" href="#orders">View all orders</a></div>
  ${D.orders.length ? `<div class="scroll"><table><thead><tr><th>Order</th><th>Customer</th><th>Total</th><th>Status</th></tr></thead><tbody>${D.orders.slice(0, 5).map(o => `<tr><td><strong>${esc(o.ref)}</strong><br><small>${esc(ago(o.created_at))}</small></td><td>${esc((o.customer || {}).name)}</td><td>${ngn(o.total)}</td><td>${pill(o.status)}</td></tr>`).join("")}</tbody></table></div>` : "<p>No orders yet. They’ll appear here as soon as a customer checks out.</p>"}</div>
  <div class="card"><h2>Recent activity</h2>${feed.length ? `<ul class="feed">${feed.map(f => `<li><div><strong>${f.h}</strong><small>${f.s}</small></div><small>${esc(ago(f.t))}</small></li>`).join("")}</ul>` : "<p>Nothing yet.</p>"}</div></div>`;
}
function ordersView() {
  const list = D.orders.filter(o => OF === "all" || o.status === OF);
  return `<div class="card"><div class="bar"><h2>Orders (${list.length})</h2><label>Show <select id="ofilter">${["all", ...STATUSES].map(s => `<option ${s === OF ? "selected" : ""}>${s}</option>`).join("")}</select></label></div>
  ${list.length ? `<div class="scroll"><table><thead><tr><th>Order</th><th>Customer</th><th>Items</th><th>Total</th><th>Status</th></tr></thead><tbody>${list.map(oRow).join("")}</tbody></table></div>` : "<p>No orders match this filter.</p>"}</div>`;
}
function customersView() {
  const rows = D.people.map(p => {
    const mine = D.orders.filter(o => o.user_id === p.id && o.status !== "cancelled");
    return `<tr><td><strong>${esc(p.name || "—")}</strong></td><td>${esc(p.email)}</td><td>${esc(new Date(p.created_at).toLocaleDateString("en-NG"))}</td><td>${mine.length}</td><td>${ngn(mine.reduce((s, o) => s + (o.total || 0), 0))}</td></tr>`;
  }).join("");
  return `<div class="card"><h2>Customers (${D.people.length})</h2>${rows ? `<div class="scroll"><table><thead><tr><th>Name</th><th>Email</th><th>Joined</th><th>Orders</th><th>Spent</th></tr></thead><tbody>${rows}</tbody></table></div>` : "<p>No customer accounts yet.</p>"}<p><small>Guest checkouts appear under Orders, not here.</small></p></div>`;
}
const VIEWS = { settings: settingsView, site: siteView, dashboard: dashView, products: productsView, orders: ordersView, customers: customersView };
function show() {
  if ($("#shell").hidden) return;
  const [h, arg] = location.hash.slice(1).split("/"), k = VIEWS[h] ? h : "dashboard";
  $("#menu").querySelectorAll("a").forEach(a => a.classList.toggle("on", a.dataset.k === k));
  $("#view").innerHTML = VIEWS[k](arg);
  if ($("#colors")) { paintColors(); paintPhotos(); }
  if ($("#codes")) paintCodes();
  $("#side").classList.remove("open"); $("#scrim").classList.remove("open");
  scrollTo(0, 0);
}

/* ---------- Products ---------- */
const CATS = { tees: "Essential tees", streetwear: "Elevated streetwear", signature: "Signature pieces", essentials: "Everyday essentials" };
let E = null; // the product being edited: { id, colors, images }
const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
function productsView(arg) {
  if (arg) {
    const p = arg === "new" ? null : D.prods.find(x => x.id === arg);
    return arg !== "new" && !p ? `<div class="card"><p>Product not found.</p><a class="link" href="#products">Back to products</a></div>` : productForm(p);
  }
  const rows = D.prods.map(p => `<tr><td class="pt">${p.images && p.images[0] ? `<img src="${esc(p.images[0])}" alt="">` : ""}</td><td><strong>${esc(p.name)}</strong><br><small>${esc(CATS[p.cat] || p.cat)}</small></td>
  <td>${p.sale ? `<s>${ngn(p.price)}</s><br>${ngn(p.sale)}` : ngn(p.price)}</td><td>${p.published ? pill("published") : pill("hidden")} ${p.sold_out ? pill("sold out") : ""}</td>
  <td><a class="link" href="#products/${esc(p.id)}">Edit</a><button class="linkbtn" data-del="${esc(p.id)}">Delete</button></td></tr>`).join("");
  return `<div class="card"><div class="bar"><h2>Products (${D.prods.length})</h2><a class="btn" href="#products/new">Add product</a></div>
  ${rows ? `<div class="scroll"><table><thead><tr><th></th><th>Product</th><th>Price</th><th>Status</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>` : "<p>No products yet. Add one, or import your current products from the dashboard.</p>"}</div>`;
}
function productForm(p) {
  E = { id: p ? p.id : "", colors: p ? JSON.parse(JSON.stringify(p.colors || [])) : [{ name: "Black", hex: "#171717" }], images: p ? [...(p.images || [])] : [] };
  const v = (k, d = "") => esc(p && p[k] != null ? p[k] : d);
  return `<form id="pform" class="card pform" novalidate><div class="bar"><h2>${p ? "Edit product" : "Add product"}</h2><a class="link" href="#products">Back to products</a></div>
  <div class="grid2"><label>Name<input name="name" required value="${v("name")}"></label>
  <label>Category<select name="cat">${Object.entries(CATS).map(([k, l]) => `<option value="${k}" ${p && p.cat === k ? "selected" : ""}>${l}</option>`).join("")}</select></label>
  <label>Price (₦)<input name="price" type="number" min="1" step="100" required value="${v("price")}"></label>
  <label>Sale price (₦, optional)<input name="sale" type="number" min="1" step="100" value="${v("sale")}"></label></div>
  <label>Description<textarea name="descr" rows="3">${v("descr")}</textarea></label>
  <label>Details (one per line)<textarea name="details" rows="4">${esc(((p && p.details) || []).join("\n"))}</textarea></label>
  <label>Care instructions<textarea name="care" rows="2">${v("care")}</textarea></label>
  <label>Sizes (separate with commas)<input name="sizes" value="${esc(((p && p.sizes) || ["S", "M", "L", "XL"]).join(", "))}"></label>
  <fieldset><legend>Colours</legend><div id="colors"></div><button type="button" class="btn ghost sm" id="addcolor">Add colour</button></fieldset>
  <fieldset><legend>Photos</legend><p class="hint">Photos match colours in order: the first photo is the first colour, and so on. Up to 5 MB each.</p><div id="photos" class="thumbs"></div><input type="file" id="files" accept="image/*" multiple></fieldset>
  <div class="chks"><label><input type="checkbox" name="sold_out" ${p && p.sold_out ? "checked" : ""}> Sold out</label><label><input type="checkbox" name="published" ${!p || p.published ? "checked" : ""}> Visible in store</label></div>
  <div><button class="btn" id="psave">Save product</button></div><p class="err" id="perr" role="alert"></p></form>`;
}
const paintColors = () => $("#colors").innerHTML = E.colors.map((c, i) => `<div class="crow"><input type="color" data-ch="${i}" value="${esc(c.hex)}" aria-label="Colour swatch"><input data-cn="${i}" value="${esc(c.name)}" placeholder="Colour name" aria-label="Colour name"><button type="button" class="linkbtn" data-rc="${i}">Remove</button></div>`).join("");
const paintPhotos = () => $("#photos").innerHTML = E.images.map((u, i) => `<div class="thumb"><img src="${esc(u)}" alt="Photo ${i + 1}"><span><button type="button" data-pm="${i}|-1" aria-label="Move earlier">‹</button><button type="button" data-pm="${i}|1" aria-label="Move later">›</button><button type="button" data-pr="${i}" aria-label="Remove photo">×</button></span></div>`).join("") || "<small>No photos yet.</small>";
$("#view").addEventListener("input", e => {
  const t = e.target; if (!E) return;
  if (t.dataset.ch) E.colors[t.dataset.ch].hex = t.value;
  if (t.dataset.cn) E.colors[t.dataset.cn].name = t.value;
});
$("#view").addEventListener("click", async e => {
  const b = e.target.closest("button"); if (!b) return;
  if (b.id === "addcolor") { E.colors.push({ name: "", hex: "#d9d2c7" }); paintColors(); }
  else if (b.dataset.rc) { E.colors.splice(+b.dataset.rc, 1); paintColors(); }
  else if (b.dataset.pr) { E.images.splice(+b.dataset.pr, 1); paintPhotos(); }
  else if (b.dataset.pm) {
    const [i, d] = b.dataset.pm.split("|").map(Number), j = i + d;
    if (j >= 0 && j < E.images.length) { [E.images[i], E.images[j]] = [E.images[j], E.images[i]]; paintPhotos(); }
  } else if (b.dataset.del) {
    const p = D.prods.find(x => x.id === b.dataset.del);
    if (!confirm(`Delete “${p.name}”? This can’t be undone.`)) return;
    const { error } = await db.from("products").delete().eq("id", p.id);
    if (error) return toast("Couldn’t delete: " + error.message);
    toast("Product deleted."); start();
  }
});
$("#view").addEventListener("change", async e => {
  if (e.target.id !== "files") return;
  for (const f of e.target.files) {
    if (f.size > 5e6 || !f.type.startsWith("image/")) { toast(`${f.name}: use an image under 5 MB.`); continue; }
    const path = `products/${E.id || "new"}/${Date.now()}-${f.name.replace(/[^\w.-]/g, "_")}`;
    const { error } = await db.storage.from("site-images").upload(path, f, { cacheControl: "31536000" });
    if (error) { toast("Upload failed: " + error.message); continue; }
    E.images.push(db.storage.from("site-images").getPublicUrl(path).data.publicUrl);
  }
  e.target.value = ""; paintPhotos();
});
$("#view").addEventListener("submit", async e => {
  if (e.target.id !== "pform") return;
  e.preventDefault();
  const fd = new FormData(e.target), fail = m => { $("#perr").textContent = m; };
  const name = fd.get("name").trim(), price = +fd.get("price"), sale = fd.get("sale") ? +fd.get("sale") : null;
  const sizes = fd.get("sizes").split(",").map(s => s.trim()).filter(Boolean), colors = E.colors.filter(c => c.name.trim());
  if (!name) return fail("Enter a product name.");
  if (!(price > 0)) return fail("Enter a price.");
  if (sale && sale >= price) return fail("The sale price must be lower than the price.");
  if (!sizes.length) return fail("Add at least one size.");
  if (!colors.length) return fail("Add at least one colour with a name.");
  let id = E.id;
  if (!id) { const base = slug(name) || "product"; let n = 2; id = base; while (D.prods.some(x => x.id === id)) id = `${base}-${n++}`; }
  const row = { id, name, cat: fd.get("cat"), price, sale, colors, sizes, descr: fd.get("descr").trim(), details: fd.get("details").split("\n").map(s => s.trim()).filter(Boolean), care: fd.get("care").trim(), images: E.images, sold_out: fd.has("sold_out"), published: fd.has("published"), updated_at: new Date().toISOString() };
  $("#psave").disabled = true;
  const { error } = await db.from("products").upsert(row);
  $("#psave").disabled = false;
  if (error) return fail("Couldn’t save: " + error.message);
  toast("Product saved."); location.hash = "#products"; start();
});

/* ---------- Website content ---------- */
const SITE_DEFAULTS = {
  announce: "Free delivery in Nigeria on orders over ₦100,000",
  hero: { eyebrow: "Premium contemporary fashion", title: "More than\njust clothing.", lead: "AFLUX is where modern style meets everyday comfort. Designed for those who move differently.", button: "SHOP NOW", image: "images/hero.jpg" },
  about: { tag: "OUR APPROACH", title: "Made slowly, worn for years.", body1: "AFLUX is a contemporary fashion label built around refined streetwear and everyday essentials. We design a small number of pieces each season, in heavyweight fabrics and quiet colours, and we make them to last.", body2: "Our studio is in Lagos. Quiet colours, considered proportions, and nothing that dates by next season." }
};
function siteView() {
  const S = D.site || {}, val = (g, k) => esc(((S[g] && S[g][k]) || "").trim() || SITE_DEFAULTS[g][k]);
  const f = (g, k, label, rows) => rows ? `<label>${label}<textarea name="${g}.${k}" rows="${rows}">${val(g, k)}</textarea></label>` : `<label>${label}<input name="${g}.${k}" value="${val(g, k)}"></label>`;
  return `<form id="sform" class="card pform" novalidate><div class="bar"><h2>Website content</h2><a class="link" href="index.html" target="_blank" rel="noopener">View website</a></div>
  <fieldset><legend>Announcement bar</legend><label>Text<input name="announce" value="${esc((S.announce || "").trim() || SITE_DEFAULTS.announce)}"></label></fieldset>
  <fieldset><legend>Homepage hero</legend>${f("hero", "eyebrow", "Small tagline")}${f("hero", "title", "Headline (a new line makes a line break)", 2)}${f("hero", "lead", "Paragraph", 3)}${f("hero", "button", "Button text")}
  <label>Image<input name="hero.image" id="heroimage" value="${val("hero", "image")}"></label><img class="prev" id="heroprev" src="${val("hero", "image")}" alt="Hero preview"><input type="file" id="heroup" accept="image/*"><p class="hint">Upload a photo, or paste an image path. Up to 5 MB. Landscape or square photos work best.</p></fieldset>
  <fieldset><legend>About section</legend>${f("about", "tag", "Small label")}${f("about", "title", "Heading")}${f("about", "body1", "Paragraph 1", 4)}${f("about", "body2", "Paragraph 2", 3)}</fieldset>
  <div><button class="btn" id="ssave">Save changes</button></div><p class="err" id="serr" role="alert"></p></form>`;
}
$("#view").addEventListener("change", async e => {
  if (e.target.id !== "heroup" || !e.target.files[0]) return;
  const f = e.target.files[0];
  if (f.size > 5e6 || !f.type.startsWith("image/")) return toast("Use an image under 5 MB.");
  const path = `site/hero-${Date.now()}-${f.name.replace(/[^\w.-]/g, "_")}`;
  const { error } = await db.storage.from("site-images").upload(path, f, { cacheControl: "31536000" });
  if (error) return toast("Upload failed: " + error.message);
  const url = db.storage.from("site-images").getPublicUrl(path).data.publicUrl;
  $("#heroimage").value = url; $("#heroprev").src = url; toast("Photo uploaded. Click Save changes to publish it.");
});
$("#view").addEventListener("submit", async e => {
  if (e.target.id !== "sform") return;
  e.preventDefault();
  const fd = new FormData(e.target), value = { announce: fd.get("announce").trim(), hero: {}, about: {} };
  for (const [k, v] of fd.entries()) { const [g, key] = k.split("."); if (key) value[g][key] = v.trim(); }
  $("#ssave").disabled = true;
  const { error } = await db.from("site_content").upsert({ key: "site", value, updated_at: new Date().toISOString() });
  $("#ssave").disabled = false;
  if (error) { $("#serr").textContent = "Couldn’t save: " + error.message; return; }
  D.site = value; $("#serr").textContent = ""; toast("Saved. Reload your store to see the changes.");
});

/* ---------- Settings ---------- */
const SET_DEFAULTS = { freeOver: 100000, standard: 5000, express: 12000, codes: [{ code: "AFLUX10", percent: 10 }] };
let CODES = [];
function settingsView() {
  const s = { ...SET_DEFAULTS, ...D.settings };
  CODES = (s.codes || []).map(c => ({ ...c }));
  const n = (k, label) => `<label>${label}<input name="${k}" type="number" min="0" step="100" value="${esc(s[k])}"></label>`;
  return `<form id="setform" class="card pform" novalidate><div class="bar"><h2>Settings</h2></div>
  <fieldset><legend>Delivery</legend><div class="grid2">${n("freeOver", "Free delivery on orders over (₦)")}${n("standard", "Standard delivery fee (₦)")}${n("express", "Express delivery fee (₦)")}</div>
  <p class="hint">Set the free-delivery amount to 0 to turn free delivery off. If the announcement bar mentions an amount, update it under Website too.</p></fieldset>
  <fieldset><legend>Discount codes</legend><div id="codes"></div><button type="button" class="btn ghost sm" id="addcode">Add code</button><p class="hint">Customers enter a code in their bag to get a percentage off the order.</p></fieldset>
  <div><button class="btn" id="setsave">Save settings</button></div><p class="err" id="seterr" role="alert"></p></form>`;
}
const paintCodes = () => $("#codes").innerHTML = CODES.map((c, i) => `<div class="crow"><input data-cc="${i}" value="${esc(c.code)}" placeholder="CODE" aria-label="Code" style="text-transform:uppercase"><input data-cp="${i}" type="number" min="1" max="100" value="${esc(c.percent)}" aria-label="Percent off" style="max-width:90px"><span>% off</span><button type="button" class="linkbtn" data-rcode="${i}">Remove</button></div>`).join("") || "<small>No codes yet.</small>";
$("#view").addEventListener("input", e => {
  const t = e.target;
  if (t.dataset.cc) CODES[t.dataset.cc].code = t.value;
  if (t.dataset.cp) CODES[t.dataset.cp].percent = +t.value;
});
$("#view").addEventListener("click", e => {
  const b = e.target.closest("button"); if (!b) return;
  if (b.id === "addcode") { CODES.push({ code: "", percent: 10 }); paintCodes(); }
  else if (b.dataset.rcode) { CODES.splice(+b.dataset.rcode, 1); paintCodes(); }
});
$("#view").addEventListener("submit", async e => {
  if (e.target.id !== "setform") return;
  e.preventDefault();
  const fd = new FormData(e.target), fail = m => { $("#seterr").textContent = m; };
  const value = { freeOver: +fd.get("freeOver"), standard: +fd.get("standard"), express: +fd.get("express") };
  if ([value.freeOver, value.standard, value.express].some(x => !(x >= 0))) return fail("Enter valid amounts (0 or more).");
  const codes = CODES.map(c => ({ code: c.code.trim().toUpperCase().replace(/\s+/g, ""), percent: Math.round(c.percent) })).filter(c => c.code);
  if (codes.some(c => !(c.percent >= 1 && c.percent <= 100))) return fail("Each code needs a discount between 1 and 100%.");
  if (new Set(codes.map(c => c.code)).size !== codes.length) return fail("Each code must be different.");
  value.codes = codes;
  $("#setsave").disabled = true;
  const { error } = await db.from("site_content").upsert({ key: "settings", value, updated_at: new Date().toISOString() });
  $("#setsave").disabled = false;
  if (error) return fail("Couldn’t save: " + error.message);
  D.settings = value; fail(""); toast("Settings saved.");
});

/* ---------- Actions ---------- */
$("#view").addEventListener("change", async e => {
  if (e.target.id === "ofilter") { OF = e.target.value; return show(); }
  if (!e.target.dataset.id) return;
  const { error } = await db.from("orders").update({ status: e.target.value }).eq("id", e.target.dataset.id);
  const o = D.orders.find(x => x.id === e.target.dataset.id);
  if (!error && o) o.status = e.target.value;
  toast(error ? "Couldn’t save that change." : "Status saved.");
});
$("#view").addEventListener("click", async e => {
  if (e.target.id !== "import") return;
  e.target.disabled = true;
  const rows = PRODUCTS.map(p => ({ id: p.id, name: p.name, cat: p.cat, price: p.price, sale: p.sale || null, colors: p.colors, sizes: p.sizes, descr: p.desc, details: p.details, care: p.care, images: p.images || [], sold_out: !!p.soldOut, popularity: p.pop, created_at: p.date }));
  const { error } = await db.from("products").upsert(rows);
  if (error) { e.target.disabled = false; return toast("Import failed: " + error.message); }
  toast("Products imported."); start();
});
$("#logout").onclick = async () => { await db.auth.signOut(); gate(); };
const menu = open => { $("#side").classList.toggle("open", open); $("#scrim").classList.toggle("open", open); };
$("#burger").onclick = () => menu(true);
$("#scrim").onclick = () => menu(false);
addEventListener("hashchange", show);
start();