/**
 * Shape Certo — Business Plan Excel Builder
 * Generates: src/data/shape_certo_business_plan.xlsx
 */
import ExcelJS from "exceljs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "../src/data/shape_certo_business_plan.xlsx");

const wb = new ExcelJS.Workbook();
wb.creator = "Shape Certo";
wb.lastModifiedBy = "Claude Code";
wb.created = new Date();
wb.modified = new Date();

// ── Colour helpers ──────────────────────────────────────────────────────────
const C = {
  navyFill:   { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F3864" } },
  blueFill:   { type: "pattern", pattern: "solid", fgColor: { argb: "FF2E75B6" } },
  accentFill: { type: "pattern", pattern: "solid", fgColor: { argb: "FFD6E4F0" } },
  yellowFill: { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFF00" } },
  grayFill:   { type: "pattern", pattern: "solid", fgColor: { argb: "FFF2F2F2" } },
  greenFill:  { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2EFDA" } },
  orangeFill: { type: "pattern", pattern: "solid", fgColor: { argb: "FFFCE4D6" } },
  darkFill:   { type: "pattern", pattern: "solid", fgColor: { argb: "FF1A1A2E" } },
  whiteFill:  { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFFFFF" } },
};

const F = {
  white:    { name: "Arial", color: { argb: "FFFFFFFF" }, bold: true },
  black:    { name: "Arial", color: { argb: "FF000000" } },
  boldBlk:  { name: "Arial", color: { argb: "FF000000" }, bold: true },
  blue:     { name: "Arial", color: { argb: "FF0000FF" } },
  boldBlue: { name: "Arial", color: { argb: "FF0000FF" }, bold: true },
  green:    { name: "Arial", color: { argb: "FF008000" } },
  gray:     { name: "Arial", color: { argb: "FF595959" }, italic: true, size: 9 },
  gray10:   { name: "Arial", color: { argb: "FF595959" }, size: 10 },
};

const THIN = {
  top:    { style: "thin",   color: { argb: "FFBFBFBF" } },
  bottom: { style: "thin",   color: { argb: "FFBFBFBF" } },
  left:   { style: "thin",   color: { argb: "FFBFBFBF" } },
  right:  { style: "thin",   color: { argb: "FFBFBFBF" } },
};

// Number formats
const NF = {
  brl:    '"R$ "#,##0.00;("R$ "#,##0.00);"-"',
  brl4:   '"R$ "#,##0.0000;("R$ "#,##0.0000);"-"',
  usd:    '"$"#,##0.00;"($"#,##0.00);"-"',
  usd4:   '"$"#,##0.0000;("$"#,##0.0000);"-"',
  pct1:   "0.0%;(0.0%);-",
  pct2:   "0.00%;(0.00%);-",
  int0:   "#,##0;(#,##0);-",
  intK:   '#,##0;(#,##0);"-"',
};

// ── Cell styling helpers ────────────────────────────────────────────────────
function style(cell, opts = {}) {
  if (opts.font)   cell.font      = opts.font;
  if (opts.fill)   cell.fill      = opts.fill;
  if (opts.numFmt) cell.numFmt    = opts.numFmt;
  if (opts.border !== false) cell.border = THIN;
  if (opts.align)  cell.alignment = opts.align;
  else             cell.alignment = { vertical: "middle" };
  return cell;
}

function hdr(ws, r, c, val) {
  const cell = ws.getCell(r, c);
  cell.value = val;
  style(cell, { font: F.white, fill: C.navyFill, align: { horizontal: "center", vertical: "middle", wrapText: true } });
  return cell;
}

function subhdr(ws, r, c, val) {
  const cell = ws.getCell(r, c);
  cell.value = val;
  style(cell, { font: F.white, fill: C.blueFill, align: { horizontal: "center", vertical: "middle" } });
  return cell;
}

function inp(ws, r, c, val, numFmt) {
  const cell = ws.getCell(r, c);
  cell.value = val;
  style(cell, { font: F.blue, numFmt });
  return cell;
}

function calc(ws, r, c, formula, numFmt) {
  const cell = ws.getCell(r, c);
  cell.value = { formula: formula.replace(/^=/, "") };
  style(cell, { font: F.black, numFmt });
  return cell;
}

function lbl(ws, r, c, val, opts = {}) {
  const cell = ws.getCell(r, c);
  cell.value = val;
  style(cell, {
    font: opts.bold ? F.boldBlk : F.black,
    fill: opts.fill,
    numFmt: opts.numFmt,
    align: { horizontal: opts.align || "left", vertical: "middle", wrapText: true },
  });
  return cell;
}

function note(ws, r, c, val) {
  const cell = ws.getCell(r, c);
  cell.value = val;
  cell.font  = F.gray;
  cell.alignment = { wrapText: true, vertical: "middle" };
  cell.border = THIN;
  return cell;
}

function sectionTitle(ws, r, c1, c2, val) {
  ws.mergeCells(r, c1, r, c2);
  const cell = ws.getCell(r, c1);
  cell.value = val;
  style(cell, { font: F.white, fill: C.blueFill, align: { horizontal: "left", vertical: "middle" } });
  return cell;
}

function mainTitle(ws, r, c1, c2, val, size = 13) {
  ws.mergeCells(r, c1, r, c2);
  const cell = ws.getCell(r, c1);
  cell.value = val;
  cell.font  = { name: "Arial", color: { argb: "FFFFFFFF" }, bold: true, size };
  cell.fill  = C.navyFill;
  cell.alignment = { horizontal: "center", vertical: "middle" };
  ws.getRow(r).height = 36;
  return cell;
}

function subtitleMerge(ws, r, c1, c2, val) {
  ws.mergeCells(r, c1, r, c2);
  const cell = ws.getCell(r, c1);
  cell.value = val;
  cell.font  = F.gray;
  cell.alignment = { horizontal: "center", vertical: "middle" };
  return cell;
}

// ═══════════════════════════════════════════════════════════════════════════
// SHEET 1 — ASSUMPTIONS
// ═══════════════════════════════════════════════════════════════════════════
const wsA = wb.addWorksheet("Assumptions");
wsA.views = [{ showGridLines: false }];
wsA.getColumn(1).width = 42;
wsA.getColumn(2).width = 20;
wsA.getColumn(3).width = 32;
wsA.getColumn(4).width = 14;
wsA.getColumn(5).width = 42;
wsA.getColumn(6).width = 20;

mainTitle(wsA, 1, 1, 6, "SHAPE CERTO — ASSUMPTIONS (Plano de Negócios SaaS)", 14);
subtitleMerge(wsA, 2, 1, 6,
  "Última atualização: Mai 2026  |  Câmbio: USD 1 = BRL na célula B5  |  AZUL = inputs editáveis  |  PRETO = fórmulas");

// ── A. Macro
sectionTitle(wsA, 3, 1, 3, "A. MACRO & CÂMBIO");
hdr(wsA, 4, 1, "Parâmetro"); hdr(wsA, 4, 2, "Valor"); hdr(wsA, 4, 3, "Fonte / Nota");

inp(wsA, 5, 1, "Câmbio USD → BRL (atual)"); // label in col 1 also as inp for simplicity
wsA.getCell(5, 1).value = "Câmbio USD → BRL (atual)"; wsA.getCell(5,1).font = F.black; wsA.getCell(5,1).border = THIN;
inp(wsA, 5, 2, 5.70, NF.usd);
note(wsA, 5, 3, "Referência Mai 2026 — atualizar mensalmente");

wsA.getCell(6, 1).value = "Câmbio mês anterior (USD → BRL)"; wsA.getCell(6,1).font = F.black; wsA.getCell(6,1).border = THIN; wsA.getCell(6,1).fill = C.grayFill;
inp(wsA, 6, 2, 5.70, NF.usd); wsA.getCell(6,2).fill = C.grayFill;
note(wsA, 6, 3, "Copiar câmbio atual antes de atualizar B5"); wsA.getCell(6,3).fill = C.grayFill;

wsA.getCell(7, 1).value = "Variação câmbio (%)"; wsA.getCell(7,1).font = F.black; wsA.getCell(7,1).border = THIN;
calc(wsA, 7, 2, "IF(B6>0,(B5-B6)/B6,0)", NF.pct2);
note(wsA, 7, 3, "Calculado automaticamente");

// ── B. OpenAI
sectionTitle(wsA, 9, 1, 3, "B. OPENAI API — PREÇOS (USD por 1 M tokens)");
hdr(wsA, 10, 1, "Modelo"); hdr(wsA, 10, 2, "Preço USD/1M tk"); hdr(wsA, 10, 3, "Nota");
const oaiRows = [
  [11, "GPT-4o-mini — Input",  0.150],
  [12, "GPT-4o-mini — Output", 0.600],
];
oaiRows.forEach(([r, label, val], i) => {
  wsA.getCell(r, 1).value = label; wsA.getCell(r,1).font = F.black; wsA.getCell(r,1).border = THIN;
  if (i%2===0) wsA.getCell(r,1).fill = C.grayFill;
  inp(wsA, r, 2, val, NF.usd4);
  if (i%2===0) wsA.getCell(r,2).fill = C.grayFill;
  note(wsA, r, 3, "Preço atual Mai 2026 — openai.com/pricing");
  if (i%2===0) wsA.getCell(r,3).fill = C.grayFill;
});

// ── C. Stripe
sectionTitle(wsA, 14, 1, 3, "C. STRIPE — TAXAS");
hdr(wsA, 15, 1, "Parâmetro"); hdr(wsA, 15, 2, "Valor"); hdr(wsA, 15, 3, "Nota");
const stripeRows = [
  [16, "Taxa percentual Brasil (%)",   0.0399, NF.pct2,  "3.99% — cartão nacional BR"],
  [17, "Taxa fixa Brasil (R$)",         0.39,  NF.brl,   "R$0.39 por transação"],
  [18, "Taxa percentual Intl (%)",     0.029,  NF.pct2,  "2.9% — cartão internacional"],
  [19, "Taxa fixa Internacional ($)",  0.30,   NF.usd,   "$0.30 por transação"],
];
stripeRows.forEach(([r, label, val, fmt, src], i) => {
  wsA.getCell(r,1).value = label; wsA.getCell(r,1).font = F.black; wsA.getCell(r,1).border = THIN;
  if (i%2===0) wsA.getCell(r,1).fill = C.grayFill;
  inp(wsA, r, 2, val, fmt);
  if (i%2===0) wsA.getCell(r,2).fill = C.grayFill;
  note(wsA, r, 3, src);
  if (i%2===0) wsA.getCell(r,3).fill = C.grayFill;
});

// ── D. Infra
sectionTitle(wsA, 21, 1, 3, "D. INFRAESTRUTURA — CUSTOS FIXOS MENSAIS (USD)");
hdr(wsA, 22, 1, "Componente"); hdr(wsA, 22, 2, "USD/mês"); hdr(wsA, 22, 3, "Nota");
const infraRows = [
  [23, "Servidor VPS/Cloud",       30.0,  "Mid-range VPS — escala até ~500 usuários"],
  [24, "Banco de dados Postgres",  20.0,  "Managed Postgres"],
  [25, "Storage S3 base (USD)",     5.0,  "~200 GB base de fotos"],
  [26, "S3 custo por GB extra ($)", 0.023,"USD/GB além da base"],
  [27, "CDN / Bandwidth",           5.0,  "Estimativa transferência"],
  [28, "Monitoring / Logs",         5.0,  "Datadog ou similar — básico"],
];
infraRows.forEach(([r, label, val, src], i) => {
  wsA.getCell(r,1).value = label; wsA.getCell(r,1).font = F.black; wsA.getCell(r,1).border = THIN;
  if (i%2===0) wsA.getCell(r,1).fill = C.grayFill;
  inp(wsA, r, 2, val, NF.usd);
  if (i%2===0) wsA.getCell(r,2).fill = C.grayFill;
  note(wsA, r, 3, src);
  if (i%2===0) wsA.getCell(r,3).fill = C.grayFill;
});
// Total infra
lbl(wsA, 29, 1, "TOTAL INFRA FIXO BASE/MÊS (USD)", { bold: true, fill: C.accentFill });
calc(wsA, 29, 2, "SUM(B23:B28)", NF.usd); wsA.getCell(29,2).font = F.boldBlk; wsA.getCell(29,2).fill = C.accentFill;
lbl(wsA, 29, 3, "Base — escala com mais servidores", { fill: C.accentFill });

// D2 Storage per user
sectionTitle(wsA, 30, 1, 3, "D2. STORAGE POR USUÁRIO (fotos — GB/mês estimado)");
hdr(wsA, 31, 1, "Plano"); hdr(wsA, 31, 2, "GB/usuário/mês"); hdr(wsA, 31, 3, "Nota");
const storageRows = [
  [32, "Básico (2 fotos/semana, ~0.5MB)",        0.004, "~8 fotos × 0.5MB = 4MB/mês"],
  [33, "Intermediário (6 fotos/check-in semanal)", 0.012,"~24 fotos × 0.5MB = 12MB/mês"],
  [34, "Pro (ilimitado — estimativa 40 fotos/mês)", 0.020,"~40 fotos × 0.5MB = 20MB/mês"],
];
storageRows.forEach(([r, label, val, src], i) => {
  wsA.getCell(r,1).value = label; wsA.getCell(r,1).font = F.black; wsA.getCell(r,1).border = THIN;
  if (i%2===0) wsA.getCell(r,1).fill = C.grayFill;
  inp(wsA, r, 2, val, '"$"#,##0.000');
  if (i%2===0) wsA.getCell(r,2).fill = C.grayFill;
  note(wsA, r, 3, src);
  if (i%2===0) wsA.getCell(r,3).fill = C.grayFill;
});

// ── E. Token profiles
sectionTitle(wsA, 36, 1, 3, "E. TOKENS INPUT POR MENSAGEM DE CHAT (contexto)");
hdr(wsA, 37, 1, "Plano"); hdr(wsA, 37, 2, "Tokens Input/msg"); hdr(wsA, 37, 3, "Nota");
const ctxRows = [
  [38, "Básico — contexto comprimido",      2000,  "Perfil básico por msg"],
  [39, "Intermediário — contexto médio",    8000,  "Histórico + medidas corporais"],
  [40, "Pro — contexto completo",          18000,  "Histórico completo + bioimpedância"],
];
ctxRows.forEach(([r, label, val, src], i) => {
  wsA.getCell(r,1).value = label; wsA.getCell(r,1).font = F.black; wsA.getCell(r,1).border = THIN;
  if (i%2===0) wsA.getCell(r,1).fill = C.grayFill;
  inp(wsA, r, 2, val, NF.int0);
  if (i%2===0) wsA.getCell(r,2).fill = C.grayFill;
  note(wsA, r, 3, src);
  if (i%2===0) wsA.getCell(r,3).fill = C.grayFill;
});

sectionTitle(wsA, 42, 1, 3, "E2. OUTPUT MÉDIO POR RESPOSTA DO CHAT (tokens)");
hdr(wsA, 43, 1, "Plano"); hdr(wsA, 43, 2, "Tokens Output/msg"); hdr(wsA, 43, 3, "Nota");
const outRows = [
  [44, "Básico",        350, "Respostas curtas / simples"],
  [45, "Intermediário", 450, "Respostas moderadas"],
  [46, "Pro",           550, "Respostas detalhadas / insights"],
];
outRows.forEach(([r, label, val, src], i) => {
  wsA.getCell(r,1).value = label; wsA.getCell(r,1).font = F.black; wsA.getCell(r,1).border = THIN;
  if (i%2===0) wsA.getCell(r,1).fill = C.grayFill;
  inp(wsA, r, 2, val, NF.int0);
  if (i%2===0) wsA.getCell(r,2).fill = C.grayFill;
  note(wsA, r, 3, src);
  if (i%2===0) wsA.getCell(r,3).fill = C.grayFill;
});

sectionTitle(wsA, 48, 1, 4, "E3. TOKENS POR GERAÇÃO IA (dieta + treino — por geração)");
hdr(wsA, 49, 1, "Plano"); hdr(wsA, 49, 2, "Input/geração"); hdr(wsA, 49, 3, "Output/geração"); hdr(wsA, 49, 4, "Nota");
const genRows = [
  [50, "Básico",        5000,  800,  "Geração simples dieta/treino"],
  [51, "Intermediário", 12000, 1200, "Geração elaborada com histórico"],
  [52, "Pro",           20000, 2000, "Geração completa com contexto total"],
];
genRows.forEach(([r, label, inp_v, out_v, src], i) => {
  wsA.getCell(r,1).value = label; wsA.getCell(r,1).font = F.black; wsA.getCell(r,1).border = THIN;
  if (i%2===0) wsA.getCell(r,1).fill = C.grayFill;
  inp(wsA, r, 2, inp_v, NF.int0); if (i%2===0) wsA.getCell(r,2).fill = C.grayFill;
  inp(wsA, r, 3, out_v, NF.int0); if (i%2===0) wsA.getCell(r,3).fill = C.grayFill;
  note(wsA, r, 4, src);           if (i%2===0) wsA.getCell(r,4).fill = C.grayFill;
});

sectionTitle(wsA, 54, 1, 4, "E4. FREQUÊNCIA DE USO — MSGS CHAT/DIA (por cenário)");
hdr(wsA, 55, 1, "Plano"); hdr(wsA, 55, 2, "Conservador (msgs/dia)"); hdr(wsA, 55, 3, "Moderado (msgs/dia)"); hdr(wsA, 55, 4, "Nota");
const freqRows = [
  [56, "Básico",        2, 4,  "Usuário casual → usuário ativo"],
  [57, "Intermediário", 3, 6,  "Usuário regular → usuário engajado"],
  [58, "Pro",           4, 8,  "Usuário frequente → power user"],
];
freqRows.forEach(([r, label, cons, mod, src], i) => {
  wsA.getCell(r,1).value = label; wsA.getCell(r,1).font = F.black; wsA.getCell(r,1).border = THIN;
  if (i%2===0) wsA.getCell(r,1).fill = C.grayFill;
  inp(wsA, r, 2, cons, NF.int0); if (i%2===0) wsA.getCell(r,2).fill = C.grayFill;
  inp(wsA, r, 3, mod,  NF.int0); if (i%2===0) wsA.getCell(r,3).fill = C.grayFill;
  note(wsA, r, 4, src);           if (i%2===0) wsA.getCell(r,4).fill = C.grayFill;
});

sectionTitle(wsA, 60, 1, 4, "E5. GERAÇÕES IA POR MÊS (dieta + treino combinadas)");
hdr(wsA, 61, 1, "Plano"); hdr(wsA, 61, 2, "Conservador (ger/mês)"); hdr(wsA, 61, 3, "Moderado (ger/mês)"); hdr(wsA, 61, 4, "Nota");
const genFreqRows = [
  [62, "Básico",        2, 4,  "2 gerações = 1 dieta + 1 treino mensal"],
  [63, "Intermediário", 4, 6,  "Ajustes semanais"],
  [64, "Pro",           6, 10, "Regenerações frequentes"],
];
genFreqRows.forEach(([r, label, cons, mod, src], i) => {
  wsA.getCell(r,1).value = label; wsA.getCell(r,1).font = F.black; wsA.getCell(r,1).border = THIN;
  if (i%2===0) wsA.getCell(r,1).fill = C.grayFill;
  inp(wsA, r, 2, cons, NF.int0); if (i%2===0) wsA.getCell(r,2).fill = C.grayFill;
  inp(wsA, r, 3, mod,  NF.int0); if (i%2===0) wsA.getCell(r,3).fill = C.grayFill;
  note(wsA, r, 4, src);           if (i%2===0) wsA.getCell(r,4).fill = C.grayFill;
});

// ── F. Margin & pricing targets
sectionTitle(wsA, 66, 1, 3, "F. MARGEM ALVO & PRECIFICAÇÃO");
hdr(wsA, 67, 1, "Parâmetro"); hdr(wsA, 67, 2, "Valor"); hdr(wsA, 67, 3, "Nota");
const marginRows = [
  [68, "Margem bruta alvo mínima (%)", 0.65, NF.pct1, "65% = piso aceitável"],
  [69, "Margem bruta alvo máxima (%)", 0.75, NF.pct1, "75% = ideal"],
  [70, "Desconto plano anual (%)",     0.20, NF.pct1, "20% off vs mensal × 12"],
  [71, "Escala de referência (usuários)", 1000, NF.int0, "Para cálculo infra/usuário em Unit_Economics"],
];
marginRows.forEach(([r, label, val, fmt, src], i) => {
  wsA.getCell(r,1).value = label; wsA.getCell(r,1).font = F.black; wsA.getCell(r,1).border = THIN;
  if (i%2===0) wsA.getCell(r,1).fill = C.grayFill;
  inp(wsA, r, 2, val, fmt);
  if (i%2===0) wsA.getCell(r,2).fill = C.grayFill;
  note(wsA, r, 3, src);
  if (i%2===0) wsA.getCell(r,3).fill = C.grayFill;
});

console.log("✓ Assumptions");

// ═══════════════════════════════════════════════════════════════════════════
// SHEET 2 — TOKEN COSTS
// ═══════════════════════════════════════════════════════════════════════════
const wsT = wb.addWorksheet("Token_Costs");
wsT.views = [{ showGridLines: false }];
wsT.getColumn(1).width = 40;
[2,3,4,5,6,7,8].forEach(c => wsT.getColumn(c).width = 20);

mainTitle(wsT, 1, 1, 8, "CUSTOS DE TOKENS — OpenAI GPT-4o-mini por Usuário/Mês");
subtitleMerge(wsT, 2, 1, 8,
  "Azul = inputs  |  Preto = fórmulas linkadas de Assumptions  |  Colunas C-D = valores token  |  E-H = custos USD e BRL");

// Plans: [name, ctx_row, out_row, gen_in_row, gen_out_row, freq_cons_col, freq_mod_col, gen_cons_col, gen_mod_col]
// All rows reference Assumptions. freq conservative = col B, moderate = col C for rows 56-58 and 62-64
const plansDef = [
  { name: "BÁSICO",        ctxR: 38, outR: 44, ginR: 50, goutR: 50, fcR: 56, fmR: 56, gcR: 62, gmR: 62 },
  { name: "INTERMEDIÁRIO", ctxR: 39, outR: 45, ginR: 51, goutR: 51, fcR: 57, fmR: 57, gcR: 63, gmR: 63 },
  { name: "PRO",           ctxR: 40, outR: 46, ginR: 52, goutR: 52, fcR: 58, fmR: 58, gcR: 64, gmR: 64 },
];

// Track total OpenAI row per plan for later reference
const tcOaiRows = {};

let tRow = 3;
const HDRS = ["Métrica", "Driver / Fórmula", "Conservador (qtd)", "Moderado (qtd)",
               "Cons. Custo USD", "Mod. Custo USD", "Cons. Custo BRL", "Mod. Custo BRL"];

plansDef.forEach((p, pidx) => {
  sectionTitle(wsT, tRow, 1, 8, `PLANO ${p.name}`);
  tRow++;
  HDRS.forEach((h, ci) => hdr(wsT, tRow, ci + 1, h));
  tRow++;

  const r0 = tRow;
  // Row layout per plan: 0=days, 1=msgs/day, 2=total_msgs, 3=ctx, 4=out, 5=gen_cnt, 6=gen_in, 7=gen_out, 8=tot_in, 9=tot_out, 10=total_oai
  const rows = {};

  // Days
  rows.days = tRow;
  lbl(wsT, tRow, 1, "Dias no mês", { fill: C.grayFill });
  note(wsT, tRow, 2, "Fixo = 30 dias");
  inp(wsT, tRow, 3, 30, NF.int0); inp(wsT, tRow, 4, 30, NF.int0);
  [5,6,7,8].forEach(c => { wsT.getCell(tRow, c).value = "—"; wsT.getCell(tRow,c).border = THIN; wsT.getCell(tRow,c).font = F.black; });
  tRow++;

  // Msgs/day
  rows.msgsDay = tRow;
  lbl(wsT, tRow, 1, "Mensagens/dia (chat)");
  note(wsT, tRow, 2, `Assumptions E4 — linha ${p.fcR}`);
  calc(wsT, tRow, 3, `Assumptions!B${p.fcR}`, NF.int0);
  calc(wsT, tRow, 4, `Assumptions!C${p.fmR}`, NF.int0);
  [5,6,7,8].forEach(c => { wsT.getCell(tRow, c).value = "—"; wsT.getCell(tRow,c).border = THIN; wsT.getCell(tRow,c).font = F.black; });
  tRow++;

  // Total msgs/month
  rows.msgsMth = tRow;
  lbl(wsT, tRow, 1, "Total mensagens/mês", { fill: C.grayFill });
  note(wsT, tRow, 2, "= msgs/dia × 30");
  calc(wsT, tRow, 3, `C${tRow-1}*C${tRow-2}`, NF.int0); wsT.getCell(tRow,3).fill = C.grayFill;
  calc(wsT, tRow, 4, `D${tRow-1}*D${tRow-2}`, NF.int0); wsT.getCell(tRow,4).fill = C.grayFill;
  [5,6,7,8].forEach(c => { wsT.getCell(tRow, c).value = "—"; wsT.getCell(tRow,c).border = THIN; wsT.getCell(tRow,c).font = F.black; wsT.getCell(tRow,c).fill = C.grayFill; });
  tRow++;

  // Tokens input/msg (context)
  rows.ctx = tRow;
  lbl(wsT, tRow, 1, "Tokens input/msg (contexto comprimido)");
  note(wsT, tRow, 2, `Assumptions E — linha ${p.ctxR}`);
  calc(wsT, tRow, 3, `Assumptions!B${p.ctxR}`, NF.int0);
  calc(wsT, tRow, 4, `Assumptions!B${p.ctxR}`, NF.int0);
  [5,6,7,8].forEach(c => { wsT.getCell(tRow, c).value = "—"; wsT.getCell(tRow,c).border = THIN; wsT.getCell(tRow,c).font = F.black; });
  tRow++;

  // Output/msg
  rows.outMsg = tRow;
  lbl(wsT, tRow, 1, "Tokens output/resposta", { fill: C.grayFill });
  note(wsT, tRow, 2, `Assumptions E2 — linha ${p.outR}`);
  calc(wsT, tRow, 3, `Assumptions!B${p.outR}`, NF.int0); wsT.getCell(tRow,3).fill = C.grayFill;
  calc(wsT, tRow, 4, `Assumptions!B${p.outR}`, NF.int0); wsT.getCell(tRow,4).fill = C.grayFill;
  [5,6,7,8].forEach(c => { wsT.getCell(tRow, c).value = "—"; wsT.getCell(tRow,c).border = THIN; wsT.getCell(tRow,c).font = F.black; wsT.getCell(tRow,c).fill = C.grayFill; });
  tRow++;

  // Gen count/month
  rows.genCnt = tRow;
  lbl(wsT, tRow, 1, "Gerações IA (dieta+treino) por mês");
  note(wsT, tRow, 2, `Assumptions E5 — linha ${p.gcR}`);
  calc(wsT, tRow, 3, `Assumptions!B${p.gcR}`, NF.int0);
  calc(wsT, tRow, 4, `Assumptions!C${p.gmR}`, NF.int0);
  [5,6,7,8].forEach(c => { wsT.getCell(tRow, c).value = "—"; wsT.getCell(tRow,c).border = THIN; wsT.getCell(tRow,c).font = F.black; });
  tRow++;

  // Gen tokens in
  rows.genIn = tRow;
  lbl(wsT, tRow, 1, "Tokens input por geração IA", { fill: C.grayFill });
  note(wsT, tRow, 2, `Assumptions E3 — linha ${p.ginR}`);
  calc(wsT, tRow, 3, `Assumptions!B${p.ginR}`, NF.int0); wsT.getCell(tRow,3).fill = C.grayFill;
  calc(wsT, tRow, 4, `Assumptions!B${p.ginR}`, NF.int0); wsT.getCell(tRow,4).fill = C.grayFill;
  [5,6,7,8].forEach(c => { wsT.getCell(tRow, c).value = "—"; wsT.getCell(tRow,c).border = THIN; wsT.getCell(tRow,c).font = F.black; wsT.getCell(tRow,c).fill = C.grayFill; });
  tRow++;

  // Gen tokens out
  rows.genOut = tRow;
  lbl(wsT, tRow, 1, "Tokens output por geração IA");
  note(wsT, tRow, 2, `Assumptions E3 col C — linha ${p.goutR}`);
  calc(wsT, tRow, 3, `Assumptions!C${p.goutR}`, NF.int0);
  calc(wsT, tRow, 4, `Assumptions!C${p.goutR}`, NF.int0);
  [5,6,7,8].forEach(c => { wsT.getCell(tRow, c).value = "—"; wsT.getCell(tRow,c).border = THIN; wsT.getCell(tRow,c).font = F.black; });
  tRow++;

  // TOTAL INPUT tokens/month
  rows.totIn = tRow;
  lbl(wsT, tRow, 1, "TOTAL tokens input/mês", { bold: true, fill: C.accentFill });
  note(wsT, tRow, 2, "= msgs×ctx_input + gerações×tok_in_ger");
  const totInC = `C${rows.msgsMth}*C${rows.ctx}+C${rows.genCnt}*C${rows.genIn}`;
  const totInM = `D${rows.msgsMth}*D${rows.ctx}+D${rows.genCnt}*D${rows.genIn}`;
  calc(wsT, tRow, 3, totInC, NF.int0);  wsT.getCell(tRow,3).font = F.boldBlk; wsT.getCell(tRow,3).fill = C.accentFill;
  calc(wsT, tRow, 4, totInM, NF.int0);  wsT.getCell(tRow,4).font = F.boldBlk; wsT.getCell(tRow,4).fill = C.accentFill;
  calc(wsT, tRow, 5, `C${tRow}/1000000*Assumptions!B11`, NF.usd4); wsT.getCell(tRow,5).fill = C.accentFill;
  calc(wsT, tRow, 6, `D${tRow}/1000000*Assumptions!B11`, NF.usd4); wsT.getCell(tRow,6).fill = C.accentFill;
  calc(wsT, tRow, 7, `E${tRow}*Assumptions!B5`, NF.brl4); wsT.getCell(tRow,7).fill = C.accentFill;
  calc(wsT, tRow, 8, `F${tRow}*Assumptions!B5`, NF.brl4); wsT.getCell(tRow,8).fill = C.accentFill;
  tRow++;

  // TOTAL OUTPUT tokens/month
  rows.totOut = tRow;
  lbl(wsT, tRow, 1, "TOTAL tokens output/mês", { bold: true, fill: C.accentFill });
  note(wsT, tRow, 2, "= msgs×tok_output + gerações×tok_out_ger");
  const totOutC = `C${rows.msgsMth}*C${rows.outMsg}+C${rows.genCnt}*C${rows.genOut}`;
  const totOutM = `D${rows.msgsMth}*D${rows.outMsg}+D${rows.genCnt}*D${rows.genOut}`;
  calc(wsT, tRow, 3, totOutC, NF.int0); wsT.getCell(tRow,3).font = F.boldBlk; wsT.getCell(tRow,3).fill = C.accentFill;
  calc(wsT, tRow, 4, totOutM, NF.int0); wsT.getCell(tRow,4).font = F.boldBlk; wsT.getCell(tRow,4).fill = C.accentFill;
  calc(wsT, tRow, 5, `C${tRow}/1000000*Assumptions!B12`, NF.usd4); wsT.getCell(tRow,5).fill = C.accentFill;
  calc(wsT, tRow, 6, `D${tRow}/1000000*Assumptions!B12`, NF.usd4); wsT.getCell(tRow,6).fill = C.accentFill;
  calc(wsT, tRow, 7, `E${tRow}*Assumptions!B5`, NF.brl4); wsT.getCell(tRow,7).fill = C.accentFill;
  calc(wsT, tRow, 8, `F${tRow}*Assumptions!B5`, NF.brl4); wsT.getCell(tRow,8).fill = C.accentFill;
  tRow++;

  // TOTAL OpenAI cost
  rows.oaiTotal = tRow;
  tcOaiRows[p.name] = tRow;  // save for cross-sheet refs
  lbl(wsT, tRow, 1, "CUSTO OPENAI TOTAL (USD e BRL/usuário/mês)", { bold: true, fill: C.greenFill });
  note(wsT, tRow, 2, "= custo_input + custo_output");
  calc(wsT, tRow, 3, `C${rows.totIn}/1000000*Assumptions!B11+C${rows.totOut}/1000000*Assumptions!B12`, NF.usd4);
  wsT.getCell(tRow,3).font = F.boldBlk; wsT.getCell(tRow,3).fill = C.greenFill;
  calc(wsT, tRow, 4, `D${rows.totIn}/1000000*Assumptions!B11+D${rows.totOut}/1000000*Assumptions!B12`, NF.usd4);
  wsT.getCell(tRow,4).font = F.boldBlk; wsT.getCell(tRow,4).fill = C.greenFill;
  calc(wsT, tRow, 5, `C${tRow}`, NF.usd4); wsT.getCell(tRow,5).font = F.boldBlk; wsT.getCell(tRow,5).fill = C.greenFill;
  calc(wsT, tRow, 6, `D${tRow}`, NF.usd4); wsT.getCell(tRow,6).font = F.boldBlk; wsT.getCell(tRow,6).fill = C.greenFill;
  calc(wsT, tRow, 7, `C${tRow}*Assumptions!B5`, NF.brl4); wsT.getCell(tRow,7).font = F.boldBlk; wsT.getCell(tRow,7).fill = C.greenFill;
  calc(wsT, tRow, 8, `D${tRow}*Assumptions!B5`, NF.brl4); wsT.getCell(tRow,8).font = F.boldBlk; wsT.getCell(tRow,8).fill = C.greenFill;
  tRow += 3;
});

// tcOaiRows = { BÁSICO: row, INTERMEDIÁRIO: row, PRO: row }
// Cols: C=conservative USD, D=moderate USD, G=conservative BRL, H=moderate BRL

console.log("✓ Token_Costs  — OpenAI total rows:", tcOaiRows);

// ═══════════════════════════════════════════════════════════════════════════
// SHEET 3 — INFRA COSTS
// ═══════════════════════════════════════════════════════════════════════════
const wsI = wb.addWorksheet("Infra_Costs");
wsI.views = [{ showGridLines: false }];
wsI.getColumn(1).width = 44;
[2,3,4,5,6].forEach(c => wsI.getColumn(c).width = 22);

mainTitle(wsI, 1, 1, 5, "CUSTOS DE INFRAESTRUTURA por Usuário/Mês em Diferentes Escalas");
subtitleMerge(wsI, 2, 1, 5, "Custos fixos de Assumptions. S3 escala com número de usuários e mix de planos.");

const scales = [100, 500, 1000, 2000];
// Server multiplier per scale
const serverMult = { 100: 1, 500: 1, 1000: 2, 2000: 3 };
const cdnMult    = { 100: 1, 500: 1, 1000: 2, 2000: 2 };
const monMult    = { 100: 1, 500: 1, 1000: 1, 2000: 2 };

sectionTitle(wsI, 3, 1, 5, "CUSTO INFRA MENSAL TOTAL (USD) — por escala de usuários");
hdr(wsI, 4, 1, "Componente");
scales.forEach((s, ci) => hdr(wsI, 4, ci + 2, `${s.toLocaleString("pt-BR")} Usuários`));

const iCompRows = {};

// Servidor
iCompRows.server = 5;
lbl(wsI, 5, 1, "Servidor / VPS (escala c/ mais instâncias)", { fill: C.grayFill });
scales.forEach((s, ci) => {
  calc(wsI, 5, ci+2, `Assumptions!B23*${serverMult[s]}`, NF.usd);
  wsI.getCell(5, ci+2).fill = C.grayFill;
});

// DB
iCompRows.db = 6;
lbl(wsI, 6, 1, "Banco de dados Postgres");
scales.forEach((s, ci) => calc(wsI, 6, ci+2, "Assumptions!B24", NF.usd));

// S3
iCompRows.s3 = 7;
lbl(wsI, 7, 1, "Storage S3 (base + fotos por usuários — mix 50/35/15)", { fill: C.grayFill });
scales.forEach((s, ci) => {
  const f = `Assumptions!B25+(0.5*Assumptions!B32+0.35*Assumptions!B33+0.15*Assumptions!B34)*${s}*Assumptions!B26`;
  calc(wsI, 7, ci+2, f, NF.usd);
  wsI.getCell(7, ci+2).fill = C.grayFill;
});

// CDN
iCompRows.cdn = 8;
lbl(wsI, 8, 1, "CDN / Bandwidth");
scales.forEach((s, ci) => calc(wsI, 8, ci+2, `Assumptions!B27*${cdnMult[s]}`, NF.usd));

// Monitoring
iCompRows.mon = 9;
lbl(wsI, 9, 1, "Monitoring / Logs", { fill: C.grayFill });
scales.forEach((s, ci) => {
  calc(wsI, 9, ci+2, `Assumptions!B28*${monMult[s]}`, NF.usd);
  wsI.getCell(9, ci+2).fill = C.grayFill;
});

// Total
const infraTotalRow = 10;
lbl(wsI, 10, 1, "TOTAL INFRA MENSAL (USD)", { bold: true, fill: C.accentFill });
["B","C","D","E"].forEach((col, ci) => {
  calc(wsI, 10, ci+2, `SUM(${col}5:${col}9)`, NF.usd);
  wsI.getCell(10, ci+2).font = F.boldBlk; wsI.getCell(10, ci+2).fill = C.accentFill;
});

// Per-user cost
sectionTitle(wsI, 12, 1, 5, "CUSTO INFRA POR USUÁRIO/MÊS — por escala");
hdr(wsI, 13, 1, "Métrica");
scales.forEach((s, ci) => hdr(wsI, 13, ci + 2, `${s.toLocaleString("pt-BR")} Usuários`));

const infraPerUserRow = 14;
lbl(wsI, 14, 1, "Custo infra/usuário (USD)", { bold: true, fill: C.greenFill });
scales.forEach((s, ci) => {
  calc(wsI, 14, ci+2, `${["B","C","D","E"][ci]}${infraTotalRow}/${s}`, NF.usd4);
  wsI.getCell(14, ci+2).font = F.boldBlk; wsI.getCell(14, ci+2).fill = C.greenFill;
});

lbl(wsI, 15, 1, "Custo infra/usuário (BRL)", { bold: true, fill: C.greenFill });
["B","C","D","E"].forEach((col, ci) => {
  calc(wsI, 15, ci+2, `${col}14*Assumptions!B5`, NF.brl4);
  wsI.getCell(15, ci+2).font = F.boldBlk; wsI.getCell(15, ci+2).fill = C.greenFill;
});

// Storage per plan
sectionTitle(wsI, 17, 1, 4, "CUSTO STORAGE S3 POR USUÁRIO/MÊS (USD) — por plano");
hdr(wsI, 18, 1, "Plano"); hdr(wsI, 18, 2, "GB/usuário"); hdr(wsI, 18, 3, "USD/usuário/mês"); hdr(wsI, 18, 4, "BRL/usuário/mês");

const storePlanRows = [
  [19, "Básico",        "Assumptions!B32"],
  [20, "Intermediário", "Assumptions!B33"],
  [21, "Pro",           "Assumptions!B34"],
];
storePlanRows.forEach(([r, label, gbRef], i) => {
  lbl(wsI, r, 1, label, { fill: i%2===0 ? C.grayFill : undefined });
  calc(wsI, r, 2, gbRef, '"$"#,##0.000');
  calc(wsI, r, 3, `B${r}*Assumptions!B26`, NF.usd4);
  calc(wsI, r, 4, `C${r}*Assumptions!B5`, NF.brl4);
  wsI.getCell(r, 3).font = F.boldBlk;
  if (i%2===0) { wsI.getCell(r,2).fill=C.grayFill; wsI.getCell(r,3).fill=C.grayFill; wsI.getCell(r,4).fill=C.grayFill; }
});

// infraPerUserRow=14  col B=100, C=500, D=1000, E=2000
// storePlanRows: row 19=Básico, 20=Intermediário, 21=Pro (col C = USD, col D = BRL)

console.log("✓ Infra_Costs  — per-user row:", infraPerUserRow, "scale cols B=100,C=500,D=1000,E=2000");

// ═══════════════════════════════════════════════════════════════════════════
// SHEET 4 — STRIPE COSTS
// ═══════════════════════════════════════════════════════════════════════════
const wsS = wb.addWorksheet("Stripe_Costs");
wsS.views = [{ showGridLines: false }];
wsS.getColumn(1).width = 40;
[2,3,4,5,6,7].forEach(c => wsS.getColumn(c).width = 22);

mainTitle(wsS, 1, 1, 7, "CUSTOS STRIPE por Usuário/Mês — Cartão Nacional (Brasil)");
subtitleMerge(wsS, 2, 1, 7, "1 transação/mês por usuário (assinatura recorrente). Taxas: Assumptions C.");

sectionTitle(wsS, 3, 1, 7, "PLANO MENSAL — Stripe Brasil (3.99% + R$0.39)");
["Plano","Preço Mensal (BRL)","Taxa % (R$)","Taxa Fixa (R$)","Total Stripe (R$)","% do Preço","Receita Líq. (R$)"]
  .forEach((h, ci) => hdr(wsS, 4, ci+1, h));

const stripePricesBRL = [
  [5, "Básico",        29.90],
  [6, "Intermediário", 59.90],
  [7, "Pro",           99.90],
];
const stripeMonthlyRows = {};
stripePricesBRL.forEach(([r, pname, price], i) => {
  lbl(wsS, r, 1, pname, { fill: i%2===0 ? C.grayFill : undefined });
  inp(wsS, r, 2, price, NF.brl);
  if (i%2===0) wsS.getCell(r,2).fill = C.grayFill;
  calc(wsS, r, 3, `B${r}*Assumptions!B16`, NF.brl);
  calc(wsS, r, 4, "Assumptions!B17", NF.brl);
  const totalCell = wsS.getCell(r, 5);
  totalCell.value = { formula: `C${r}+D${r}` };
  style(totalCell, { font: F.boldBlk, numFmt: NF.brl });
  calc(wsS, r, 6, `IF(B${r}>0,E${r}/B${r},0)`, NF.pct2);
  calc(wsS, r, 7, `B${r}-E${r}`, NF.brl);
  if (i%2===0) { [3,4,5,6,7].forEach(c => wsS.getCell(r,c).fill = C.grayFill); }
  stripeMonthlyRows[pname] = r;
});

sectionTitle(wsS, 9, 1, 7, "PLANO ANUAL — Stripe Brasil (1 transação/ano × preço anual com 20% off)");
["Plano","Preço Anual (BRL)","Taxa % (R$)","Taxa Fixa (R$)","Total Stripe/ano (R$)","Equiv./mês (R$)","% equiv. mensal"]
  .forEach((h, ci) => hdr(wsS, 10, ci+1, h));

stripePricesBRL.forEach(([_, pname, __], i) => {
  const r = 11 + i;
  const mr = stripeMonthlyRows[pname];
  lbl(wsS, r, 1, pname, { fill: i%2===0 ? C.grayFill : undefined });
  calc(wsS, r, 2, `Stripe_Costs!B${mr}*12*(1-Assumptions!B70)`, NF.brl);
  calc(wsS, r, 3, `B${r}*Assumptions!B16`, NF.brl);
  calc(wsS, r, 4, "Assumptions!B17", NF.brl);
  calc(wsS, r, 5, `C${r}+D${r}`, NF.brl); wsS.getCell(r,5).font = F.boldBlk;
  calc(wsS, r, 6, `E${r}/12`, NF.brl); wsS.getCell(r,6).font = F.boldBlk;
  calc(wsS, r, 7, `IF(B${r}>0,F${r}/(B${r}/12),0)`, NF.pct2);
  if (i%2===0) { [2,3,4,5,6,7].forEach(c => wsS.getCell(r,c).fill = C.grayFill); }
});

// stripeMonthlyRows: {Básico:5, Intermediário:6, Pro:7}
// Monthly stripe cost col E

console.log("✓ Stripe_Costs — monthly rows:", stripeMonthlyRows);

// ═══════════════════════════════════════════════════════════════════════════
// SHEET 5 — UNIT ECONOMICS
// ═══════════════════════════════════════════════════════════════════════════
const wsUE = wb.addWorksheet("Unit_Economics");
wsUE.views = [{ showGridLines: false }];
wsUE.getColumn(1).width = 44;
[2,3,4,5,6,7,8].forEach(c => wsUE.getColumn(c).width = 20);

mainTitle(wsUE, 1, 1, 8, "UNIT ECONOMICS — Custo Total, Preço Sugerido e Margens por Plano");
subtitleMerge(wsUE, 2, 1, 8,
  "Cenário MODERADO (pior caso para precificação). Infra calculada na escala de referência (Assumptions F B71 = 1.000 usuários).");

sectionTitle(wsUE, 3, 1, 8, "COST BUILD-UP — CENÁRIO MODERADO (por usuário/mês)");
["Componente de Custo","Básico (USD)","Básico (BRL)","Intermediário (USD)","Intermediário (BRL)","Pro (USD)","Pro (BRL)","Nota"]
  .forEach((h, ci) => hdr(wsUE, 4, ci+1, h));

let ueRow = 5;

// 1) OpenAI cost
const ueOaiRow = ueRow;
lbl(wsUE, ueRow, 1, "Custo OpenAI (chat + gerações IA)", { fill: C.grayFill });
const planKeys = ["BÁSICO","INTERMEDIÁRIO","PRO"];
planKeys.forEach((pk, pidx) => {
  const tcr = tcOaiRows[pk];
  calc(wsUE, ueRow, 2+pidx*2, `Token_Costs!D${tcr}`, NF.usd4);
  wsUE.getCell(ueRow, 2+pidx*2).fill = C.grayFill;
  calc(wsUE, ueRow, 3+pidx*2, `Token_Costs!D${tcr}*Assumptions!B5`, NF.brl4);
  wsUE.getCell(ueRow, 3+pidx*2).fill = C.grayFill;
});
note(wsUE, ueRow, 8, "Col D de Token_Costs = cenário moderado");
ueRow++;

// 2) Infra cost (@ ref scale = D14 = 1000 users)
const ueInfraRow = ueRow;
lbl(wsUE, ueRow, 1, "Custo Infra/usuário (ref. 1.000 users)");
planKeys.forEach((pk, pidx) => {
  calc(wsUE, ueRow, 2+pidx*2, "Infra_Costs!D14", NF.usd4);
  calc(wsUE, ueRow, 3+pidx*2, "Infra_Costs!D14*Assumptions!B5", NF.brl4);
});
note(wsUE, ueRow, 8, "Infra_Costs!D14 = USD/user @ 1.000 users. Altere escala em Assumptions B71.");
ueRow++;

// 3) Storage per plan
const ueStorageRow = ueRow;
lbl(wsUE, ueRow, 1, "Custo Storage S3/usuário (por plano)", { fill: C.grayFill });
const storageRefs = ["Infra_Costs!C19", "Infra_Costs!C20", "Infra_Costs!C21"];
planKeys.forEach((pk, pidx) => {
  calc(wsUE, ueRow, 2+pidx*2, storageRefs[pidx], NF.usd4);
  wsUE.getCell(ueRow, 2+pidx*2).fill = C.grayFill;
  calc(wsUE, ueRow, 3+pidx*2, `${["B","D","F"][pidx]}${ueRow}*Assumptions!B5`, NF.brl4);
  wsUE.getCell(ueRow, 3+pidx*2).fill = C.grayFill;
});
note(wsUE, ueRow, 8, "Infra_Costs col C linhas 19-21 (USD/user)");
ueRow++;

// 4) Stripe cost (linked from Stripe_Costs!E5/6/7)
const ueStripeRow = ueRow;
lbl(wsUE, ueRow, 1, "Custo Stripe (1 cobrança/mês — taxa sobre preço final)");
const stripeRefs = [
  ["Stripe_Costs!E5", "Stripe_Costs!E5"],
  ["Stripe_Costs!E6", "Stripe_Costs!E6"],
  ["Stripe_Costs!E7", "Stripe_Costs!E7"],
];
planKeys.forEach((pk, pidx) => {
  // BRL col first (cols 3,5,7)
  calc(wsUE, ueRow, 3+pidx*2, stripeRefs[pidx][1], NF.brl4);
  calc(wsUE, ueRow, 2+pidx*2, `${["C","E","G"][pidx]}${ueRow}/Assumptions!B5`, NF.usd4);
});
note(wsUE, ueRow, 8, "Stripe_Costs!E5:E7 = total taxa mensal (BRL)");
ueRow++;

// 5) TOTAL COST
const ueTotalRow = ueRow;
lbl(wsUE, ueRow, 1, "CUSTO TOTAL / USUÁRIO / MÊS", { bold: true, fill: C.accentFill });
planKeys.forEach((pk, pidx) => {
  const usdCol = ["B","D","F"][pidx];
  const brlCol = ["C","E","G"][pidx];
  // Sum USD: oai + infra + storage + stripe (all USD cols)
  const usdFormula = `${usdCol}${ueOaiRow}+${usdCol}${ueInfraRow}+${usdCol}${ueStorageRow}+${usdCol}${ueStripeRow}`;
  calc(wsUE, ueRow, 2+pidx*2, usdFormula, NF.usd4);
  wsUE.getCell(ueRow, 2+pidx*2).font = F.boldBlk; wsUE.getCell(ueRow, 2+pidx*2).fill = C.accentFill;
  // BRL = USD * cambio (more accurate than summing BRL individually due to rounding)
  calc(wsUE, ueRow, 3+pidx*2, `${usdCol}${ueRow}*Assumptions!B5`, NF.brl4);
  wsUE.getCell(ueRow, 3+pidx*2).font = F.boldBlk; wsUE.getCell(ueRow, 3+pidx*2).fill = C.accentFill;
});
note(wsUE, ueRow, 8, "OpenAI + Infra + Storage + Stripe");
ueRow += 2;

// ── Pricing section
sectionTitle(wsUE, ueRow, 1, 8, "PRECIFICAÇÃO SUGERIDA — Mensal e Anual (BRL e USD)");
ueRow++;
["Parâmetro","Básico BRL","Básico USD","Intermediário BRL","Intermediário USD","Pro BRL","Pro USD","Nota"]
  .forEach((h, ci) => hdr(wsUE, ueRow, ci+1, h));
ueRow++;

// Monthly price (INPUT — yellow)
const uePriceRow = ueRow;
lbl(wsUE, ueRow, 1, "Preço mensal sugerido — INPUT (BRL)", { fill: C.yellowFill });
const monthlyPricesBRL = [29.90, 59.90, 99.90];
planKeys.forEach((pk, pidx) => {
  inp(wsUE, ueRow, 2+pidx*2, monthlyPricesBRL[pidx], NF.brl);
  wsUE.getCell(ueRow, 2+pidx*2).fill = C.yellowFill;
  calc(wsUE, ueRow, 3+pidx*2, `${["B","D","F"][pidx]}${ueRow}/Assumptions!B5`, NF.usd);
  wsUE.getCell(ueRow, 3+pidx*2).fill = C.yellowFill;
});
note(wsUE, ueRow, 8, "AMARELO = input editável. Ajuste para ver nova margem.");
ueRow++;

// Gross margin
const ueMarginRow = ueRow;
lbl(wsUE, ueRow, 1, "Margem Bruta (%)", { bold: true, fill: C.greenFill });
planKeys.forEach((pk, pidx) => {
  const priceBRL = `${["B","D","F"][pidx]}${uePriceRow}`;
  const costBRL  = `${["C","E","G"][pidx]}${ueTotalRow}`;
  calc(wsUE, ueRow, 2+pidx*2, `IF(${priceBRL}>0,(${priceBRL}-${costBRL})/${priceBRL},0)`, NF.pct1);
  wsUE.getCell(ueRow, 2+pidx*2).font = F.boldBlk; wsUE.getCell(ueRow, 2+pidx*2).fill = C.greenFill;
  lbl(wsUE, ueRow, 3+pidx*2, "↑ se ≥ 65%", { fill: C.greenFill });
});
note(wsUE, ueRow, 8, "Meta: ≥ Assumptions!B68 (65%)");
ueRow++;

// Net revenue per user
lbl(wsUE, ueRow, 1, "Receita líquida/usuário/mês após Stripe (BRL)", { bold: true });
planKeys.forEach((pk, pidx) => {
  const priceBRL = `${["B","D","F"][pidx]}${uePriceRow}`;
  const stripeE  = `Stripe_Costs!E${5+pidx}`;
  calc(wsUE, ueRow, 2+pidx*2, `${priceBRL}-(${stripeE})`, NF.brl);
  wsUE.getCell(ueRow, 2+pidx*2).font = F.boldBlk;
  lbl(wsUE, ueRow, 3+pidx*2, "BRL líq.");
});
ueRow++;

// Annual price
const ueAnnualRow = ueRow;
lbl(wsUE, ueRow, 1, "Preço anual (BRL) — com 20% desconto", { fill: C.grayFill });
planKeys.forEach((pk, pidx) => {
  const priceBRL = `${["B","D","F"][pidx]}${uePriceRow}`;
  calc(wsUE, ueRow, 2+pidx*2, `${priceBRL}*12*(1-Assumptions!B70)`, NF.brl);
  wsUE.getCell(ueRow, 2+pidx*2).fill = C.grayFill;
  calc(wsUE, ueRow, 3+pidx*2, `${["B","D","F"][pidx]}${ueRow}/Assumptions!B5`, NF.usd);
  wsUE.getCell(ueRow, 3+pidx*2).fill = C.grayFill;
});
note(wsUE, ueRow, 8, "Desconto anual: Assumptions B70.");
ueRow++;

// Annual monthly equivalent
lbl(wsUE, ueRow, 1, "Equivalente mensal do plano anual (BRL)", { fill: C.grayFill });
planKeys.forEach((pk, pidx) => {
  calc(wsUE, ueRow, 2+pidx*2, `${["B","D","F"][pidx]}${ueAnnualRow}/12`, NF.brl);
  wsUE.getCell(ueRow, 2+pidx*2).fill = C.grayFill;
  calc(wsUE, ueRow, 3+pidx*2, `${["B","D","F"][pidx]}${ueRow}/Assumptions!B5`, NF.usd);
  wsUE.getCell(ueRow, 3+pidx*2).fill = C.grayFill;
});
ueRow += 2;

// Sensitivity table
sectionTitle(wsUE, ueRow, 1, 8, "SENSIBILIDADE: Margem Bruta por Escala de Usuários");
ueRow++;
hdr(wsUE, ueRow, 1, "Plano / Escala");
["100 users","500 users","1.000 users","2.000 users"].forEach((sl, ci) => hdr(wsUE, ueRow, ci+2, sl));
ueRow++;

const infraScaleRefs = ["Infra_Costs!B14","Infra_Costs!C14","Infra_Costs!D14","Infra_Costs!E14"];
const storageUSDRefs = ["Infra_Costs!C19","Infra_Costs!C20","Infra_Costs!C21"];

planKeys.forEach((pk, pidx) => {
  const priceBRL  = `${["B","D","F"][pidx]}${uePriceRow}`;
  const oaiUSD    = `Token_Costs!D${tcOaiRows[pk]}`;
  const storageUSD = storageUSDRefs[pidx];
  const stripeE   = `Stripe_Costs!E${5+pidx}`;

  lbl(wsUE, ueRow, 1, ["Básico","Intermediário","Pro"][pidx], { fill: pidx%2===0 ? C.grayFill : undefined });
  infraScaleRefs.forEach((infRef, ci) => {
    const formula = `IF(${priceBRL}>0,(${priceBRL}-((${oaiUSD}+${infRef}+${storageUSD})*Assumptions!B5+(${stripeE})))/${priceBRL},0)`;
    calc(wsUE, ueRow, ci+2, formula, NF.pct1);
    wsUE.getCell(ueRow, ci+2).font = F.boldBlk;
    if (pidx%2===0) wsUE.getCell(ueRow, ci+2).fill = C.grayFill;
  });
  ueRow++;
});

console.log("✓ Unit_Economics — price row:", uePriceRow, "total row:", ueTotalRow, "annual row:", ueAnnualRow, "margin row:", ueMarginRow);

// ═══════════════════════════════════════════════════════════════════════════
// SHEET 6 — REVENUE PROJECTION
// ═══════════════════════════════════════════════════════════════════════════
const wsR = wb.addWorksheet("Revenue_Projection");
wsR.views = [{ showGridLines: false }];
wsR.getColumn(1).width = 38;
[2,3,4,5,6,7,8,9,10,11].forEach(c => wsR.getColumn(c).width = 19);

mainTitle(wsR, 1, 1, 11, "PROJEÇÃO DE RECEITA — Mix: 50% Básico | 35% Intermediário | 15% Pro");
subtitleMerge(wsR, 2, 1, 11, "Preços da aba Unit_Economics. Mix de planos ajustável nas linhas 5-7.");

// Mix inputs
sectionTitle(wsR, 3, 1, 4, "MIX DE PLANOS — Inputs editáveis");
hdr(wsR, 4, 1, "Plano"); hdr(wsR, 4, 2, "% do total"); hdr(wsR, 4, 3, "Soma (validação)"); hdr(wsR, 4, 4, "Nota");
const mixPlans = [["Básico",0.50],["Intermediário",0.35],["Pro",0.15]];
const mixRows2 = {};
mixPlans.forEach(([pname, pct], i) => {
  const r = 5 + i;
  lbl(wsR, r, 1, pname);
  inp(wsR, r, 2, pct, NF.pct1);
  mixRows2[pname] = r;
});
wsR.getCell(5, 3).value = "↓ Deve somar 100%";
wsR.getCell(5, 3).font = F.gray;
wsR.getCell(5, 3).border = THIN;
calc(wsR, 6, 3, "B5+B6+B7", NF.pct1);
wsR.getCell(6, 3).font = F.boldBlk;

const rScales = [100, 250, 500, 1000, 1500, 2000, 3000, 5000, 10000];
const rCols   = ["B","C","D","E","F","G","H","I","J"];

sectionTitle(wsR, 9, 1, 11, "RECEITA MENSAL RECORRENTE (MRR) — por Total de Usuários Pagantes");
const rHdrs = ["Métrica",...rScales.map(s=>s.toLocaleString("pt-BR")+" users"),"Nota"];
rHdrs.forEach((h, ci) => hdr(wsR, 10, ci+1, h));

let rRow = 11;

// Users per plan
const rUserRows = {};
["Básico","Intermediário","Pro"].forEach((pname, i) => {
  rUserRows[pname] = rRow;
  lbl(wsR, rRow, 1, `Usuários ${pname}`, { fill: i%2===0 ? C.grayFill : undefined });
  rScales.forEach((s, ci) => {
    calc(wsR, rRow, ci+2, `ROUND(${s}*B${mixRows2[pname]},0)`, NF.int0);
    if (i%2===0) wsR.getCell(rRow, ci+2).fill = C.grayFill;
  });
  rRow++;
});

// MRR per plan
const rMrrRows = {};
const priceColMap = ["B","D","F"]; // cols in Unit_Economics for each plan monthly price (BRL)
["Básico","Intermediário","Pro"].forEach((pname, i) => {
  rMrrRows[pname] = rRow;
  lbl(wsR, rRow, 1, `MRR ${pname} (BRL)`, { bold: true });
  rScales.forEach((s, ci) => {
    const userRef = `${rCols[ci]}${rUserRows[pname]}`;
    const priceRef = `Unit_Economics!${priceColMap[i]}${uePriceRow}`;
    calc(wsR, rRow, ci+2, `${userRef}*${priceRef}`, NF.brl);
  });
  rRow++;
});

// MRR total
const rMrrTotalRow = rRow;
lbl(wsR, rRow, 1, "MRR TOTAL (BRL)", { bold: true, fill: C.greenFill });
rCols.forEach((col, ci) => {
  const bas = `${col}${rMrrRows["Básico"]}`;
  const int = `${col}${rMrrRows["Intermediário"]}`;
  const pro = `${col}${rMrrRows["Pro"]}`;
  calc(wsR, rRow, ci+2, `${bas}+${int}+${pro}`, NF.brl);
  wsR.getCell(rRow, ci+2).font = F.boldBlk; wsR.getCell(rRow, ci+2).fill = C.greenFill;
});
rRow++;

// MRR USD
const rMrrUSDRow = rRow;
lbl(wsR, rRow, 1, "MRR TOTAL (USD)", { bold: true, fill: C.greenFill });
rCols.forEach((col, ci) => {
  calc(wsR, rRow, ci+2, `${col}${rMrrTotalRow}/Assumptions!B5`, NF.usd);
  wsR.getCell(rRow, ci+2).font = F.boldBlk; wsR.getCell(rRow, ci+2).fill = C.greenFill;
});
rRow++;

// ARR BRL
const rArrBRLRow = rRow;
lbl(wsR, rRow, 1, "ARR (BRL) — × 12", { bold: true, fill: C.accentFill });
rCols.forEach((col, ci) => {
  calc(wsR, rRow, ci+2, `${col}${rMrrTotalRow}*12`, NF.brl);
  wsR.getCell(rRow, ci+2).font = F.boldBlk; wsR.getCell(rRow, ci+2).fill = C.accentFill;
});
rRow++;

// ARR USD
lbl(wsR, rRow, 1, "ARR (USD)", { bold: true, fill: C.accentFill });
rCols.forEach((col, ci) => {
  calc(wsR, rRow, ci+2, `${col}${rArrBRLRow}/Assumptions!B5`, NF.usd);
  wsR.getCell(rRow, ci+2).font = F.boldBlk; wsR.getCell(rRow, ci+2).fill = C.accentFill;
});
rRow += 2;

// COGS
sectionTitle(wsR, rRow, 1, 11, "CUSTO TOTAL MENSAL (COGS) — Cenário Moderado");
rRow++;
rHdrs.forEach((h, ci) => hdr(wsR, rRow, ci+1, h));
rRow++;

const costColMapBRL = ["C","E","G"]; // BRL total cost cols in Unit_Economics
const rCogsRows = {};
["Básico","Intermediário","Pro"].forEach((pname, i) => {
  rCogsRows[pname] = rRow;
  lbl(wsR, rRow, 1, `COGS ${pname} (BRL)`, { fill: i%2===0 ? C.grayFill : undefined });
  const costRef = `Unit_Economics!${costColMapBRL[i]}${ueTotalRow}`;
  rScales.forEach((s, ci) => {
    const userRef = `${rCols[ci]}${rUserRows[pname]}`;
    calc(wsR, rRow, ci+2, `${userRef}*${costRef}`, NF.brl);
    if (i%2===0) wsR.getCell(rRow, ci+2).fill = C.grayFill;
  });
  rRow++;
});

const rCogsTotalRow = rRow;
lbl(wsR, rRow, 1, "COGS TOTAL (BRL)", { bold: true, fill: C.orangeFill });
rCols.forEach((col, ci) => {
  const bas = `${col}${rCogsRows["Básico"]}`;
  const int = `${col}${rCogsRows["Intermediário"]}`;
  const pro = `${col}${rCogsRows["Pro"]}`;
  calc(wsR, rRow, ci+2, `${bas}+${int}+${pro}`, NF.brl);
  wsR.getCell(rRow, ci+2).font = F.boldBlk; wsR.getCell(rRow, ci+2).fill = C.orangeFill;
});
rRow += 2;

// Gross profit
sectionTitle(wsR, rRow, 1, 11, "LUCRO BRUTO MENSAL (MRR - COGS)");
rRow++;
rHdrs.forEach((h, ci) => hdr(wsR, rRow, ci+1, h));
rRow++;

const rGpRow = rRow;
lbl(wsR, rRow, 1, "Lucro Bruto (BRL)", { bold: true, fill: C.greenFill });
rCols.forEach((col, ci) => {
  calc(wsR, rRow, ci+2, `${col}${rMrrTotalRow}-${col}${rCogsTotalRow}`, NF.brl);
  wsR.getCell(rRow, ci+2).font = F.boldBlk; wsR.getCell(rRow, ci+2).fill = C.greenFill;
});
rRow++;

lbl(wsR, rRow, 1, "Margem Bruta (%)", { bold: true, fill: C.greenFill });
rCols.forEach((col, ci) => {
  calc(wsR, rRow, ci+2, `IF(${col}${rMrrTotalRow}>0,${col}${rGpRow}/${col}${rMrrTotalRow},0)`, NF.pct1);
  wsR.getCell(rRow, ci+2).font = F.boldBlk; wsR.getCell(rRow, ci+2).fill = C.greenFill;
});
rRow++;

console.log("✓ Revenue_Projection — MRR total row:", rMrrTotalRow, "COGS total row:", rCogsTotalRow, "ARR BRL row:", rArrBRLRow, "GP row:", rGpRow);

// ═══════════════════════════════════════════════════════════════════════════
// SHEET 7 — RECALC GUIDE
// ═══════════════════════════════════════════════════════════════════════════
const wsG = wb.addWorksheet("Recalc_Guide");
wsG.views = [{ showGridLines: false }];
wsG.getColumn(1).width = 8;
wsG.getColumn(2).width = 56;
wsG.getColumn(3).width = 46;
wsG.getColumn(4).width = 38;

mainTitle(wsG, 1, 1, 4, "GUIA DE RECÁLCULO MENSAL — Shape Certo SaaS", 14);
subtitleMerge(wsG, 2, 1, 4, "Execute este checklist mensalmente ou sempre que houver mudança de preço em APIs, câmbio ou infraestrutura.");

["#","Ação","Onde Atualizar (aba → célula)","Impacto Automático"].forEach((h, ci) => hdr(wsG, 3, ci+1, h));

const steps = [
  [1, "Atualizar câmbio USD → BRL",
     "Assumptions → B5",
     "Todos os custos BRL, preços USD e margens recalculam automaticamente"],
  [2, "Mover câmbio atual para 'mês anterior' antes de atualizar",
     "Assumptions → B6 (câmbio anterior)",
     "B7 (variação câmbio %) calcula automaticamente"],
  [3, "Verificar preço OpenAI Input (USD/1M tk)",
     "Assumptions → B11",
     "Token_Costs → Unit_Economics → Revenue_Projection (cascata completa)"],
  [4, "Verificar preço OpenAI Output (USD/1M tk)",
     "Assumptions → B12",
     "Idem cascata acima"],
  [5, "Verificar taxa % Stripe Brasil",
     "Assumptions → B16",
     "Stripe_Costs recalcula → Unit_Economics (custo Stripe) → margens"],
  [6, "Verificar taxa fixa Stripe (R$)",
     "Assumptions → B17",
     "Idem acima"],
  [7, "Revisar custos de infra (servidor, DB, S3, CDN, monitoring)",
     "Assumptions → B23:B28",
     "Infra_Costs recalcula → Unit_Economics → Revenue_Projection"],
  [8, `Revisar preços sugeridos se margem caiu < 65%`,
     `Unit_Economics → B${uePriceRow}, D${uePriceRow}, F${uePriceRow} (células AMARELAS)`,
     "Margens, Stripe_Costs B5:B7 e Revenue_Projection recalculam"],
  [9, "Sincronizar preços em Stripe_Costs manualmente (sem link automático — evita circularidade)",
     "Stripe_Costs → B5, B6, B7",
     "Stripe_Costs recalcula custo por transação → Unit_Economics"],
  [10, "Verificar mix de planos se base de usuários mudou",
     "Revenue_Projection → B5, B6, B7",
     "Revenue_Projection inteiro recalcula (MRR, ARR, COGS, margem)"],
  [11, "Revisar tokens de contexto se backend mudou compressão",
     "Assumptions → B38, B39, B40",
     "Token_Costs e Unit_Economics recalculam"],
  [12, "Atualizar frequência de uso com dados reais de analytics",
     "Assumptions → B56:C58 (msgs/dia) e B62:C64 (gerações/mês)",
     "Token_Costs, Unit_Economics e Revenue_Projection recalculam"],
  [13, "Verificar erros de fórmula em todas as abas",
     "Todas as abas — verificar #REF!, #DIV/0!, #VALUE!",
     "Zero erros = modelo consistente e confiável"],
  [14, "Atualizar data de última revisão no título da aba Assumptions",
     "Assumptions → A2 (texto da data)",
     "Rastreabilidade de quando o modelo foi revisado"],
];

steps.forEach((step, idx) => {
  const [num, action, where, impact] = step;
  const r = 4 + idx;
  wsG.getRow(r).height = 44;
  const fill = idx%2===0 ? C.grayFill : undefined;

  const numCell = wsG.getCell(r, 1);
  numCell.value = num;
  numCell.font = F.boldBlk;
  numCell.fill = num <= 4 ? C.blueFill : (fill || C.whiteFill);
  if (num <= 4) numCell.font = F.white;
  numCell.alignment = { horizontal: "center", vertical: "middle" };
  numCell.border = THIN;

  const actCell = wsG.getCell(r, 2);
  actCell.value = action;
  actCell.font = F.black;
  actCell.alignment = { wrapText: true, vertical: "middle" };
  actCell.border = THIN;
  if (fill) actCell.fill = fill;

  const whCell = wsG.getCell(r, 3);
  whCell.value = where;
  whCell.font = F.blue;
  whCell.alignment = { wrapText: true, vertical: "middle" };
  whCell.border = THIN;
  if (fill) whCell.fill = fill;

  const impCell = wsG.getCell(r, 4);
  impCell.value = impact;
  impCell.font = F.gray;
  impCell.alignment = { wrapText: true, vertical: "middle" };
  impCell.border = THIN;
  if (fill) impCell.fill = fill;
});

// Warning note about Stripe price sync
const noteStartRow = 4 + steps.length + 1;
sectionTitle(wsG, noteStartRow, 1, 4, "IMPORTANTE: Por Que Stripe_Costs!B5:B7 São Inputs Independentes (Não Linkados)");
const warnTexts = [
  "• Os preços em Stripe_Costs!B5:B7 NÃO são linkados automaticamente de Unit_Economics — isso é intencional.",
  "• Motivo: Stripe cost depende do preço → preço depende do Stripe cost = referência circular.",
  "• Fluxo correto: 1) Altere preço em Unit_Economics (célula amarela) → 2) Verifique nova margem → 3) Se ok, atualize Stripe_Costs B5:B7 → 4) Verifique margem final.",
  "• Diferença é pequena: Stripe cost em 1 iteração já é muito próximo do valor convergido (R$1–R$4 de diferença).",
];
warnTexts.forEach((txt, i) => {
  const r = noteStartRow + 1 + i;
  wsG.mergeCells(r, 1, r, 4);
  const c = wsG.getCell(r, 1);
  c.value = txt;
  c.font = F.gray10;
  c.alignment = { wrapText: true, vertical: "middle" };
  c.border = THIN;
  wsG.getRow(r).height = 28;
});

console.log("✓ Recalc_Guide");

// ═══════════════════════════════════════════════════════════════════════════
// SHEET 8 — SUMMARY DASHBOARD (first visible)
// ═══════════════════════════════════════════════════════════════════════════
const wsD = wb.addWorksheet("Summary_Dashboard", { state: "visible" });
wsD.views = [{ showGridLines: false, state: "frozen", ySplit: 3, xSplit: 1 }];
wsD.getColumn(1).width = 38;
[2,3,4,5].forEach(c => wsD.getColumn(c).width = 28);

wsD.getRow(1).height = 44;
wsD.mergeCells(1, 1, 1, 5);
const titleCell = wsD.getCell(1, 1);
titleCell.value = "SHAPE CERTO — SUMÁRIO EXECUTIVO DO PLANO DE NEGÓCIOS";
titleCell.font  = { name: "Arial", color: { argb: "FFFFFFFF" }, bold: true, size: 15 };
titleCell.fill  = C.darkFill;
titleCell.alignment = { horizontal: "center", vertical: "middle" };

wsD.mergeCells(2, 1, 2, 5);
wsD.getCell(2, 1).value = "Câmbio: USD 1 = R$ 5,70 (Mai 2026)  |  Todos os valores linkados automaticamente das abas de cálculo";
wsD.getCell(2, 1).font  = F.gray;
wsD.getCell(2, 1).alignment = { horizontal: "center" };

let dRow = 3;

// Prices & margins
sectionTitle(wsD, dRow, 1, 5, "PREÇOS E MARGENS — Cenário Moderado @ 1.000 usuários");
dRow++;
["Plano","Preço Mensal (BRL)","Preço Anual (BRL)","Custo Total/Usuário (BRL)","Margem Bruta (%)"]
  .forEach((h, ci) => hdr(wsD, dRow, ci+1, h));
dRow++;

const dashPlans = [["Básico",0],["Intermediário",1],["Pro",2]];
dashPlans.forEach(([pname, pidx]) => {
  const fill = pidx%2===0 ? C.grayFill : undefined;
  lbl(wsD, dRow, 1, pname, { bold: true, fill });
  const pBRL  = `${["B","D","F"][pidx]}${uePriceRow}`;
  const pAnn  = `${["B","D","F"][pidx]}${ueAnnualRow}`;
  const cBRL  = `${["C","E","G"][pidx]}${ueTotalRow}`;
  const mPct  = `${["B","D","F"][pidx]}${ueMarginRow}`;
  calc(wsD, dRow, 2, `Unit_Economics!${pBRL}`, NF.brl); wsD.getCell(dRow,2).font = F.boldBlk;
  calc(wsD, dRow, 3, `Unit_Economics!${pAnn}`, NF.brl); wsD.getCell(dRow,3).font = F.boldBlk;
  calc(wsD, dRow, 4, `Unit_Economics!${cBRL}`, NF.brl4); wsD.getCell(dRow,4).font = F.boldBlk;
  calc(wsD, dRow, 5, `Unit_Economics!${mPct}`, NF.pct1); wsD.getCell(dRow,5).font = F.boldBlk;
  if (fill) [1,2,3,4,5].forEach(c => wsD.getCell(dRow,c).fill = fill);
  dRow++;
});
dRow++;

// Revenue at scale
sectionTitle(wsD, dRow, 1, 5, "RECEITA PROJETADA — Mix 50/35/15 (valores mensais)");
dRow++;
["Escala (Usuários)","MRR (BRL)","ARR (BRL)","COGS (BRL)","Lucro Bruto (BRL)"]
  .forEach((h, ci) => hdr(wsD, dRow, ci+1, h));
dRow++;

// Rev_Projection scale cols: B=100, C=250, D=500, E=1000, F=1500, G=2000, H=3000, I=5000, J=10000
const dashScales = [["100","B"],["500","D"],["1.000","E"],["2.000","G"],["5.000","I"],["10.000","J"]];
dashScales.forEach(([sl, col], i) => {
  const fill = i%2===0 ? C.grayFill : undefined;
  lbl(wsD, dRow, 1, `${sl} usuários`, { bold: true, fill });
  calc(wsD, dRow, 2, `Revenue_Projection!${col}${rMrrTotalRow}`, NF.brl); wsD.getCell(dRow,2).font = F.boldBlk;
  calc(wsD, dRow, 3, `Revenue_Projection!${col}${rArrBRLRow}`, NF.brl);  wsD.getCell(dRow,3).font = F.boldBlk;
  calc(wsD, dRow, 4, `Revenue_Projection!${col}${rCogsTotalRow}`, NF.brl); wsD.getCell(dRow,4).font = F.boldBlk;
  calc(wsD, dRow, 5, `Revenue_Projection!${col}${rGpRow}`, NF.brl);      wsD.getCell(dRow,5).font = F.boldBlk;
  if (fill) [1,2,3,4,5].forEach(c => wsD.getCell(dRow,c).fill = fill);
  dRow++;
});
dRow++;

// OpenAI cost summary
sectionTitle(wsD, dRow, 1, 5, "CUSTO OPENAI POR USUÁRIO/MÊS — Conservador vs. Moderado");
dRow++;
["Plano","Conservador (USD)","Moderado (USD)","Conservador (BRL)","Moderado (BRL)"]
  .forEach((h, ci) => hdr(wsD, dRow, ci+1, h));
dRow++;

dashPlans.forEach(([pname, pidx]) => {
  const fill = pidx%2===0 ? C.grayFill : undefined;
  lbl(wsD, dRow, 1, pname, { fill });
  const tcr = tcOaiRows[planKeys[pidx]];
  calc(wsD, dRow, 2, `Token_Costs!C${tcr}`, NF.usd4); // conservative USD
  calc(wsD, dRow, 3, `Token_Costs!D${tcr}`, NF.usd4); // moderate USD
  calc(wsD, dRow, 4, `Token_Costs!G${tcr}`, NF.brl4); // conservative BRL
  calc(wsD, dRow, 5, `Token_Costs!H${tcr}`, NF.brl4); // moderate BRL
  if (fill) [1,2,3,4,5].forEach(c => wsD.getCell(dRow,c).fill = fill);
  dRow++;
});
dRow++;

// Infra summary
sectionTitle(wsD, dRow, 1, 5, "INFRA: CUSTO POR USUÁRIO CONFORME ESCALA");
dRow++;
["Escala","Infra/usuário (USD)","Infra/usuário (BRL)","Total Infra/mês (USD)","Nota"]
  .forEach((h, ci) => hdr(wsD, dRow, ci+1, h));
dRow++;

const infraDashScales = [["100","B"],["500","C"],["1.000","D"],["2.000","E"]];
infraDashScales.forEach(([sl, col], i) => {
  const fill = i%2===0 ? C.grayFill : undefined;
  lbl(wsD, dRow, 1, `${sl} usuários`, { fill });
  calc(wsD, dRow, 2, `Infra_Costs!${col}14`, NF.usd4);
  calc(wsD, dRow, 3, `Infra_Costs!${col}14*Assumptions!B5`, NF.brl4);
  calc(wsD, dRow, 4, `Infra_Costs!${col}10`, NF.usd);
  note(wsD, dRow, 5, "Fonte: Infra_Costs");
  if (fill) [1,2,3,4].forEach(c => wsD.getCell(dRow,c).fill = fill);
  dRow++;
});

console.log("✓ Summary_Dashboard");

// ── Set tab order: Dashboard first
wb.views = [{ activeTab: 7 }]; // 0-indexed, 7 = Summary_Dashboard (8th sheet)

await wb.xlsx.writeFile(OUT);
console.log(`\n✅ Workbook saved: ${OUT}`);
