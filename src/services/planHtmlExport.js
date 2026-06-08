/**
 * planHtmlExport.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Gera e faz download de um arquivo HTML autônomo com o plano personalizado
 * do usuário (treino + dieta + fases + dicas) com a identidade visual do
 * Shape Certo.
 *
 * Uso:
 *   import { downloadPlanHtml } from '../services/planHtmlExport';
 *   downloadPlanHtml(); // lê dados do localStorage e baixa o arquivo
 */

// ── Leitura dos dados ────────────────────────────────────────────────────────

function safeJson(key, fallback = null) {
  try { return JSON.parse(localStorage.getItem(key) ?? "null") ?? fallback; }
  catch { return fallback; }
}

function getTrainingProtocol() {
  // O plano ativo fica em shapeCertoWorkoutExecution (sincronizado com a API)
  return safeJson("shapeCertoWorkoutExecution");
}

function getDietProtocol() {
  return safeJson("shapeCertoDietCurrent");
}

function getLastCheckin() {
  const list = safeJson("shapeCertoCheckins", []);
  if (!Array.isArray(list) || list.length === 0) return {};
  return list[list.length - 1];
}

// ── Helpers de formatação ────────────────────────────────────────────────────

function esc(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatExercisesAsTable(exercises) {
  if (!exercises || (Array.isArray(exercises) && exercises.length === 0)) {
    return '<p style="color:#666;font-size:13px;">Exercícios não definidos.</p>';
  }

  let rows = "";

  // Formato da API: array de objetos { name, suggestedSets, suggestedReps, restSeconds, notes }
  if (Array.isArray(exercises)) {
    rows = exercises.filter(e => e?.name).map(ex => {
      const enabledSets = Array.isArray(ex.sets)
        ? ex.sets.filter(s => s.enabled).length
        : Number(ex.suggestedSets || 3);
      const setsLabel = enabledSets
        ? `${enabledSets}×${ex.suggestedReps || "8-12"}`
        : `${ex.suggestedSets || 3}×${ex.suggestedReps || "8-12"}`;
      const rest = ex.restSeconds ? `${ex.restSeconds}s` : "";
      return `
        <tr>
          <td><div class="ex-name">${esc(ex.name)}</div>${ex.notes ? `<div class="ex-note">${esc(ex.notes)}</div>` : ""}</td>
          <td><span class="ex-sets">${esc(setsLabel)}</span></td>
          <td><span class="ex-rest">${esc(rest)}</span></td>
        </tr>`;
    }).join("");

  // Formato legado/texto: "Nome — 4x10 / 90s"
  } else if (typeof exercises === "string" && exercises.trim()) {
    rows = exercises.split("\n").map(l => l.trim()).filter(Boolean).map(line => {
      const match = line.match(/^(.+?)\s*[–—-]+\s*(.+)$/);
      if (match) {
        const [sr, rest] = match[2].includes("/") ? match[2].split("/") : [match[2], ""];
        return `
          <tr>
            <td><div class="ex-name">${esc(match[1].trim())}</div></td>
            <td><span class="ex-sets">${esc(sr.trim())}</span></td>
            <td><span class="ex-rest">${esc(rest.trim())}</span></td>
          </tr>`;
      }
      return `<tr><td colspan="3" style="color:#aaa;font-size:13px;padding:6px 0;">${esc(line)}</td></tr>`;
    }).join("");
  }

  if (!rows) return '<p style="color:#666;font-size:13px;">Exercícios não definidos.</p>';

  return `
    <table class="ex-table">
      <thead><tr><th>Exercício</th><th>Séries × Reps</th><th>Descanso</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

const DAY_COLORS = ["", "yellow", "blue", "orange", "green", "purple", "blue", "orange"];
const DAY_COLOR_MAP = {
  peito: "yellow", costas: "purple", ombro: "blue", braco: "blue",
  posterior: "orange", quad: "green", perna: "green", gluteo: "orange",
};

function getDayTagColor(focus) {
  const f = (focus || "").toLowerCase();
  for (const [key, color] of Object.entries(DAY_COLOR_MAP)) {
    if (f.includes(key)) return color;
  }
  return "yellow";
}

const DAY_LABELS = { monday:"SEG", tuesday:"TER", wednesday:"QUA", thursday:"QUI", friday:"SEX", saturday:"SAB", sunday:"DOM" };
const WEEK_ORDER  = ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"];

function buildWeekGridHtml(workouts) {
  if (!Array.isArray(workouts)) return "";
  const byId = Object.fromEntries(workouts.map(d => [d.id, d]));
  return WEEK_ORDER.map(dayId => {
    const day   = byId[dayId];
    const short = DAY_LABELS[dayId] || dayId.slice(0,3).toUpperCase();
    if (!day || !day.enabled) {
      return `<div class="wday rest"><div class="wday-name">${short}</div><div class="wday-label">Descanso</div></div>`;
    }
    const color = getDayTagColor(day.focus);
    const label = (day.focus || day.title || "Treino").slice(0, 18);
    return `<div class="wday ${color}"><div class="wday-name">${short}</div><div class="wday-label">${esc(label)}</div></div>`;
  }).join("\n");
}

function buildDayCardsHtml(workouts) {
  if (!Array.isArray(workouts)) return "";
  const active = workouts.filter(d => d.enabled);
  if (active.length === 0) return "";
  return active.map((day, i) => {
    const color = getDayTagColor(day.focus);
    const tagLabel = day.focus || "Treino";
    const idx = i + 1;
    return `
      <div class="day-card${i === 0 ? " open" : ""}" onclick="toggleDay(this)">
        <div class="day-header">
          <span class="day-badge">D${idx}</span>
          <div>
            <div class="day-name">${esc(day.title || `Treino ${idx}`)}</div>
            <div class="day-focus">${esc(day.focus || "")}</div>
          </div>
          <span class="day-tag ${color}">${esc(tagLabel)}</span>
          <span class="chevron">▼</span>
        </div>
        <div class="day-body">
          ${formatExercisesAsTable(day.exercises)}
        </div>
      </div>`;
  }).join("\n");
}

function buildMealCardsHtml(meals) {
  if (!Array.isArray(meals)) return "<p style='color:#666'>Dieta não definida.</p>";
  const enabled = meals.filter(m => m.enabled && m.foods);
  if (enabled.length === 0) return "<p style='color:#666'>Nenhuma refeição configurada.</p>";

  return enabled.map(meal => {
    const isPre  = meal.id === "pre-treino";
    const isPos  = meal.id === "pos-treino";
    const isCeia = meal.id === "ceia";
    const cls    = isPre ? "pre" : isPos ? "pos" : isCeia ? "ceia" : "";
    const foods  = (meal.foods || "").split("\n").map(f => f.trim()).filter(Boolean);
    const items  = foods.map(f => `<li>${esc(f)}</li>`).join("");
    const macros = [
      meal.calories && `<strong>${esc(meal.calories)} kcal</strong>`,
      meal.protein  && `P ${esc(meal.protein)}g`,
      meal.carbs    && `C ${esc(meal.carbs)}g`,
      meal.fats     && `G ${esc(meal.fats)}g`,
    ].filter(Boolean).join(" · ");

    return `
      <div class="meal-card ${cls}">
        <div class="meal-time">${esc(meal.name || "").toUpperCase()}</div>
        <div class="meal-name">${esc(meal.description || meal.name || "")}</div>
        ${items ? `<ul class="meal-items">${items}</ul>` : ""}
        ${macros ? `<div class="meal-kcal"><span>Est.</span><strong>${macros}</strong></div>` : ""}
      </div>`;
  }).join("\n");
}

function buildMacroBarHtml(meals) {
  if (!Array.isArray(meals)) return "";
  const enabled = meals.filter(m => m.enabled);
  const total = enabled.reduce((acc, m) => {
    acc.kcal    += parseFloat(m.calories || 0);
    acc.protein += parseFloat(m.protein  || 0);
    acc.carbs   += parseFloat(m.carbs    || 0);
    acc.fat     += parseFloat(m.fats     || 0);
    return acc;
  }, { kcal: 0, protein: 0, carbs: 0, fat: 0 });

  if (total.kcal === 0) return "";

  const maxMacro = Math.max(total.protein * 4, total.carbs * 4, total.fat * 9);
  const pPct = maxMacro > 0 ? Math.round((total.protein * 4 / maxMacro) * 100) : 0;
  const cPct = maxMacro > 0 ? Math.round((total.carbs   * 4 / maxMacro) * 100) : 0;
  const fPct = maxMacro > 0 ? Math.round((total.fat     * 9 / maxMacro) * 100) : 0;

  return `
    <div class="section-header" style="margin-top:32px;">
      <span class="section-num">MACROS</span>
      <span class="section-title">DISTRIBUIÇÃO DIÁRIA</span>
    </div>
    <div class="macro-bar-wrap">
      <div class="macro-row">
        <span class="macro-label" style="color:var(--blue);">Proteína</span>
        <div class="macro-bar"><div class="macro-fill" style="width:${pPct}%;background:var(--blue);"></div></div>
        <span class="macro-val">${Math.round(total.protein)}g</span>
      </div>
      <div class="macro-row">
        <span class="macro-label" style="color:var(--accent);">Carboidrato</span>
        <div class="macro-bar"><div class="macro-fill" style="width:${cPct}%;background:var(--accent);"></div></div>
        <span class="macro-val">${Math.round(total.carbs)}g</span>
      </div>
      <div class="macro-row">
        <span class="macro-label" style="color:var(--accent2);">Gordura</span>
        <div class="macro-bar"><div class="macro-fill" style="width:${fPct}%;background:var(--accent2);"></div></div>
        <span class="macro-val">${Math.round(total.fat)}g</span>
      </div>
      <div class="macro-row">
        <span class="macro-label" style="color:var(--green);">TOTAL</span>
        <div class="macro-bar"><div class="macro-fill" style="width:100%;background:linear-gradient(90deg,var(--green),var(--accent));"></div></div>
        <span class="macro-val" style="color:var(--green);">${Math.round(total.kcal)} kcal</span>
      </div>
    </div>`;
}

// ── Template HTML principal ──────────────────────────────────────────────────

function buildHtml({ protocol, diet, checkin }) {
  const user    = checkin || {};
  const goal    = user.goal    || "hipertrofia";
  const weight  = user.weight  || "—";
  const height  = user.height  || "—";
  const bf      = user.bodyFat || "—";
  const name    = user.fullName || user.name || "";
  const goalMap = {
    hipertrofia: "BULK INTELIGENTE", powerlifting: "FORÇA MÁXIMA",
    emagrecimento: "CUTTING", recomposicao: "RECOMPOSIÇÃO",
    cutting: "DEFINIÇÃO", condicionamento: "CONDICIONAMENTO", saude: "SAÚDE & BEM-ESTAR"
  };
  const goalTitle = goalMap[goal] || goal.toUpperCase();

  const workouts     = protocol?.workouts || [];
  const meals        = diet?.meals || [];
  const trainingDays = workouts.filter(d => d.enabled).length;

  const weekGrid   = buildWeekGridHtml(workouts);
  const dayCards   = buildDayCardsHtml(workouts);
  const mealCards  = buildMealCardsHtml(meals);
  const macroBars  = buildMacroBarHtml(meals);
  const dateStr    = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Plano Shape Certo${name ? " — " + name : ""}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,600;1,9..40,300&display=swap');
  :root {
    --bg:#0a0a0a;--surface:#111;--surface2:#1a1a1a;--border:#222;
    --accent:#ff2e2e;--accent2:#ff7043;--text:#f0f0f0;--muted:#666;
    --green:#00e676;--blue:#4fc3f7;--purple:#d4a4ff;
  }
  *{margin:0;padding:0;box-sizing:border-box;}
  body{background:var(--bg);color:var(--text);font-family:'DM Sans',sans-serif;font-size:15px;line-height:1.6;}
  body::before{content:'';position:fixed;inset:0;background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E");pointer-events:none;z-index:0;opacity:0.5;}
  .container{max-width:960px;margin:0 auto;padding:40px 24px 80px;position:relative;z-index:1;}

  .hero{border-bottom:1px solid var(--border);padding-bottom:32px;margin-bottom:48px;}
  .hero-label{font-size:11px;font-weight:600;letter-spacing:0.2em;text-transform:uppercase;color:var(--accent);margin-bottom:12px;}
  .hero h1{font-family:'Bebas Neue',sans-serif;font-size:clamp(52px,10vw,96px);line-height:0.95;letter-spacing:0.02em;}
  .hero h1 span{color:var(--accent);}
  .hero-stats{display:flex;gap:32px;margin-top:24px;flex-wrap:wrap;}
  .stat{display:flex;flex-direction:column;}
  .stat-val{font-family:'Bebas Neue',sans-serif;font-size:28px;line-height:1;}
  .stat-label{font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:0.12em;margin-top:2px;}
  .stat-val.accent{color:var(--accent);} .stat-val.orange{color:var(--accent2);}

  .section{margin-bottom:56px;}
  .section-header{display:flex;align-items:baseline;gap:16px;margin-bottom:24px;border-bottom:1px solid var(--border);padding-bottom:12px;}
  .section-title{font-family:'Bebas Neue',sans-serif;font-size:36px;letter-spacing:0.05em;}
  .section-num{font-family:'Bebas Neue',sans-serif;font-size:14px;color:var(--accent);letter-spacing:0.1em;}

  .tabs{display:flex;gap:4px;margin-bottom:24px;flex-wrap:wrap;}
  .tab{padding:8px 16px;background:var(--surface);border:1px solid var(--border);border-radius:4px;font-size:12px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:var(--muted);cursor:pointer;transition:all 0.15s;}
  .tab:hover{border-color:var(--accent);color:var(--accent);}
  .tab.active{background:var(--accent);color:#fff;border-color:var(--accent);}
  .tab-content{display:none;} .tab-content.active{display:block;}

  .day-card{background:var(--surface);border:1px solid var(--border);border-radius:8px;overflow:hidden;margin-bottom:16px;transition:border-color 0.2s;}
  .day-card:hover{border-color:#333;}
  .day-header{display:flex;align-items:center;gap:16px;padding:16px 20px;background:var(--surface2);cursor:pointer;}
  .day-badge{font-family:'Bebas Neue',sans-serif;font-size:22px;letter-spacing:0.05em;min-width:36px;color:var(--accent);}
  .day-name{font-weight:600;font-size:15px;flex:1;}
  .day-focus{font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:0.1em;}
  .day-tag{font-size:10px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;padding:3px 8px;border-radius:3px;background:rgba(255,46,46,0.1);color:var(--accent);border:1px solid rgba(255,46,46,0.2);}
  .day-tag.orange{background:rgba(255,112,67,0.1);color:var(--accent2);border-color:rgba(255,112,67,0.2);}
  .day-tag.blue{background:rgba(79,195,247,0.1);color:var(--blue);border-color:rgba(79,195,247,0.2);}
  .day-tag.green{background:rgba(0,230,118,0.1);color:var(--green);border-color:rgba(0,230,118,0.2);}
  .day-tag.purple{background:rgba(212,164,255,0.1);color:var(--purple);border-color:rgba(212,164,255,0.2);}
  .day-body{padding:20px;}

  .ex-table{width:100%;border-collapse:collapse;}
  .ex-table th{font-size:10px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:var(--muted);text-align:left;padding:0 12px 10px 0;border-bottom:1px solid var(--border);}
  .ex-table td{padding:10px 12px 10px 0;border-bottom:1px solid rgba(255,255,255,0.04);vertical-align:top;font-size:14px;}
  .ex-table tr:last-child td{border-bottom:none;}
  .ex-name{font-weight:600;color:var(--text);}
  .ex-note{font-size:11px;color:var(--muted);margin-top:2px;line-height:1.4;}
  .ex-sets{font-family:'Bebas Neue',sans-serif;font-size:18px;color:var(--accent);letter-spacing:0.05em;white-space:nowrap;}
  .ex-rest{font-size:12px;color:var(--muted);white-space:nowrap;}

  .week-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:4px;margin-bottom:24px;}
  .wday{background:var(--surface);border:1px solid var(--border);border-radius:6px;padding:10px 6px;text-align:center;}
  .wday-name{color:var(--muted);text-transform:uppercase;letter-spacing:0.1em;font-size:9px;margin-bottom:4px;}
  .wday-label{font-weight:700;font-size:12px;line-height:1.3;}
  .wday.rest{opacity:0.4;}
  .wday.yellow .wday-label{color:var(--accent);}
  .wday.blue .wday-label{color:var(--blue);}
  .wday.orange .wday-label{color:var(--accent2);}
  .wday.green .wday-label{color:var(--green);}
  .wday.purple .wday-label{color:var(--purple);}

  .meal-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px;margin-bottom:24px;}
  .meal-card{background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:16px;position:relative;overflow:hidden;}
  .meal-card::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,var(--accent),transparent);}
  .meal-card.pre::before{background:linear-gradient(90deg,var(--accent2),transparent);}
  .meal-card.pos::before{background:linear-gradient(90deg,var(--blue),transparent);}
  .meal-card.ceia::before{background:linear-gradient(90deg,var(--purple),transparent);}
  .meal-time{font-family:'Bebas Neue',sans-serif;font-size:13px;letter-spacing:0.12em;color:var(--accent);margin-bottom:4px;}
  .meal-card.pre .meal-time{color:var(--accent2);}
  .meal-card.pos .meal-time{color:var(--blue);}
  .meal-card.ceia .meal-time{color:var(--purple);}
  .meal-name{font-weight:600;font-size:15px;margin-bottom:12px;}
  .meal-items{list-style:none;font-size:13px;color:#bbb;line-height:1.8;}
  .meal-items li::before{content:'— ';color:var(--muted);}
  .meal-kcal{margin-top:12px;font-size:12px;color:var(--muted);border-top:1px solid var(--border);padding-top:10px;display:flex;justify-content:space-between;flex-wrap:wrap;gap:4px;}
  .meal-kcal strong{color:var(--accent2);}

  .macro-bar-wrap{margin-bottom:32px;}
  .macro-row{display:flex;align-items:center;gap:16px;margin-bottom:12px;}
  .macro-label{font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.1em;width:100px;flex-shrink:0;}
  .macro-bar{flex:1;height:8px;background:var(--surface2);border-radius:4px;overflow:hidden;}
  .macro-fill{height:100%;border-radius:4px;}
  .macro-val{font-family:'Bebas Neue',sans-serif;font-size:20px;color:var(--text);width:80px;text-align:right;flex-shrink:0;}

  .phase-timeline{position:relative;padding-left:32px;}
  .phase-timeline::before{content:'';position:absolute;left:7px;top:8px;bottom:8px;width:2px;background:var(--border);}
  .phase-item{position:relative;margin-bottom:24px;}
  .phase-item::before{content:'';position:absolute;left:-29px;top:7px;width:10px;height:10px;border-radius:50%;background:var(--surface2);border:2px solid var(--accent);}
  .phase-item.active::before{background:var(--accent);box-shadow:0 0 12px rgba(255,46,46,0.4);}
  .phase-header{display:flex;align-items:baseline;gap:12px;margin-bottom:8px;}
  .phase-name{font-family:'Bebas Neue',sans-serif;font-size:22px;letter-spacing:0.05em;}
  .phase-period{font-size:12px;color:var(--muted);}
  .phase-body{font-size:14px;color:#aaa;line-height:1.7;}
  .phase-body ul{margin-top:8px;padding-left:18px;}
  .phase-body li{margin-bottom:4px;}

  .tip-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px;}
  .tip-card{background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:16px;}
  .tip-icon{font-size:24px;margin-bottom:8px;display:block;}
  .tip-title{font-weight:700;font-size:13px;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px;}
  .tip-text{font-size:13px;color:#999;line-height:1.6;}

  .info-box{background:rgba(79,195,247,0.05);border:1px solid rgba(79,195,247,0.15);border-radius:6px;padding:14px 16px;margin-bottom:20px;font-size:13px;color:#bbb;}
  .info-box strong{color:var(--blue);}
  .warn-box{background:rgba(255,112,67,0.06);border:1px solid rgba(255,112,67,0.2);border-radius:6px;padding:14px 16px;margin-bottom:20px;font-size:13px;color:#ccc;}
  .warn-box strong{color:var(--accent2);}

  .chevron{margin-left:auto;color:var(--muted);font-size:12px;transition:transform 0.2s;}
  .day-card.open .chevron{transform:rotate(180deg);}
  .day-card.open .day-body{display:block;}
  .day-card:not(.open) .day-body{display:none;}

  .disclaimer{background:rgba(255,46,46,0.06);border:1px solid rgba(255,46,46,0.15);border-radius:6px;padding:14px 16px;font-size:12px;color:#999;margin-top:48px;}
  .disclaimer strong{color:var(--accent);}

  @media(max-width:600px){
    .week-grid{grid-template-columns:repeat(4,1fr);}
    .meal-grid{grid-template-columns:1fr;}
  }
</style>
</head>
<body>
<div class="container">

  <div class="hero">
    <div class="hero-label">Shape Certo · Plano Personalizado · ${esc(dateStr)}</div>
    <h1>${goalTitle.split(" ").map((w, i) => i === 0 ? w : `<span>${w}</span>`).join("<br>")}</h1>
    <div class="hero-stats">
      ${weight !== "—" ? `<div class="stat"><span class="stat-val">${esc(weight)}<span style="font-size:16px;color:var(--muted)">kg</span></span><span class="stat-label">Peso atual</span></div>` : ""}
      ${height !== "—" ? `<div class="stat"><span class="stat-val">${esc(height)}<span style="font-size:16px;color:var(--muted)">cm</span></span><span class="stat-label">Altura</span></div>` : ""}
      ${bf !== "—"     ? `<div class="stat"><span class="stat-val orange">~${esc(bf)}<span style="font-size:16px;color:var(--muted)">%</span></span><span class="stat-label">Gordura est.</span></div>` : ""}
      ${trainingDays   ? `<div class="stat"><span class="stat-val accent">${trainingDays}<span style="font-size:16px;color:var(--muted)">x</span></span><span class="stat-label">Dias de treino</span></div>` : ""}
    </div>
  </div>

  <div class="tabs">
    <button class="tab active" onclick="switchTab('treino',this)">💪 Treinos</button>
    <button class="tab" onclick="switchTab('dieta',this)">🥗 Dieta</button>
    <button class="tab" onclick="switchTab('fases',this)">📈 Fases & Metas</button>
    <button class="tab" onclick="switchTab('dicas',this)">⚡ Dicas</button>
  </div>

  <!-- TREINO -->
  <div id="tab-treino" class="tab-content active">
    <div class="section">
      <div class="section-header">
        <span class="section-num">01</span>
        <span class="section-title">DIVISÃO SEMANAL</span>
      </div>
      ${protocol?.title ? `<div class="info-box"><strong>${esc(protocol.title)}</strong>${protocol.objective ? ` — ${esc(protocol.objective)}` : ""}</div>` : ""}
      <div class="week-grid">${weekGrid}</div>
      ${dayCards || '<p style="color:#666;font-size:13px;">Protocolo de treino ainda não gerado.</p>'}
      ${protocol?.notes ? `<div class="info-box" style="margin-top:16px;"><strong>Observações do protocolo:</strong><br>${esc(protocol.notes)}</div>` : ""}
    </div>
  </div>

  <!-- DIETA -->
  <div id="tab-dieta" class="tab-content">
    <div class="section">
      <div class="section-header">
        <span class="section-num">02</span>
        <span class="section-title">PLANO ALIMENTAR</span>
      </div>
      ${diet?.notes ? `<div class="warn-box">${esc(diet.notes)}</div>` : ""}
      ${macroBars}
      <div class="section-header" style="margin-top:32px;">
        <span class="section-num">03</span>
        <span class="section-title">REFEIÇÕES</span>
      </div>
      <div class="meal-grid">${mealCards}</div>
    </div>
  </div>

  <!-- FASES -->
  <div id="tab-fases" class="tab-content">
    <div class="section">
      <div class="section-header">
        <span class="section-num">04</span>
        <span class="section-title">PLANO DE FASES</span>
      </div>
      <p style="font-size:13px;color:var(--muted);margin-bottom:32px;">Progresso gradual com gatilhos claros para avançar de fase.</p>
      <div class="phase-timeline">
        <div class="phase-item active">
          <div class="phase-header">
            <span class="phase-name" style="color:var(--accent);">FASE 1 — ADAPTAÇÃO</span>
            <span class="phase-period">Semanas 1–4 · AGORA</span>
          </div>
          <div class="phase-body">Construção de base e adaptação neuromuscular.
            <ul>
              <li>Foco em técnica de execução — carga secundária</li>
              <li>Progressão de carga a cada 2 semanas</li>
              <li>Cardio leve 2-3x/semana, 15-20 min pós-treino</li>
              <li><strong>Gatilho:</strong> 4 semanas consistentes → Fase 2</li>
            </ul>
          </div>
        </div>
        <div class="phase-item">
          <div class="phase-header">
            <span class="phase-name" style="color:var(--blue);">FASE 2 — DESENVOLVIMENTO</span>
            <span class="phase-period">Semanas 5–12</span>
          </div>
          <div class="phase-body">Volume e intensidade crescentes.
            <ul>
              <li>Aumentar carga e volume progressivamente</li>
              <li>Introduzir técnicas: drop-set, supersérie</li>
              <li>Cardio 3-4x/semana, 20-30 min</li>
              <li><strong>Gatilho:</strong> plateau de força → ajuste de protocolo</li>
            </ul>
          </div>
        </div>
        <div class="phase-item">
          <div class="phase-header">
            <span class="phase-name" style="color:var(--green);">FASE 3 — CONSOLIDAÇÃO</span>
            <span class="phase-period">A partir da semana 13</span>
          </div>
          <div class="phase-body">Otimização e resultados visíveis.
            <ul>
              <li>Reavaliação de composição corporal</li>
              <li>Ajuste de dieta baseado em resultados reais</li>
              <li><strong>Marco:</strong> reavaliação completa com fotos e medidas</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- DICAS -->
  <div id="tab-dicas" class="tab-content">
    <div class="section">
      <div class="section-header">
        <span class="section-num">05</span>
        <span class="section-title">DICAS ESSENCIAIS</span>
      </div>
      <div class="tip-grid">
        <div class="tip-card"><span class="tip-icon">📊</span><div class="tip-title">Meça certo, meça sempre</div><div class="tip-text">Balança toda semana, mesmo horário, em jejum. Fotos mensais. Braço, peito e cintura com fita métrica. O número na balança sozinho conta metade da história.</div></div>
        <div class="tip-card"><span class="tip-icon">📈</span><div class="tip-title">Progressão é lei</div><div class="tip-text">Bateu o teto de reps? Sobe a carga. Sem sobrecarga progressiva não existe hipertrofia. Anote os pesos de cada treino — isso muda completamente os resultados.</div></div>
        <div class="tip-card"><span class="tip-icon">😴</span><div class="tip-title">Sono é o melhor suplemento</div><div class="tip-text">Mínimo 7h de sono. Sem sono, GH cai e o ganho vai junto. Sono é onde o músculo é construído — não durante o treino.</div></div>
        <div class="tip-card"><span class="tip-icon">💧</span><div class="tip-title">Hidratação constante</div><div class="tip-text">Mínimo 35ml/kg/dia. Desidratação de 2% reduz performance em até 20%. Beba água antes de sentir sede.</div></div>
        <div class="tip-card"><span class="tip-icon">🥩</span><div class="tip-title">Proteína em toda refeição</div><div class="tip-text">Distribuir 2–2.5g de proteína/kg ao longo do dia. Frango, ovo, peixe, whey, carne — fontes variadas mantêm o equilíbrio de aminoácidos.</div></div>
        <div class="tip-card"><span class="tip-icon">⚡</span><div class="tip-title">Creatina todo dia</div><div class="tip-text">3–5g/dia independente de treinar. Efeito acumulativo — consistência importa mais que o horário. Nos dias de descanso, qualquer horário serve.</div></div>
        <div class="tip-card"><span class="tip-icon">🔧</span><div class="tip-title">Técnica antes de carga</div><div class="tip-text">Nas primeiras semanas, foque em técnica perfeita com cargas menores. Lesão é o maior inimigo da evolução — especialmente na retomada após pausa.</div></div>
        <div class="tip-card"><span class="tip-icon">🍽️</span><div class="tip-title">Consistência na dieta</div><div class="tip-text">80% de adesão é suficiente. Dieta perfeita por 2 semanas vale menos que dieta boa por 6 meses. Não desista por um deslize.</div></div>
      </div>
    </div>
  </div>

  <div class="disclaimer">
    <strong>⚠️ Disclaimer:</strong> Este plano foi gerado pelo assistente de IA do Shape Certo com base nas suas informações.
    Consulte um profissional de educação física e nutricionista para validação e acompanhamento presencial.
    Gerado em ${esc(dateStr)}.
  </div>

</div>
<script>
  function switchTab(id, btn) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab').forEach(el => el.classList.remove('active'));
    document.getElementById('tab-' + id).classList.add('active');
    btn.classList.add('active');
  }
  function toggleDay(card) {
    card.classList.toggle('open');
  }
</script>
</body>
</html>`;
}

// ── Exportação pública ────────────────────────────────────────────────────────

export function generatePlanHtml() {
  const protocol = getTrainingProtocol();
  const diet     = getDietProtocol();
  const checkin  = getLastCheckin();
  return buildHtml({ protocol, diet, checkin });
}

export function downloadPlanHtml(filename) {
  const html = generatePlanHtml();
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");

  const checkin = getLastCheckin();
  const goal    = checkin?.goal || "plano";
  const date    = new Date().toISOString().slice(0, 10);
  a.href     = url;
  a.download = filename || `shape-certo-${goal}-${date}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
