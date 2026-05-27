// State
let selectedTone = "professional";
let selectedLength = "medium";
let currentBlog = "";

// API URL — automatically detect karega
const API_BASE = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
  ? "http://localhost:3000"
  : ""; // Render pe same origin se serve hoga

// ── Neural Canvas Animation ──────────────────
(function initNeuralCanvas() {
  const canvas = document.getElementById("neural-canvas");
  const ctx = canvas.getContext("2d");
  let nodes = [];

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  function createNodes(count = 55) {
    nodes = [];
    for (let i = 0; i < count; i++) {
      nodes.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        r: Math.random() * 2 + 1,
        pulse: Math.random() * Math.PI * 2,
      });
    }
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    nodes.forEach((n) => {
      n.x += n.vx;
      n.y += n.vy;
      n.pulse += 0.02;
      if (n.x < 0 || n.x > canvas.width) n.vx *= -1;
      if (n.y < 0 || n.y > canvas.height) n.vy *= -1;
    });

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 130) {
          const opacity = (1 - dist / 130) * 0.3;
          ctx.beginPath();
          ctx.moveTo(nodes[i].x, nodes[i].y);
          ctx.lineTo(nodes[j].x, nodes[j].y);
          ctx.strokeStyle = `rgba(56,189,248,${opacity})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }

    nodes.forEach((n) => {
      const glow = (Math.sin(n.pulse) + 1) * 0.5;
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(56,189,248,${0.3 + glow * 0.4})`;
      ctx.fill();
    });

    requestAnimationFrame(draw);
  }

  window.addEventListener("resize", () => { resize(); createNodes(); });
  resize();
  createNodes();
  draw();
})();

// ── Chip Selectors ───────────────────────────
document.getElementById("toneGroup").addEventListener("click", (e) => {
  if (!e.target.classList.contains("chip")) return;
  document.querySelectorAll("#toneGroup .chip").forEach((c) => c.classList.remove("active"));
  e.target.classList.add("active");
  selectedTone = e.target.dataset.val;
});

document.getElementById("lengthGroup").addEventListener("click", (e) => {
  if (!e.target.classList.contains("chip")) return;
  document.querySelectorAll("#lengthGroup .chip").forEach((c) => c.classList.remove("active"));
  e.target.classList.add("active");
  selectedLength = e.target.dataset.val;
});

// ── Generate Blog ────────────────────────────
async function generateBlog() {
  const topic = document.getElementById("topicInput").value.trim();
  const keywords = document.getElementById("keywordsInput").value.trim();

  if (!topic) {
    showToast("⚠ Please enter a blog topic first!");
    document.getElementById("topicInput").focus();
    return;
  }

  setLoadingState(true);

  try {
    const response = await fetch(`${API_BASE}/api/generate-blog`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topic,
        keywords,
        tone: selectedTone,
        length: selectedLength,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Generation failed");
    }

    currentBlog = data.blog;
    displayBlog(data.blog, data.wordCount);
    showToast("✓ Blog generated successfully!");
  } catch (error) {
    console.error("Error:", error);
    showToast("✗ " + (error.message || "Something went wrong. Try again."));
    setLoadingState(false, true);
  }
}

// ── Display Blog ─────────────────────────────
function displayBlog(markdownText, wordCount) {
  const output = document.getElementById("blogOutput");
  const emptyState = document.getElementById("emptyState");
  const loadingState = document.getElementById("loadingState");
  const statsBar = document.getElementById("statsBar");
  const outputActions = document.getElementById("outputActions");

  loadingState.classList.add("hidden");
  emptyState.classList.add("hidden");

  const html = markdownToHTML(markdownText);
  output.innerHTML = html;
  output.classList.remove("hidden");

  const words = wordCount || markdownText.split(" ").length;
  const chars = markdownText.length;
  const readTime = Math.ceil(words / 200);
  document.getElementById("wordCount").textContent = words;
  document.getElementById("readTime").textContent = readTime;
  document.getElementById("charCount").textContent = chars.toLocaleString();
  statsBar.style.display = "flex";
  outputActions.style.display = "flex";

  const btn = document.getElementById("generateBtn");
  btn.disabled = false;
  btn.querySelector(".btn-idle").classList.remove("hidden");
  btn.querySelector(".btn-loading").classList.add("hidden");

  const elements = output.querySelectorAll("h2, h3, p, li");
  elements.forEach((el, i) => {
    el.style.opacity = "0";
    el.style.transform = "translateY(12px)";
    el.style.transition = `opacity 0.4s ${i * 0.04}s, transform 0.4s ${i * 0.04}s`;
    setTimeout(() => {
      el.style.opacity = "1";
      el.style.transform = "translateY(0)";
    }, 50);
  });
}

// ── Markdown → HTML ──────────────────────────
function markdownToHTML(text) {
  let html = text
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^#### (.+)$/gm, "<h3>$1</h3>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    .replace(/^• (.+)$/gm, "<li>$1</li>")
    .replace(/^\d+\. (.+)$/gm, "<li>$1</li>")
    .replace(/\n\n/g, "</p><p>")
    .replace(/\n/g, " ");

  html = html.replace(/(<li>.*?<\/li>)(\s*<li>.*?<\/li>)*/gs, (match) => {
    return "<ul>" + match + "</ul>";
  });

  return "<p>" + html + "</p>";
}

// ── Loading State ────────────────────────────
function setLoadingState(isLoading, showEmpty = false) {
  const btn = document.getElementById("generateBtn");
  const emptyState = document.getElementById("emptyState");
  const loadingState = document.getElementById("loadingState");
  const blogOutput = document.getElementById("blogOutput");

  if (isLoading) {
    btn.disabled = true;
    btn.querySelector(".btn-idle").classList.add("hidden");
    btn.querySelector(".btn-loading").classList.remove("hidden");
    emptyState.classList.add("hidden");
    blogOutput.classList.add("hidden");
    loadingState.classList.remove("hidden");
  } else {
    btn.disabled = false;
    btn.querySelector(".btn-idle").classList.remove("hidden");
    btn.querySelector(".btn-loading").classList.add("hidden");
    loadingState.classList.add("hidden");
    if (showEmpty) emptyState.classList.remove("hidden");
  }
}

// ── Copy & Download ──────────────────────────
function copyBlog() {
  if (!currentBlog) return;
  navigator.clipboard.writeText(currentBlog).then(() => {
    showToast("✓ Blog copied to clipboard!");
  }).catch(() => {
    showToast("✗ Copy failed. Try again.");
  });
}

function downloadBlog() {
  if (!currentBlog) return;
  const topic = document.getElementById("topicInput").value.trim();
  const filename = topic ? topic.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40) : "blog";
  const blob = new Blob([currentBlog], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.md`;
  a.click();
  URL.revokeObjectURL(url);
  showToast("✓ Blog saved as .md file!");
}

// ── Toast ────────────────────────────────────
function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 3000);
}

// ── Enter shortcut ───────────────────────────
document.getElementById("topicInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter" && e.ctrlKey) generateBlog();
});