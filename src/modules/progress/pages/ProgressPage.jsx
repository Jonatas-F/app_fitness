import { useMemo } from "react";
import SectionCollapsible from "@/components/ui/SectionCollapsible";
import SectionCard from "@/components/ui/SectionCard";
import StatusPill from "@/components/ui/StatusPill";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useLocation } from "react-router-dom";
import { loadCheckins } from "../../../data/checkinStorage";
import "./ProgressPage.css";

function getProgressView(pathname) {
  if (pathname.endsWith("/fotos")) return "photos";
  if (pathname.endsWith("/comparar")) return "compare";
  if (pathname.endsWith("/bioimpedancia")) return "bio";
  if (pathname.endsWith("/medidas")) return "measurements";
  return "overview";
}

function numberValue(value) {
  const normalized = String(value ?? "").trim().replace(",", ".");
  if (!normalized) return null;

  const parsed = Number(normalized.replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";

  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatMetric(value, suffix = "") {
  if (value === null || value === undefined || value === "") return "--";
  return `${value}${suffix}`;
}

function formatSignedDifference(next, previous, suffix = "") {
  const current = numberValue(next);
  const prior = numberValue(previous);

  if (current === null || prior === null) return "--";

  const delta = current - prior;
  const rounded = Number.isInteger(delta) ? delta : delta.toFixed(1);
  return `${delta > 0 ? "+" : ""}${rounded}${suffix}`;
}

function completedCheckins(checkins) {
  return checkins.filter((item) => item.status !== "missed");
}

function buildOverviewMetrics(checkins) {
  const latest = checkins[0];
  const previous = checkins[1];

  return [
    {
      label: "Check-ins validos",
      value: `${checkins.length}`,
      helper: latest ? `Ultimo em ${formatDate(latest.createdAt)}` : "Sem registro ainda",
    },
    {
      label: "Peso",
      value: latest ? formatMetric(latest.weight, " kg") : "--",
      helper: previous ? `Delta ${formatSignedDifference(latest.weight, previous.weight, " kg")}` : "Aguardando comparativo",
    },
    {
      label: "Gordura",
      value: latest ? formatMetric(latest.bodyFat || latest.bioimpedanceBodyFat, "%") : "--",
      helper: previous
        ? `Delta ${formatSignedDifference(
            latest.bodyFat || latest.bioimpedanceBodyFat,
            previous.bodyFat || previous.bioimpedanceBodyFat,
            "%"
          )}`
        : "Aguardando comparativo",
    },
    {
      label: "Fotos anexadas",
      value: `${checkins.filter((item) => Array.isArray(item.photos) && item.photos.length).length}`,
      helper: "Registros com apoio visual",
    },
  ];
}

function buildMeasurementRows(checkins) {
  return checkins
    .filter(
      (item) =>
        item.waist ||
        item.abdomen ||
        item.hip ||
        item.rightArmMeasure ||
        item.leftArmMeasure ||
        item.rightThighMeasure ||
        item.leftThighMeasure
    )
    .map((item) => ({
      id: item.id,
      date: formatDate(item.createdAt),
      waist: item.waist || "--",
      abdomen: item.abdomen || "--",
      hip: item.hip || "--",
      rightArm: item.rightArmMeasure || "--",
      leftArm: item.leftArmMeasure || "--",
      rightThigh: item.rightThighMeasure || "--",
      leftThigh: item.leftThighMeasure || "--",
    }));
}

function buildBioRows(checkins) {
  return checkins
    .filter(
      (item) =>
        item.totalBodyWeight ||
        item.bioimpedanceBodyFat ||
        item.muscleMass ||
        item.skeletalMuscleMass ||
        item.visceralFat
    )
    .map((item) => ({
      id: item.id,
      date: formatDate(item.createdAt),
      weight: item.totalBodyWeight || item.weight || "--",
      bodyFat: item.bioimpedanceBodyFat || item.bodyFat || "--",
      leanMass: item.leanMass || "--",
      muscleMass: item.muscleMass || "--",
      skeletalMass: item.skeletalMuscleMass || "--",
      visceralFat: item.visceralFat || "--",
    }));
}

function buildPhotoRows(checkins) {
  return checkins
    .filter((item) => Array.isArray(item.photos) && item.photos.length)
    .map((item) => ({
      id: item.id,
      date: formatDate(item.createdAt),
      cadence: item.cadence || "weekly",
      count: item.photos.length,
      note: item.photoNote || item.notes || "Sem observacoes adicionais.",
    }));
}

function ProgressEmptyState({ title, description }) {
  return (
    <div className="progress-empty-state">
      <strong>{title}</strong>
      <p>{description}</p>
    </div>
  );
}

function ProgressSummaryCards({ items }) {
  return (
    <section className="progress-summary-grid">
      {items.map((item) => (
        <SectionCard
          key={item.label}
          className="progress-summary-card glass-panel"
          eyebrow={item.label}
          title={item.value}
          description={item.helper}
        />
      ))}
    </section>
  );
}

function OverviewSection({ checkins }) {
  const latest = checkins[0];
  const previous = checkins[1];

  return (
    <SectionCollapsible
      className="progress-collapsible glass-panel"
      eyebrow="Resumo"
      title="Comparativo mais recente"
      summary="Peso, composicao corporal e observacoes dos ultimos registros."
      badge={`${checkins.length} registro(s)`}
      defaultOpen
    >
      {latest ? (
        <div className="progress-compare-grid">
          <article>
            <span>Ultimo check-in</span>
            <strong>{formatDate(latest.createdAt)}</strong>
            <small>{latest.goal || "Sem objetivo informado"}</small>
          </article>
          <article>
            <span>Peso</span>
            <strong>{formatMetric(latest.weight, " kg")}</strong>
            <small>{previous ? `Delta ${formatSignedDifference(latest.weight, previous.weight, " kg")}` : "Sem comparativo anterior"}</small>
          </article>
          <article>
            <span>Gordura corporal</span>
            <strong>{formatMetric(latest.bodyFat || latest.bioimpedanceBodyFat, "%")}</strong>
            <small>
              {previous
                ? `Delta ${formatSignedDifference(
                    latest.bodyFat || latest.bioimpedanceBodyFat,
                    previous.bodyFat || previous.bioimpedanceBodyFat,
                    "%"
                  )}`
                : "Sem comparativo anterior"}
            </small>
          </article>
          <article>
            <span>Massa magra</span>
            <strong>{formatMetric(latest.leanMass, " kg")}</strong>
            <small>{previous ? `Delta ${formatSignedDifference(latest.leanMass, previous.leanMass, " kg")}` : "Sem comparativo anterior"}</small>
          </article>
        </div>
      ) : (
        <ProgressEmptyState
          title="Sem progresso salvo ainda"
          description="Complete pelo menos um check-in semanal ou mensal para começar os comparativos."
        />
      )}
    </SectionCollapsible>
  );
}

function CompareSection({ checkins }) {
  const [latest, previous] = checkins;

  return (
    <SectionCollapsible
      className="progress-collapsible glass-panel"
      eyebrow="Comparar"
      title="Dois check-ins mais recentes"
      summary="Leitura rapida das mudancas corporais mais importantes."
      badge={previous ? "2 bases ativas" : "1 base ativa"}
      defaultOpen
    >
      {latest && previous ? (
        <div className="progress-compare-grid">
          <article>
            <span>Peso</span>
            <strong>{formatSignedDifference(latest.weight, previous.weight, " kg")}</strong>
            <small>{formatMetric(previous.weight, " kg")} para {formatMetric(latest.weight, " kg")}</small>
          </article>
          <article>
            <span>Cintura</span>
            <strong>{formatSignedDifference(latest.waist, previous.waist, " cm")}</strong>
            <small>{formatMetric(previous.waist, " cm")} para {formatMetric(latest.waist, " cm")}</small>
          </article>
          <article>
            <span>Abdomen</span>
            <strong>{formatSignedDifference(latest.abdomen, previous.abdomen, " cm")}</strong>
            <small>{formatMetric(previous.abdomen, " cm")} para {formatMetric(latest.abdomen, " cm")}</small>
          </article>
          <article>
            <span>Quadril</span>
            <strong>{formatSignedDifference(latest.hip, previous.hip, " cm")}</strong>
            <small>{formatMetric(previous.hip, " cm")} para {formatMetric(latest.hip, " cm")}</small>
          </article>
        </div>
      ) : (
        <ProgressEmptyState
          title="Comparativo ainda incompleto"
          description="Salve pelo menos dois check-ins realizados para destravar esse painel."
        />
      )}
    </SectionCollapsible>
  );
}

function MeasurementsSection({ rows }) {
  return (
    <SectionCollapsible
      className="progress-collapsible glass-panel"
      eyebrow="Medidas"
      title="Historico de medidas"
      summary="Cintura, abdomen, quadril, bracos e coxas extraidos dos check-ins."
      badge={`${rows.length} registro(s)`}
      defaultOpen
    >
      {rows.length ? (
        <div className="progress-table-shell">
          <Table className="progress-table">
            <caption className="progress-table__caption">Historico de medidas corporais salvas nos check-ins.</caption>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Cintura</TableHead>
                <TableHead>Abdomen</TableHead>
                <TableHead>Quadril</TableHead>
                <TableHead>Braco D</TableHead>
                <TableHead>Braco E</TableHead>
                <TableHead>Coxa D</TableHead>
                <TableHead>Coxa E</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.date}</TableCell>
                  <TableCell>{formatMetric(row.waist, " cm")}</TableCell>
                  <TableCell>{formatMetric(row.abdomen, " cm")}</TableCell>
                  <TableCell>{formatMetric(row.hip, " cm")}</TableCell>
                  <TableCell>{formatMetric(row.rightArm, " cm")}</TableCell>
                  <TableCell>{formatMetric(row.leftArm, " cm")}</TableCell>
                  <TableCell>{formatMetric(row.rightThigh, " cm")}</TableCell>
                  <TableCell>{formatMetric(row.leftThigh, " cm")}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <ProgressEmptyState
          title="Sem medidas suficientes"
          description="As medidas aparecem aqui quando entram nos check-ins semanais ou mensais."
        />
      )}
    </SectionCollapsible>
  );
}

function BioSection({ rows }) {
  return (
    <SectionCollapsible
      className="progress-collapsible glass-panel"
      eyebrow="Bioimpedancia"
      title="Historico corporal"
      summary="Peso, gordura, massa magra e leituras de composicao corporal."
      badge={`${rows.length} leitura(s)`}
      defaultOpen
    >
      {rows.length ? (
        <div className="progress-table-shell">
          <Table className="progress-table">
            <caption className="progress-table__caption">Historico de bioimpedancia e composicao corporal.</caption>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Peso</TableHead>
                <TableHead>Gordura</TableHead>
                <TableHead>Massa magra</TableHead>
                <TableHead>Massa muscular</TableHead>
                <TableHead>Musculo esqueletico</TableHead>
                <TableHead>Visceral</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.date}</TableCell>
                  <TableCell>{formatMetric(row.weight, " kg")}</TableCell>
                  <TableCell>{formatMetric(row.bodyFat, "%")}</TableCell>
                  <TableCell>{formatMetric(row.leanMass, " kg")}</TableCell>
                  <TableCell>{formatMetric(row.muscleMass, " kg")}</TableCell>
                  <TableCell>{formatMetric(row.skeletalMass, " kg")}</TableCell>
                  <TableCell>{row.visceralFat}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <ProgressEmptyState
          title="Sem bioimpedancia salva"
          description="Quando esse bloco for preenchido no check-in mensal, o historico aparece aqui."
        />
      )}
    </SectionCollapsible>
  );
}

function PhotosSection({ rows }) {
  return (
    <SectionCollapsible
      className="progress-collapsible glass-panel"
      eyebrow="Fotos"
      title="Registros visuais"
      summary="Check-ins com fotos anexadas e notas do usuario."
      badge={`${rows.length} registro(s)`}
      defaultOpen
    >
      {rows.length ? (
        <div className="progress-table-shell">
          <Table className="progress-table">
            <caption className="progress-table__caption">Historico de registros com fotos anexadas.</caption>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Cadencia</TableHead>
                <TableHead>Fotos</TableHead>
                <TableHead className="progress-table__notes-head">Observacao</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.date}</TableCell>
                  <TableCell>
                    <StatusPill tone="neutral">{row.cadence}</StatusPill>
                  </TableCell>
                  <TableCell>
                    <StatusPill tone="info">{row.count}/5</StatusPill>
                  </TableCell>
                  <TableCell className="progress-table__notes-cell">
                    <strong>Registro com apoio visual</strong>
                    <span>{row.note}</span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <ProgressEmptyState
          title="Sem fotos no historico"
          description="As fotos obrigatorias do check-in semanal ou mensal começam a aparecer aqui quando forem salvas."
        />
      )}
    </SectionCollapsible>
  );
}

export default function ProgressPage() {
  const { pathname } = useLocation();
  const viewKey = getProgressView(pathname);
  const checkins = useMemo(() => completedCheckins(loadCheckins()), []);
  const overviewMetrics = useMemo(() => buildOverviewMetrics(checkins), [checkins]);
  const measurementRows = useMemo(() => buildMeasurementRows(checkins), [checkins]);
  const bioRows = useMemo(() => buildBioRows(checkins), [checkins]);
  const photoRows = useMemo(() => buildPhotoRows(checkins), [checkins]);

  return (
    <section className="progress-page">
      <header className="progress-hero glass-panel">
        <span>Progresso</span>
        <h1>Historico corporal, comparativos e leitura do ciclo.</h1>
        <p>
          Tudo aqui sai dos check-ins ja salvos: medidas, bioimpedancia, peso, fotos e comparativos
          entre os registros mais recentes.
        </p>
      </header>

      <ProgressSummaryCards items={overviewMetrics} />

      {viewKey === "overview" ? (
        <>
          <OverviewSection checkins={checkins} />
          <CompareSection checkins={checkins} />
          <MeasurementsSection rows={measurementRows.slice(0, 8)} />
          <BioSection rows={bioRows.slice(0, 8)} />
          <PhotosSection rows={photoRows.slice(0, 8)} />
        </>
      ) : null}

      {viewKey === "compare" ? <CompareSection checkins={checkins} /> : null}
      {viewKey === "measurements" ? <MeasurementsSection rows={measurementRows} /> : null}
      {viewKey === "bio" ? <BioSection rows={bioRows} /> : null}
      {viewKey === "photos" ? <PhotosSection rows={photoRows} /> : null}
    </section>
  );
}
