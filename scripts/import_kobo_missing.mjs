import fs from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";

const rootDir = path.resolve(process.cwd());
const envPath = path.join(rootDir, ".env.local");
const dataArg = process.argv[2];
const dataPath = dataArg
  ? path.resolve(rootDir, dataArg)
  : path.join(rootDir, "data", "kobo-missing-people-clean.json");

function parseEnv(source) {
  const values = {};
  for (const line of source.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;
    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim();
    values[key] = value;
  }
  return values;
}

function normalizeText(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

function dedupeKey(item) {
  return [
    normalizeText(item.firstName).toLowerCase(),
    normalizeText(item.lastName).toLowerCase(),
    normalizeText(item.documentId).replace(/\D/g, ""),
    normalizeText(item.contactPhone).replace(/\D/g, ""),
  ].join("|");
}

async function main() {
  const envSource = await fs.readFile(envPath, "utf8");
  const env = parseEnv(envSource);

  if (!env.DATABASE_URL) {
    throw new Error("DATABASE_URL no esta definido en .env.local");
  }

  const raw = JSON.parse(await fs.readFile(dataPath, "utf8"));
  const input = raw.filter(
    (item) =>
      normalizeText(item.firstName) &&
      normalizeText(item.lastName) &&
      normalizeText(item.lastSeen) &&
      normalizeText(item.contactPhone)
  );

  const uniqueInput = [];
  const seen = new Set();
  for (const item of input) {
    const key = dedupeKey(item);
    if (seen.has(key)) continue;
    seen.add(key);
    uniqueInput.push(item);
  }

  const sql = postgres(env.DATABASE_URL, { ssl: "require" });

  try {
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

    const existing = await sql`
      select
        first_name,
        last_name,
        coalesce(document_id, '') as document_id,
        contact_phone
      from missing_people_reports
    `;

    const existingKeys = new Set(
      existing.map((row) =>
        [
          normalizeText(row.first_name).toLowerCase(),
          normalizeText(row.last_name).toLowerCase(),
          normalizeText(row.document_id).replace(/\D/g, ""),
          normalizeText(row.contact_phone).replace(/\D/g, ""),
        ].join("|")
      )
    );

    let inserted = 0;
    let skipped = 0;

    for (const item of uniqueInput) {
      const key = dedupeKey(item);
      if (existingKeys.has(key)) {
        skipped += 1;
        continue;
      }

      await sql`
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
          contact_phone,
          status
        ) values (
          ${normalizeText(item.firstName)},
          ${normalizeText(item.lastName)},
          ${normalizeText(item.documentId) || null},
          ${normalizeText(item.age) || null},
          ${normalizeText(item.gender) || "Sin especificar"},
          ${normalizeText(item.lastSeen)},
          ${normalizeText(item.description) || null},
          ${normalizeText(item.photoUrl) || null},
          ${normalizeText(item.contactName) || "Contacto del reporte"},
          ${normalizeText(item.contactPhone)},
          ${"buscando"}
        )
      `;

      existingKeys.add(key);
      inserted += 1;
    }

    const [{ total }] = await sql`
      select count(*)::int as total
      from missing_people_reports
    `;

    console.log(
      JSON.stringify(
        {
          sourceRecords: raw.length,
          validRecords: input.length,
          uniqueValidRecords: uniqueInput.length,
          inserted,
          skipped,
          totalReports: total,
        },
        null,
        2
      )
    );
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
