// Cálculos del Resumen: cobros, por cobrar, ventas, embudo, producción y prioridades.
// Todo sale de los datos del panel (clientes y proyectos); nada se estima por fuera.
import type { Client } from "./data";
import {
  businessDaysBetween,
  businessToday,
  calendarDaysBetween,
  flowOf,
  projectName,
  statusOf,
  tasksOf,
  TEMPLATES,
  type Project,
  type TemplateKey,
} from "./production";

const MONTHS = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sept",
  "oct",
  "nov",
  "dic",
];
const monthKey = (d: string) => d.slice(0, 7);
const keyOf = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

export type Payment = {
  date: string;
  amount: number;
  kind: "deposit" | "balance";
  project: Project;
};

// Pagos registrados. Si un pago se marcó antes de que existiera su fecha, se usa la mejor aproximación:
// el fin de la etapa de inicio (70 %) o la última modificación del proyecto (30 %).
export function paymentsOf(p: Project): Payment[] {
  if (!p.amount) return [];
  const out: Payment[] = [];
  if (p.paid_deposit)
    out.push({
      kind: "deposit",
      amount: Math.round(p.amount * 70) / 100,
      project: p,
      date: p.paid_deposit_at ?? p.history[0]?.e ?? p.created_at.slice(0, 10),
    });
  if (p.paid_balance)
    out.push({
      kind: "balance",
      amount: Math.round(p.amount * 30) / 100,
      project: p,
      date: p.paid_balance_at ?? p.updated_at.slice(0, 10),
    });
  return out;
}

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

// Últimos n meses, del más antiguo al actual.
function lastMonths(n: number, now = new Date()) {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (n - 1 - i), 1);
    return {
      key: keyOf(d),
      label: MONTHS[d.getMonth()],
      year: d.getFullYear(),
    };
  });
}

export type Priority = {
  id: string;
  level: "crit" | "warn" | "info";
  title: string;
  detail: string;
  amount?: number;
  target: { kind: "project"; id: string } | { kind: "client"; id: string };
  message?: TemplateKey;
};

export function buildDashboard(
  clients: Client[],
  projects: Project[],
  now = new Date(),
) {
  const today = businessToday(now);
  const thisMonth = keyOf(now);
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonth = keyOf(prev);
  const clientById = new Map(clients.map((c) => [c.id, c]));
  const label = (id: string) => {
    const c = clientById.get(id);
    return c ? c.company || c.name : "Cliente";
  };

  // ——— Dinero ———
  const payments = projects.flatMap(paymentsOf);
  const cobradoMes = sum(
    payments.filter((x) => monthKey(x.date) === thisMonth).map((x) => x.amount),
  );
  const cobradoMesAnterior = sum(
    payments.filter((x) => monthKey(x.date) === prevMonth).map((x) => x.amount),
  );
  const cobradoAnio = sum(
    payments
      .filter((x) => x.date.startsWith(String(now.getFullYear())))
      .map((x) => x.amount),
  );

  const open = projects.filter((p) => !p.closed_admin && p.amount);
  const pendingDeposit = sum(
    open
      .filter((p) => !p.paid_deposit)
      .map((p) => Math.round(p.amount! * 70) / 100),
  );
  const pendingBalance = sum(
    open
      .filter((p) => !p.paid_balance)
      .map((p) => Math.round(p.amount! * 30) / 100),
  );
  const porCobrar = pendingDeposit + pendingBalance;

  const vendidoMes = sum(
    projects
      .filter((p) => monthKey(p.created_at) === thisMonth)
      .map((p) => p.amount ?? 0),
  );
  const proyectosMes = projects.filter(
    (p) => monthKey(p.created_at) === thisMonth,
  ).length;
  const withAmount = projects.filter((p) => p.amount);
  const ticket = withAmount.length
    ? sum(withAmount.map((p) => p.amount!)) / withAmount.length
    : null;
  const sinMonto = projects.filter((p) => p.amount == null && !p.closed_admin);

  const cobradoPorMes = lastMonths(6, now).map((m) => ({
    ...m,
    value: sum(
      payments.filter((x) => monthKey(x.date) === m.key).map((x) => x.amount),
    ),
  }));

  // ——— Comercial ———
  const stageCount = (s: Client["stage"]) =>
    clients.filter((c) => c.stage === s).length;
  const funnel = (
    [
      ["nuevo", "Nuevos"],
      ["conversacion", "En conversación"],
      ["propuesta", "Propuesta enviada"],
      ["ganado", "Ganados"],
      ["perdido", "Perdidos"],
    ] as const
  ).map(([id, name]) => ({
    id,
    name,
    count: stageCount(id),
    value: sum(clients.filter((c) => c.stage === id).map((c) => c.value ?? 0)),
  }));
  const negociacion = clients.filter(
    (c) => c.stage === "conversacion" || c.stage === "propuesta",
  );
  const enNegociacion = sum(negociacion.map((c) => c.value ?? 0));
  const negociacionSinValor = negociacion.filter((c) => c.value == null).length;
  const decididos = stageCount("ganado") + stageCount("perdido");
  const conversion = decididos
    ? Math.round((stageCount("ganado") / decididos) * 100)
    : null;
  const leadsPorMes = lastMonths(6, now).map((m) => ({
    ...m,
    value: clients.filter((c) => monthKey(c.created_at) === m.key).length,
  }));
  const leadsMes = clients.filter(
    (c) => monthKey(c.created_at) === thisMonth,
  ).length;
  const origen = (["brief", "contacto", "manual"] as const).map((s) => ({
    id: s,
    count: clients.filter((c) => c.source === s).length,
  }));

  // ——— Servicios ———
  const servicios = (["we", "wep", "eco", "otro"] as const)
    .map((s) => {
      const ps = projects.filter((p) => p.service === s);
      return {
        id: s,
        count: ps.length,
        amount: sum(ps.map((p) => p.amount ?? 0)),
      };
    })
    .filter((s) => s.count);

  // ——— Producción ———
  const status = projects.map((p) => ({ p, s: statusOf(p, today) }));
  const activos = status.filter(
    ({ s }) => !["sinficha", "terminado"].includes(s.kind),
  );
  const conAlive = activos.filter(({ s }) => s.kind === "alive").length;
  const conCliente = activos.filter(({ s }) => s.kind === "cliente").length;
  const enPausa = activos.filter(({ s }) => s.kind === "pausa").length;
  const fueraDePlazo = activos.filter(
    ({ s }) => (s.kind === "alive" || s.kind === "cliente") && s.late,
  ).length;
  // Etapas terminadas a tiempo: cada fase cerrada frente a su tiempo acordado (sin el acompañamiento).
  const fases = projects.flatMap((p) => {
    const fl = flowOf(p.service);
    if (p.service === "otro") return [];
    return p.history
      .filter((h) => fl.phases[h.i] && fl.phases[h.i].stage !== fl.last)
      .map((h) => ({
        owner: fl.phases[h.i].o,
        onTime: businessDaysBetween(h.s, h.e) <= fl.phases[h.i].d,
        days: businessDaysBetween(h.s, h.e),
      }));
  });
  const aTiempo = fases.filter((f) => f.owner === "alive");
  const aTiempoPct = aTiempo.length
    ? Math.round(
        (aTiempo.filter((f) => f.onTime).length / aTiempo.length) * 100,
      )
    : null;
  const esperas = fases.filter((f) => f.owner === "cliente");
  const esperaPromedio = esperas.length
    ? Math.round((sum(esperas.map((f) => f.days)) / esperas.length) * 10) / 10
    : null;

  // ——— Prioridades ———
  const priorities: Priority[] = [];
  for (const { p, s } of status) {
    const name = `${label(p.client_id)} · ${projectName(p)}`;
    for (const t of tasksOf(p, today))
      priorities.push({
        id: `${p.id}-${t.key ?? t.text}`,
        level: t.level,
        title: t.key ? TEMPLATES[t.key].t : "Cerrar el proyecto",
        detail: `${name} · ${t.text}`,
        target: { kind: "project", id: p.id },
        message: t.key,
      });
    // Cobros que frenan el avance: la fase actual espera un pago no marcado.
    if (
      (s.kind === "cliente" || s.kind === "alive") &&
      s.phase.pago &&
      p.amount
    ) {
      const unpaid =
        s.phase.pago === "deposit" ? !p.paid_deposit : !p.paid_balance;
      if (unpaid) {
        const pct = s.phase.pago === "deposit" ? 70 : 30;
        priorities.push({
          id: `${p.id}-cobro`,
          level: "warn",
          title: `Cobrar el ${pct} %`,
          detail: `${name} · el proyecto no avanza sin este pago`,
          amount: Math.round(p.amount * pct) / 100,
          target: { kind: "project", id: p.id },
        });
      }
    }
  }
  for (const c of clients) {
    const who = c.company || c.name;
    const age = businessDaysBetween(c.created_at.slice(0, 10), today);
    if (c.stage === "nuevo" && age >= 1)
      priorities.push({
        id: `${c.id}-nuevo`,
        level: age >= 3 ? "crit" : "warn",
        title: "Responder consulta nueva",
        detail: `${who} · ${age === 1 ? "llegó hace 1 día hábil" : `llegó hace ${age} días hábiles`} (la ficha pide responder en 1)`,
        target: { kind: "client", id: c.id },
      });
    const quiet = calendarDaysBetween(c.updated_at.slice(0, 10), now);
    if (c.stage === "propuesta" && quiet >= 30)
      priorities.push({
        id: `${c.id}-vencida`,
        level: "warn",
        title: "Propuesta vencida",
        detail: `${who} · sin cambios hace ${quiet} días; la propuesta vale 30. Renueva o marca como perdido`,
        amount: c.value ?? undefined,
        target: { kind: "client", id: c.id },
      });
    else if (c.stage === "propuesta" && quiet >= 5)
      priorities.push({
        id: `${c.id}-seguimiento`,
        level: "info",
        title: "Seguimiento de propuesta",
        detail: `${who} · sin cambios hace ${quiet} días`,
        amount: c.value ?? undefined,
        target: { kind: "client", id: c.id },
      });
    if (c.stage === "ganado" && !projects.some((p) => p.client_id === c.id))
      priorities.push({
        id: `${c.id}-sinproyecto`,
        level: "info",
        title: "Crear su proyecto",
        detail: `${who} · ganado y sin proyecto en Producción`,
        amount: c.value ?? undefined,
        target: { kind: "client", id: c.id },
      });
  }
  for (const p of sinMonto)
    priorities.push({
      id: `${p.id}-monto`,
      level: "info",
      title: "Completar el monto",
      detail: `${label(p.client_id)} · ${projectName(p)} · sin monto no entra en cobros`,
      target: { kind: "project", id: p.id },
    });
  const order = { crit: 0, warn: 1, info: 2 };
  priorities.sort((a, b) => order[a.level] - order[b.level]);

  return {
    cobradoMes,
    cobradoMesAnterior,
    cobradoAnio,
    porCobrar,
    pendingDeposit,
    pendingBalance,
    vendidoMes,
    proyectosMes,
    ticket,
    cobradoPorMes,
    funnel,
    enNegociacion,
    negociacion: negociacion.length,
    negociacionSinValor,
    conversion,
    decididos,
    leadsPorMes,
    leadsMes,
    origen,
    servicios,
    activos: activos.length,
    conAlive,
    conCliente,
    enPausa,
    fueraDePlazo,
    aTiempoPct,
    aTiempoN: aTiempo.length,
    esperaPromedio,
    priorities,
    monthLabel: MONTHS[now.getMonth()],
    prevLabel: MONTHS[prev.getMonth()],
    year: now.getFullYear(),
  };
}
