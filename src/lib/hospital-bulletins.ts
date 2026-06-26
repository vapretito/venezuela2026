export type HospitalBulletinFatality = {
  num: string;
  name: string;
  age: string;
  documentId: string;
  origin: string;
  status: string;
};

export type HospitalBulletin = {
  slug: string;
  hospital: string;
  sourceLabel: string;
  updatedAt: string;
  totalReported: number;
  listedInjuredCount: number;
  listedDeceasedCount: number;
  summaryWarning: string;
  notes: string[];
  fatalities: HospitalBulletinFatality[];
};

export const hospitalBulletins: HospitalBulletin[] = [
  {
    slug: "huc-24-06-26",
    hospital: "Hospital Universitario de Caracas (HUC)",
    sourceLabel: "Reporte HUC 24-06-26",
    updatedAt: "24/06/2026",
    totalReported: 71,
    listedInjuredCount: 68,
    listedDeceasedCount: 3,
    summaryWarning:
      "El PDF muestra un resumen final con un numero inconsistente para heridos/dados de alta. Para evitar subestimar casos, aqui se prioriza el conteo nominal del listado: 68 lesionados mas 3 fallecidos.",
    notes: [
      "Documento hospitalario recibido por separado del consolidado general.",
      "Los fallecidos y lesionados de este boletin fueron organizados aparte para que se distingan claramente del registro ciudadano.",
      "Si un nombre aparece tanto aqui como en el consolidado, se debe tratar como una referencia hospitalaria del mismo evento.",
    ],
    fatalities: [
      {
        num: "1",
        name: "Maria Mosquera",
        age: "18",
        documentId: "",
        origin: "La Guaira",
        status: "Fallecio al ingreso",
      },
      {
        num: "2",
        name: "Lia Silva",
        age: "4",
        documentId: "",
        origin: "La Guaira",
        status: "Fallecido",
      },
      {
        num: "3",
        name: "Marisa Morales",
        age: "18",
        documentId: "32809709",
        origin: "La Guaira",
        status: "Fallecido",
      },
    ],
  },
];
