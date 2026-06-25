export type PersonStatus = "buscando" | "en_verificacion" | "encontrada";

export type ReportInput = {
  firstName: string;
  lastName: string;
  documentId: string;
  age: string;
  gender: string;
  lastSeen: string;
  description: string;
  photoUrl: string;
  contactName: string;
  contactPhone: string;
};

export type ReportRecord = ReportInput & {
  id: number;
  status: PersonStatus;
  createdAt: string;
};
