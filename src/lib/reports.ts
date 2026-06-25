import { sql } from "./db";
import { PersonStatus, ReportInput, ReportRecord } from "./report-types";

type ReportRow = {
  id: number;
  first_name: string;
  last_name: string;
  document_id: string | null;
  age: string | null;
  gender: string;
  last_seen: string;
  description: string | null;
  photo_url: string | null;
  contact_name: string;
  contact_phone: string;
  status: PersonStatus;
  created_at: Date;
};

async function ensureSchema() {
  await sql`
    create table if not exists missing_people_reports (
      id serial primary key,
      first_name text not null,
      last_name text not null,
      document_id text,
      age text,
      gender text not null default 'Sin especificar',
      last_seen text not null,
      description text,
      photo_url text,
      contact_name text not null,
      contact_phone text not null,
      status text not null default 'buscando',
      created_at timestamptz not null default now()
    )
  `;

  await sql`
    alter table missing_people_reports
    add column if not exists photo_url text
  `;
}

function formatRow(row: ReportRow): ReportRecord {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    documentId: row.document_id ?? "",
    age: row.age ?? "",
    gender: row.gender,
    lastSeen: row.last_seen,
    description: row.description ?? "",
    photoUrl: row.photo_url ?? "",
    contactName: row.contact_name,
    contactPhone: row.contact_phone,
    status: row.status,
    createdAt: row.created_at.toLocaleString("es-VE", {
      dateStyle: "short",
      timeStyle: "short",
    }),
  };
}

function validateReport(input: ReportInput) {
  if (!input.firstName.trim() || !input.lastName.trim()) {
    throw new Error("Nombre y apellido son obligatorios.");
  }

  if (!input.lastSeen.trim()) {
    throw new Error("El ultimo lugar visto es obligatorio.");
  }

  if (!input.contactName.trim() || !input.contactPhone.trim()) {
    throw new Error("Los datos de contacto son obligatorios.");
  }
}

function ensureDatabaseUrl() {
  if (!process.env.DATABASE_URL) {
    throw new Error("Falta configurar DATABASE_URL en .env.local.");
  }
}

export async function getReports() {
  ensureDatabaseUrl();
  await ensureSchema();

  const rows = await sql<ReportRow[]>`
    select
      id,
      first_name,
      last_name,
      document_id,
      age,
      gender,
      last_seen,
      description,
      photo_url,
      contact_name,
      contact_phone,
      status,
      created_at
    from missing_people_reports
    order by created_at desc
  `;

  return rows.map(formatRow);
}

export async function createReport(input: ReportInput) {
  ensureDatabaseUrl();
  validateReport(input);
  await ensureSchema();

  const rows = await sql<ReportRow[]>`
    insert into missing_people_reports (
      first_name,
      last_name,
      document_id,
      age,
      gender,
      last_seen,
      description,
      photo_url,
      contact_name,
      contact_phone
    ) values (
      ${input.firstName.trim()},
      ${input.lastName.trim()},
      ${input.documentId.trim() || null},
      ${input.age.trim() || null},
      ${input.gender.trim() || "Sin especificar"},
      ${input.lastSeen.trim()},
      ${input.description.trim() || null},
      ${input.photoUrl.trim() || null},
      ${input.contactName.trim()},
      ${input.contactPhone.trim()}
    )
    returning
      id,
      first_name,
      last_name,
      document_id,
      age,
      gender,
      last_seen,
      description,
      photo_url,
      contact_name,
      contact_phone,
      status,
      created_at
  `;

  return formatRow(rows[0]);
}

export async function updateReportStatus(
  id: number,
  status: PersonStatus
) {
  ensureDatabaseUrl();
  await ensureSchema();

  const rows = await sql<ReportRow[]>`
    update missing_people_reports
    set status = ${status}
    where id = ${id}
    returning
      id,
      first_name,
      last_name,
      document_id,
      age,
      gender,
      last_seen,
      description,
      photo_url,
      contact_name,
      contact_phone,
      status,
      created_at
  `;

  if (rows.length === 0) {
    throw new Error("No se encontro el registro.");
  }

  return formatRow(rows[0]);
}
