import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const resultsRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "resultados");

interface Stats {
  media: number | null;
  p50: number | null;
  p95: number | null;
  max: number | null;
}

interface RunRecord {
  cenario: string;
  repeticao: number;
  data_execucao: string;
  parametros: Record<string, unknown>;
  resultados: Record<string, unknown> & {
    tempo_consistencia_ms: Stats;
    latencia_http_ms: Stats;
  };
}

const NUMERIC_METRICS = [
  "pagamentos_criados",
  "pagamentos_duplicados_criados",
  "duplicatas_bloqueadas",
  "clientes_cobrados_em_duplicidade",
  "cobrancas_extras_aprovadas",
  "aprovados",
  "falhados",
  "pendentes_ao_fim",
  "taxa_sucesso_final",
  "taxa_falha_definitiva",
  "tentativas_medias_aprovados",
  "throughput_req_s",
  "mensagens_na_dlq",
] as const;

function loadRuns(): RunRecord[] {
  const runs: RunRecord[] = [];
  for (const scenarioDir of readdirSync(resultsRoot)) {
    const fullDir = path.join(resultsRoot, scenarioDir);
    if (scenarioDir.startsWith("_") || !statSync(fullDir).isDirectory()) {
      continue;
    }
    for (const file of readdirSync(fullDir).filter((name) => name.endsWith(".json"))) {
      runs.push(JSON.parse(readFileSync(path.join(fullDir, file), "utf-8")));
    }
  }
  return runs.sort((a, b) => a.cenario.localeCompare(b.cenario) || a.repeticao - b.repeticao);
}

function flatten(run: RunRecord): Record<string, unknown> {
  const row: Record<string, unknown> = {
    cenario: run.cenario,
    repeticao: run.repeticao,
    data_execucao: run.data_execucao,
    ...run.parametros,
  };
  for (const metric of NUMERIC_METRICS) {
    row[metric] = run.resultados[metric];
  }
  row.respostas_http = JSON.stringify(run.resultados.respostas_http);
  row.consistencia_media_ms = run.resultados.tempo_consistencia_ms.media;
  row.consistencia_p95_ms = run.resultados.tempo_consistencia_ms.p95;
  row.consistencia_max_ms = run.resultados.tempo_consistencia_ms.max;
  row.latencia_http_p50_ms = run.resultados.latencia_http_ms.p50;
  row.latencia_http_p95_ms = run.resultados.latencia_http_ms.p95;
  return row;
}

function toCsv(rows: Record<string, unknown>[]): string {
  const headers = Object.keys(rows[0] ?? {});
  const escape = (value: unknown) => {
    const text = String(value ?? "");
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  return [
    headers.join(","),
    ...rows.map((row) => headers.map((h) => escape(row[h])).join(",")),
  ].join("\n");
}

function aggregateByScenario(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  const metrics = [
    ...NUMERIC_METRICS,
    "consistencia_media_ms",
    "consistencia_p95_ms",
    "latencia_http_p95_ms",
  ];
  const groups = new Map<string, Record<string, unknown>[]>();
  for (const row of rows) {
    const scenario = String(row.cenario);
    groups.set(scenario, [...(groups.get(scenario) ?? []), row]);
  }
  return [...groups.entries()].map(([scenario, group]) => {
    const aggregated: Record<string, unknown> = { cenario: scenario, repeticoes: group.length };
    for (const metric of metrics) {
      const values = group
        .map((row) => row[metric])
        .filter((value): value is number => typeof value === "number");
      if (values.length === 0) {
        continue;
      }
      const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
      aggregated[`${metric}_media`] = Number(mean.toFixed(4));
      aggregated[`${metric}_min`] = Math.min(...values);
      aggregated[`${metric}_max`] = Math.max(...values);
    }
    return aggregated;
  });
}

const rows = loadRuns().map(flatten);
writeFileSync(path.join(resultsRoot, "resumo-por-rodada.csv"), toCsv(rows));
writeFileSync(path.join(resultsRoot, "resumo-por-cenario.csv"), toCsv(aggregateByScenario(rows)));
console.log(`${rows.length} rodadas consolidadas em experimentos/resultados/resumo-*.csv`);
