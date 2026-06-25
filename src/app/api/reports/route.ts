import { NextResponse } from "next/server";
import { createReport, getReports } from "@/lib/reports";

export async function GET() {
  try {
    const reports = await getReports();
    return NextResponse.json({ reports });
  } catch {
    return NextResponse.json(
      { error: "No se pudieron cargar los registros." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;

    const report = await createReport({
      firstName: String(body.firstName ?? ""),
      lastName: String(body.lastName ?? ""),
      documentId: String(body.documentId ?? ""),
      age: String(body.age ?? ""),
      gender: String(body.gender ?? "Sin especificar"),
      lastSeen: String(body.lastSeen ?? ""),
      description: String(body.description ?? ""),
      photoUrl: String(body.photoUrl ?? ""),
      contactName: String(body.contactName ?? ""),
      contactPhone: String(body.contactPhone ?? ""),
    });

    return NextResponse.json({ report }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo guardar el registro.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
