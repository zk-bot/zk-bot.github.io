
if ('serviceWorker' in navigator) { navigator.serviceWorker.getRegistrations().then(function(rs){ rs.forEach(function(r){ r.unregister(); }); }).catch(function(){}); }
const canvas = document.querySelector("#brep-canvas");
const ctx = canvas ? canvas.getContext("2d") : null;
const themeToggle = document.querySelector(".theme-toggle");
const tabButtons = document.querySelectorAll(".tab-button");
const tabPanels = document.querySelectorAll(".tab-panel");
const datasetButtons = document.querySelectorAll(".dataset-button");
const retrievalPanels = document.querySelectorAll(".retrieval-panel");
const qualitativeButtons = document.querySelectorAll(".qualitative-button");
const qualitativePanels = document.querySelectorAll(".qualitative-panel");
const copyBibtexButton = document.querySelector(".copy-bibtex");

let width = 0;
let height = 0;
let dpr = 1;

function resizeCanvas() {
  if (!canvas || !ctx) return;
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  width = canvas.clientWidth;
  height = canvas.clientHeight;
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function project(point, time) {
  const [x, y, z] = point;
  const rotateY = time * 0.00018;
  const rotateX = -0.55 + Math.sin(time * 0.00025) * 0.06;
  const cosY = Math.cos(rotateY);
  const sinY = Math.sin(rotateY);
  const cosX = Math.cos(rotateX);
  const sinX = Math.sin(rotateX);

  const rx = x * cosY - z * sinY;
  const rz = x * sinY + z * cosY;
  const ry = y * cosX - rz * sinX;
  const depth = y * sinX + rz * cosX + 560;
  const scale = Math.min(width, height) * 0.72;

  return [
    width * 0.54 + (rx / depth) * scale,
    height * 0.5 + (ry / depth) * scale,
    depth,
  ];
}

const vertices = [
  [-190, -82, -90],
  [190, -82, -90],
  [190, 82, -90],
  [-190, 82, -90],
  [-190, -82, 90],
  [190, -82, 90],
  [190, 82, 90],
  [-190, 82, 90],
  [-92, -142, -38],
  [92, -142, -38],
  [92, -82, -38],
  [-92, -82, -38],
  [-92, -142, 38],
  [92, -142, 38],
  [92, -82, 38],
  [-92, -82, 38],
];

const faces = [
  [0, 1, 2, 3, "#2d6a4f"],
  [4, 5, 6, 7, "#2457a6"],
  [0, 4, 7, 3, "#0f766e"],
  [1, 5, 6, 2, "#c58b2b"],
  [8, 9, 10, 11, "#b14e43"],
  [12, 13, 14, 15, "#2457a6"],
  [8, 12, 15, 11, "#2d6a4f"],
  [9, 13, 14, 10, "#0f766e"],
];

const edges = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 0],
  [4, 5],
  [5, 6],
  [6, 7],
  [7, 4],
  [0, 4],
  [1, 5],
  [2, 6],
  [3, 7],
  [8, 9],
  [9, 10],
  [10, 11],
  [11, 8],
  [12, 13],
  [13, 14],
  [14, 15],
  [15, 12],
  [8, 12],
  [9, 13],
  [10, 14],
  [11, 15],
];

const holes = [
  [-112, 0, 96, 26],
  [-38, 0, 96, 18],
  [38, 0, 96, 18],
  [112, 0, 96, 26],
  [0, 0, -96, 34],
];

function drawFace(points, color) {
  ctx.beginPath();
  points.forEach(([x, y], index) => {
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.fillStyle = `${color}88`;
  ctx.fill();
}

function drawLoop(cx, cy, z, radius, time) {
  const center = project([cx, cy, z], time);
  const right = project([cx + radius, cy, z], time);
  const down = project([cx, cy + radius, z], time);
  const rx = Math.abs(right[0] - center[0]);
  const ry = Math.abs(down[1] - center[1]);

  ctx.beginPath();
  ctx.ellipse(center[0], center[1], Math.max(rx, 4), Math.max(ry, 4), 0, 0, Math.PI * 2);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.78)";
  ctx.lineWidth = 2;
  ctx.stroke();
}

function drawGrid() {
  ctx.strokeStyle = "rgba(255, 255, 255, 0.055)";
  ctx.lineWidth = 1;
  for (let x = 0; x < width; x += 54) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y < height; y += 54) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
}

function render(time = 0) {
  if (!canvas || !ctx) return;
  ctx.clearRect(0, 0, width, height);
  drawGrid();

  const projected = vertices.map((vertex) => project(vertex, time));
  const sortedFaces = faces
    .map((face) => ({
      face,
      depth: face.slice(0, 4).reduce((sum, index) => sum + projected[index][2], 0) / 4,
    }))
    .sort((a, b) => b.depth - a.depth);

  sortedFaces.forEach(({ face }) => {
    drawFace(face.slice(0, 4).map((index) => projected[index]), face[4]);
  });

  ctx.lineCap = "round";
  edges.forEach(([a, b], index) => {
    const start = projected[a];
    const end = projected[b];
    ctx.beginPath();
    ctx.moveTo(start[0], start[1]);
    ctx.lineTo(end[0], end[1]);
    ctx.strokeStyle = index % 3 === 0 ? "rgba(255, 255, 255, 0.86)" : "rgba(255, 255, 255, 0.45)";
    ctx.lineWidth = index % 3 === 0 ? 2.4 : 1.2;
    ctx.stroke();
  });

  holes.forEach(([x, y, z, r]) => drawLoop(x, y, z, r, time));

  projected.forEach(([x, y], index) => {
    ctx.beginPath();
    ctx.arc(x, y, index < 8 ? 3.8 : 2.8, 0, Math.PI * 2);
    ctx.fillStyle = index < 8 ? "#f7f4ed" : "#c58b2b";
    ctx.fill();
  });

  requestAnimationFrame(render);
}

if (canvas && ctx) {
  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);
  requestAnimationFrame(render);
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  if (themeToggle) {
    const isDark = theme === "dark";
    themeToggle.textContent = isDark ? "Light" : "Dark";
    themeToggle.setAttribute("aria-pressed", String(isDark));
  }
}

const savedTheme = localStorage.getItem("brepclip-theme");
const preferredTheme = "light";
applyTheme(savedTheme || preferredTheme);

if (themeToggle) {
  themeToggle.addEventListener("click", () => {
    const nextTheme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    localStorage.setItem("brepclip-theme", nextTheme);
    applyTheme(nextTheme);
  });
}

tabButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const target = button.dataset.tab;

    tabButtons.forEach((tabButton) => {
      const isActive = tabButton === button;
      tabButton.classList.toggle("active", isActive);
      tabButton.setAttribute("aria-selected", String(isActive));
    });

    tabPanels.forEach((panel) => {
      const isActive = panel.dataset.panel === target;
      panel.classList.toggle("active", isActive);
      panel.hidden = !isActive;
    });
  });
});

datasetButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const target = button.dataset.dataset;

    datasetButtons.forEach((datasetButton) => {
      const isActive = datasetButton === button;
      datasetButton.classList.toggle("active", isActive);
      datasetButton.setAttribute("aria-selected", String(isActive));
    });

    retrievalPanels.forEach((panel) => {
      const isActive = panel.dataset.retrievalPanel === target;
      panel.classList.toggle("active", isActive);
      panel.hidden = !isActive;
    });
  });
});

qualitativeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const target = button.dataset.qualitativeTab;

    qualitativeButtons.forEach((qualitativeButton) => {
      const isActive = qualitativeButton === button;
      qualitativeButton.classList.toggle("active", isActive);
      qualitativeButton.setAttribute("aria-selected", String(isActive));
    });

    qualitativePanels.forEach((panel) => {
      const isActive = panel.dataset.qualitativePanel === target;
      panel.classList.toggle("active", isActive);
      panel.hidden = !isActive;
    });
  });
});

if (copyBibtexButton) {
  copyBibtexButton.addEventListener("click", async () => {
    const target = document.getElementById(copyBibtexButton.dataset.copyTarget);
    if (!target) return;

    const bibtex = target.textContent.trim();
    const originalMarkup = copyBibtexButton.innerHTML;

    try {
      await navigator.clipboard.writeText(bibtex);
      copyBibtexButton.classList.add("copied");
      copyBibtexButton.textContent = "Copied";
    } catch {
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(target);
      selection.removeAllRanges();
      selection.addRange(range);
      copyBibtexButton.textContent = "Select";
    }

    window.setTimeout(() => {
      copyBibtexButton.innerHTML = originalMarkup;
      copyBibtexButton.classList.remove("copied");
    }, 1800);
  });
}
