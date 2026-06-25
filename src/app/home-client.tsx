"use client";

import { PutBlobResult } from "@vercel/blob";
import { upload } from "@vercel/blob/client";
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import styles from "./page.module.css";
import { PersonStatus, ReportInput, ReportRecord } from "@/lib/report-types";

const MAX_PHOTO_SIZE_BYTES = 4 * 1024 * 1024;

const emptyForm: ReportInput = {
  firstName: "",
  lastName: "",
  documentId: "",
  age: "",
  gender: "Sin especificar",
  lastSeen: "",
  description: "",
  photoUrl: "",
  contactName: "",
  contactPhone: "",
};

const statusLabels: Record<PersonStatus, string> = {
  buscando: "Buscando",
  en_verificacion: "Verificando",
  encontrada: "Encontrada",
};

export default function HomeClient() {
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [form, setForm] = useState<ReportInput>(emptyForm);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [selectedPhotoName, setSelectedPhotoName] = useState("");
  const [photoError, setPhotoError] = useState("");
  const [updatingIds, setUpdatingIds] = useState<number[]>([]);

  useEffect(() => {
    async function loadReports() {
      try {
        const response = await fetch("/api/reports", { cache: "no-store" });
        const data = (await response.json()) as { reports?: ReportRecord[] };
        setReports(data.reports ?? []);
      } catch {
        setMessage("No se pudieron cargar los registros.");
      } finally {
        setIsLoading(false);
      }
    }

    void loadReports();
  }, []);

  const filteredReports = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return reports.filter((report) => {
      const matchesQuery =
        normalizedQuery.length === 0 ||
        `${report.firstName} ${report.lastName} ${report.documentId ?? ""} ${report.lastSeen}`
          .toLowerCase()
          .includes(normalizedQuery);

      const matchesStatus =
        statusFilter === "todos" ? true : report.status === statusFilter;

      return matchesQuery && matchesStatus;
    });
  }, [query, reports, statusFilter]);

  const totals = useMemo(
    () => ({
      total: reports.length,
      searching: reports.filter((report) => report.status !== "encontrada")
        .length,
      found: reports.filter((report) => report.status === "encontrada").length,
    }),
    [reports]
  );

  function updateField(name: keyof ReportInput, value: string) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;

    if (!file) {
      setSelectedPhoto(null);
      setSelectedPhotoName("");
      setPhotoError("");
      return;
    }

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setSelectedPhoto(null);
      setSelectedPhotoName("");
      setPhotoError("La foto debe ser JPG, PNG o WebP.");
      return;
    }

    if (file.size > MAX_PHOTO_SIZE_BYTES) {
      setSelectedPhoto(null);
      setSelectedPhotoName("");
      setPhotoError("La foto no puede pesar mas de 4 MB.");
      return;
    }

    setSelectedPhoto(file);
    setSelectedPhotoName(file.name);
    setPhotoError("");
  }

  async function uploadPhotoIfNeeded() {
    if (!selectedPhoto) {
      return "";
    }

    const safeName = selectedPhoto.name.replace(/\s+/g, "-").toLowerCase();
    const blob: PutBlobResult = await upload(safeName, selectedPhoto, {
      access: "public",
      handleUploadUrl: "/api/uploads",
    });

    return blob.url;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setMessage("");

    try {
      if (photoError) {
        throw new Error(photoError);
      }

      const photoUrl = await uploadPhotoIfNeeded();

      const response = await fetch("/api/reports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          photoUrl,
        }),
      });

      const data = (await response.json()) as {
        error?: string;
        report?: ReportRecord;
      };

      if (!response.ok || !data.report) {
        throw new Error(data.error ?? "No se pudo guardar el registro.");
      }

      const report = data.report;
      setReports((current) => [report, ...current]);
      setForm(emptyForm);
      setSelectedPhoto(null);
      setSelectedPhotoName("");
      setPhotoError("");
      setIsModalOpen(false);
      setMessage("Registro publicado correctamente.");
    } catch (error) {
      const fallback = "No se pudo guardar el registro.";
      setMessage(error instanceof Error ? error.message : fallback);
    } finally {
      setIsSaving(false);
    }
  }

  async function markAsFound(id: number) {
    setUpdatingIds((current) => [...current, id]);
    setMessage("");

    try {
      const response = await fetch(`/api/reports/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: "encontrada",
        }),
      });

      const data = (await response.json()) as {
        error?: string;
        report?: ReportRecord;
      };

      if (!response.ok || !data.report) {
        throw new Error(data.error ?? "No se pudo marcar como localizada.");
      }

      setReports((current) =>
        current.map((report) => (report.id === id ? data.report! : report))
      );
      setMessage("Registro actualizado como localizado.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudo marcar como localizada."
      );
    } finally {
      setUpdatingIds((current) => current.filter((item) => item !== id));
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.stickyNavWrap}>
          <div className={styles.stickyNav}>
            <div className={styles.navBrand}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className={styles.navFlag}
                src="/bandera/flag.avif"
                alt="Bandera de Venezuela"
              />
              <div>
                <p className={styles.eyebrow}>Venezuela Te Busca · Caracas 2026</p>
                <p className={styles.heroMiniText}>
                  Registro ciudadano de personas desaparecidas
                </p>
              </div>
            </div>
            <button
              className={styles.heroButton}
              type="button"
              onClick={() => setIsModalOpen(true)}
            >
              + Registrar persona
            </button>
          </div>
        </div>

        <div className={styles.heroInner}>
          <div className={styles.heroContentBox}>
            <h1>Registro simple para buscar personas tras el terremoto.</h1>
            <p className={styles.heroText}>
              Publica un nombre, revisa la lista y comparte informacion
              confirmada.
            </p>

            <div className={styles.heroStats}>
              <div>
                <strong>{totals.total}</strong>
                <span>Registros</span>
              </div>
              <div>
                <strong>{totals.searching}</strong>
                <span>Buscando</span>
              </div>
              <div>
                <strong>{totals.found}</strong>
                <span>Encontradas</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className={styles.main}>
        <section className={styles.filters}>
          <input
            type="search"
            placeholder="Buscar por nombre, apellido, cedula o lugar..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="todos">Todos los estados</option>
            <option value="buscando">Buscando</option>
            <option value="en_verificacion">Verificando</option>
            <option value="encontrada">Encontrada</option>
          </select>
        </section>

        {message ? <p className={styles.message}>{message}</p> : null}

        <section className={styles.content}>
          <section className={styles.listCard}>
            <div className={styles.cardHeader}>
              <p className={styles.cardEyebrow}>Lista publica</p>
              <h2>Personas registradas</h2>
              <p>
                Si tienes datos confirmados, comparte la informacion con la
                familia.
              </p>
            </div>

            {isLoading ? (
              <p className={styles.helperText}>Cargando registros...</p>
            ) : filteredReports.length === 0 ? (
              <p className={styles.helperText}>
                No hay registros todavia o no hay coincidencias con tu busqueda.
              </p>
            ) : (
              <div className={styles.reportList}>
                {filteredReports.map((report) => (
                  <article className={styles.reportItem} key={report.id}>
                    {report.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        className={styles.reportPhoto}
                        src={report.photoUrl}
                        alt={`${report.firstName} ${report.lastName}`}
                      />
                    ) : null}

                    <div className={styles.reportTop}>
                      <div>
                        <h3>
                          {report.firstName} {report.lastName}
                        </h3>
                        <p>
                          {report.age || "Edad no indicada"} · {report.gender}
                        </p>
                      </div>
                      <span
                        className={`${styles.status} ${styles[report.status]}`}
                      >
                        {statusLabels[report.status]}
                      </span>
                    </div>

                    <dl className={styles.reportMeta}>
                      <div>
                        <dt>Cedula</dt>
                        <dd>{report.documentId || "No informada"}</dd>
                      </div>
                      <div>
                        <dt>Ultimo lugar visto</dt>
                        <dd>{report.lastSeen}</dd>
                      </div>
                      <div>
                        <dt>Descripcion</dt>
                        <dd>{report.description || "Sin descripcion adicional."}</dd>
                      </div>
                      <div>
                        <dt>Contacto</dt>
                        <dd>
                          {report.contactName} ·{" "}
                          <a href={`tel:${report.contactPhone.replace(/\s+/g, "")}`}>
                            {report.contactPhone}
                          </a>
                        </dd>
                      </div>
                    </dl>

                    {report.status !== "encontrada" ? (
                      <button
                        type="button"
                        className={styles.foundButton}
                        disabled={updatingIds.includes(report.id)}
                        onClick={() => void markAsFound(report.id)}
                      >
                        {updatingIds.includes(report.id)
                          ? "Actualizando..."
                          : "Marcar como localizada"}
                      </button>
                    ) : null}
                  </article>
                ))}
              </div>
            )}
          </section>
        </section>
      </main>

      <footer className={styles.footer}>
        <p>Venezuela Te Busca · Iniciativa solidaria · Terremoto 2026</p>
        <p>Esta plataforma es gratuita y sin fines de lucro.</p>
        <p>
          Los datos publicados son responsabilidad exclusiva de quien los envia.
          Esta plataforma no verifica la informacion ni se hace responsable por
          el uso que terceros hagan de ella. Al registrar una persona o marcarla
          como encontrada, confirmas que tienes informacion directa sobre su
          situacion.
        </p>
        <p>
          Emergencias: 911 (Movistar) · 112 (Digitel) · *1 (Movilnet) · 171
          (Cantv fijo)
        </p>
      </footer>

      {isModalOpen ? (
        <div
          className={styles.modalBackdrop}
          onClick={() => setIsModalOpen(false)}
          role="presentation"
        >
          <div
            className={styles.modalCard}
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="register-title"
          >
            <div className={styles.modalHeader}>
              <div className={styles.cardHeader}>
                <p className={styles.cardEyebrow}>Registrar persona</p>
                <h2 id="register-title">Agregar un nuevo caso</h2>
                <p>
                  Completa los datos de la persona desaparecida y de quien la
                  esta buscando. Mientras mas claro, mejor.
                </p>
              </div>
              <button
                className={styles.closeButton}
                type="button"
                onClick={() => setIsModalOpen(false)}
                aria-label="Cerrar formulario"
              >
                x
              </button>
            </div>

            <form className={styles.formCard} onSubmit={handleSubmit}>
              <section className={styles.formSection}>
                <p className={styles.formSectionTitle}>
                  Foto de la persona desaparecida
                </p>
                <p className={styles.formSectionText}>
                  Importante: la foto ayuda muchisimo a identificarla
                  rapidamente. Usa JPG, PNG o WebP.
                </p>
                <label className={styles.fileUploadBox}>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handlePhotoChange}
                  />
                  <span className={styles.fileUploadTitle}>
                    {selectedPhotoName || "Seleccionar foto de la persona"}
                  </span>
                </label>
                {photoError ? (
                  <p className={styles.photoError}>{photoError}</p>
                ) : null}
              </section>

              <section className={styles.formSection}>
                <p className={styles.formSectionTitle}>
                  Datos de la persona desaparecida
                </p>
                <div className={styles.formGrid}>
                  <label>
                    Nombre *
                    <input
                      required
                      value={form.firstName}
                      onChange={(event) =>
                        updateField("firstName", event.target.value)
                      }
                    />
                  </label>
                  <label>
                    Apellido *
                    <input
                      required
                      value={form.lastName}
                      onChange={(event) =>
                        updateField("lastName", event.target.value)
                      }
                    />
                  </label>
                  <label>
                    Cedula
                    <input
                      value={form.documentId}
                      onChange={(event) =>
                        updateField("documentId", event.target.value)
                      }
                    />
                  </label>
                  <label>
                    Edad aproximada
                    <input
                      value={form.age}
                      onChange={(event) => updateField("age", event.target.value)}
                    />
                  </label>
                  <label>
                    Genero
                    <select
                      value={form.gender}
                      onChange={(event) =>
                        updateField("gender", event.target.value)
                      }
                    >
                      <option>Sin especificar</option>
                      <option>Femenino</option>
                      <option>Masculino</option>
                      <option>Otro</option>
                    </select>
                  </label>
                  <label>
                    Ultimo lugar visto *
                    <input
                      required
                      value={form.lastSeen}
                      onChange={(event) =>
                        updateField("lastSeen", event.target.value)
                      }
                    />
                  </label>
                  <label className={styles.fullWidth}>
                    Descripcion
                    <textarea
                      rows={4}
                      placeholder="Ropa, senas particulares o contexto."
                      value={form.description}
                      onChange={(event) =>
                        updateField("description", event.target.value)
                      }
                    />
                  </label>
                </div>
              </section>

              <section className={styles.formSection}>
                <p className={styles.formSectionTitle}>
                  Datos de quien reporta o esta buscando a la persona
                </p>
                <p className={styles.formSectionText}>
                  Estos datos son de la persona que hace el registro: familiar,
                  amigo, vecino o testigo. No son datos de la persona
                  desaparecida.
                </p>
                <div className={styles.formGrid}>
                  <label>
                    Nombre de quien reporta *
                    <input
                      required
                      placeholder="Ej: Maria Gonzalez, hermana"
                      value={form.contactName}
                      onChange={(event) =>
                        updateField("contactName", event.target.value)
                      }
                    />
                  </label>
                  <label>
                    Telefono de quien reporta *
                    <input
                      required
                      placeholder="Ej: +58 412 1234567"
                      value={form.contactPhone}
                      onChange={(event) =>
                        updateField("contactPhone", event.target.value)
                      }
                    />
                  </label>
                </div>
              </section>

              <button
                className={styles.primaryButton}
                type="submit"
                disabled={isSaving}
              >
                {isSaving ? "Guardando..." : "Publicar registro"}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
