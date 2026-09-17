(() => {
  const form = document.querySelector("#analytics-filters"), status = document.querySelector("#analytics-status");
  if (!form) return;
  let chart, controller, serial = 0;
  const element = (tag, text) => { const node = document.createElement(tag); if (text !== undefined) node.textContent = text; return node; };
  function table(kind, rows, heading) {
    const container = document.querySelector('[data-table="' + kind + '"]'); container.replaceChildren();
    if (!rows.length) { container.append(element("p", "No visits")); return; }
    let page = 0;
    const render = () => {
      const focus = window.KuttFocus.capture();
      container.replaceChildren();
      const table = element("table"), head = element("thead"), header = element("tr"), body = element("tbody");
      for (const title of [heading, "Visits"]) { const cell = element("th", title); cell.scope = "col"; header.append(cell); }
      head.append(header); table.append(head, body);
      for (const item of rows.slice(page * 20, (page + 1) * 20)) {
        const row = element("tr"); row.append(element("td", item.name), element("td", Number(item.visits).toLocaleString())); body.append(row);
      }
      container.append(table);
      if (rows.length > 20) {
        const nav = element("nav"), prev = element("button", "Previous"), next = element("button", "Next");
        nav.className = "analytics-pagination"; nav.setAttribute("aria-label", heading + " pages");
        prev.type = next.type = "button"; prev.disabled = !page; next.disabled = (page + 1) * 20 >= rows.length;
        prev.id = "analytics-" + kind + "-previous"; next.id = "analytics-" + kind + "-next";
        prev.onclick = () => { page--; render(); }; next.onclick = () => { page++; render(); };
        nav.append(prev, element("span", (page + 1) + " / " + Math.ceil(rows.length / 20)), next); container.append(nav);
        window.KuttFocus.restore(focus, prev.disabled ? next : prev);
      } else {
        window.KuttFocus.restore(focus);
      }
    };
    render();
  }
  function options(name, rows, label, selected) {
    const select = form.elements[name]; select.replaceChildren(new Option(label, ""));
    for (const row of rows) select.add(new Option(row.name, row.id));
    select.value = selected;
  }
  async function load() {
    const focus = window.KuttFocus.capture();
    const current = ++serial;
    if (controller) controller.abort(); controller = new AbortController();
    const params = new URLSearchParams(new FormData(form));
    for (const [key, value] of [...params]) if (!value) params.delete(key);
    status.textContent = "Loading..."; status.classList.remove("error");
    document.querySelector("#analytics-report").hidden = true;
    for (const format of ["json", "csv"]) document.querySelector("#analytics-" + format).removeAttribute("href");
    form.querySelector('button[type="submit"]').disabled = true;
    try {
      const response = await fetch("/api/analytics?" + params, { headers: { Accept: "application/json" }, signal: controller.signal, cache: "no-store" });
      const data = await window.KuttResponses.read(response, window.KuttResponses.analytics);
      if (current !== serial) return;
      document.querySelector("#analytics-total").textContent = data.total.toLocaleString();
      document.querySelector("#analytics-links").textContent = data.visited_links + " / " + data.matched_links;
      options("domain", data.available_filters.domains, "All domains", data.filters.domain);
      options("tag", data.available_filters.tags, "All tags", data.filters.tag);
      table("days", data.by_day.map(row => ({ name: row.date, visits: row.visits })), "Date");
      table("tags", data.tags, "Tag");
      for (const kind of window.KuttResponses.dimensions) table(kind, data.stats[kind], ({ os: "OS", referrer: "Referrer", browser: "Browser", country: "Country" })[kind]);
      if (chart) chart.destroy();
      chart = new Chart(document.querySelector("#analytics-chart"), {
        type: "bar", data: { labels: data.by_day.map(row => row.date), datasets: [{ label: "Visits", data: data.by_day.map(row => row.visits), backgroundColor: "#267ba2", borderColor: "#175470", borderWidth: 1 }] },
        options: { responsive: true, maintainAspectRatio: false, animation: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } }, x: { ticks: { maxTicksLimit: 10 } } } }
      });
      for (const format of ["json", "csv"]) { const exportParams = new URLSearchParams(params); exportParams.set("format", format); document.querySelector("#analytics-" + format).href = "/api/analytics?" + exportParams; }
      document.querySelector("#analytics-updated").textContent = "Updated " + new Date(data.generated_at).toLocaleString();
      document.querySelector("#analytics-report").hidden = false;
      status.textContent = data.selected_link ? "Link: " + data.selected_link : data.total ? "Report ready" : "No tracked visits in this range";
      history.replaceState(null, "", "/settings/analytics?" + params);
    } catch (error) {
      if (error.name !== "AbortError" && current === serial) { status.textContent = error.message; status.classList.add("error"); }
    } finally {
      if (current === serial) form.querySelector('button[type="submit"]').disabled = false;
      window.KuttFocus.restore(focus);
    }
  }
  form.addEventListener("submit", event => { event.preventDefault(); load(); });
  load();
})();
