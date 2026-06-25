import { NextResponse } from "next/server";
import { updateReportStatus } from "@/lib/reports";
import { PersonStatus } from "@/lib/report-types";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as { status?: PersonStatus };
    const numericId = Number(id);

    if (!Number.isFinite(numericId)) {
      throw new Error("Id invalido.");
    }

    if (
      body.status !== "buscando" &&
      body.status !== "en_verificacion" &&
      body.status !== "encontrada"
    ) {
      throw new Error("Estado invalido.");
    }

    const report = await updateReportStatus(numericId, body.status);
    return NextResponse.json({ report });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo actualizar el registro.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
