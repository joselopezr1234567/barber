/**
 * Terminología por rubro (vertical de negocio).
 * Permite que toda la app llame a las cosas por su nombre según el rubro
 * del local: barbero/profesional, cita/turno/consulta/sesión, etc.
 *
 * Uso:
 *   import { RUBROS, termsFor } from "@/lib/verticals";
 *   const t = termsFor(branch.vertical); // branch.vertical = "BARBERIA" | ...
 *   t.worker;   // "Barbero" | "Estilista" | "Profesional" | ...
 *   t.appointment; // "Cita" | "Turno" | "Consulta" | "Sesión" | ...
 */

export type Rubro =
  | "BARBERIA"
  | "PELUQUERIA"
  | "CENTRO_MEDICO"
  | "ODONTOLOGIA"
  | "PSICOLOGIA"
  | "FISIOTERAPIA"
  | "NUTRICION"
  | "SPA"
  | "UNAS"
  | "MAQUILLAJE"
  | "TATUAJES"
  | "PILATES"
  | "GIMNASIO"
  | "YOGA"
  | "BOXEO"
  | "DANZA"
  | "MUSICA"
  | "IDIOMAS"
  | "OPTICA"
  | "VETERINARIA"
  | "ESTETICA"
  | "MASAJES"
  | "TALLER_AUTOS"
  | "MANICURE";

export type Terms = {
  label: string;
  emoji: string;
  /** El profesional que atiende: barbero, estilista, médico... */
  worker: string;
  /** Plural del profesional. */
  workers: string;
  /** La unidad de agenda: cita, turno, consulta, sesión... */
  appointment: string;
  /** Plural. */
  appointments: string;
  /** El cliente que reserva: cliente, paciente, alumno... */
  client: string;
  /** El local físico: sucursal, sede, consultorio, estudio... */
  branch: string;
  /** El servicio que se presta. */
  service: string;
};

const DEFAULT_TERMS: Terms = {
  label: "Negocio",
  emoji: "🏪",
  worker: "Profesional",
  workers: "Profesionales",
  appointment: "Cita",
  appointments: "Citas",
  client: "Cliente",
  branch: "Sucursal",
  service: "Servicio",
};

export const RUBROS: Record<Rubro, Terms> = {
  BARBERIA: { label: "Barbería", emoji: "💈", worker: "Barbero", workers: "Barberos", appointment: "Cita", appointments: "Citas", client: "Cliente", branch: "Sucursal", service: "Servicio" },
  PELUQUERIA: { label: "Peluquería", emoji: "✂️", worker: "Estilista", workers: "Estilistas", appointment: "Turno", appointments: "Turnos", client: "Cliente", branch: "Sucursal", service: "Servicio" },
  CENTRO_MEDICO: { label: "Centro médico", emoji: "🏥", worker: "Médico", workers: "Médicos", appointment: "Consulta", appointments: "Consultas", client: "Paciente", branch: "Consultorio", service: "Consulta" },
  ODONTOLOGIA: { label: "Clínica dental", emoji: "🦷", worker: "Dentista", workers: "Dentistas", appointment: "Consulta", appointments: "Consultas", client: "Paciente", branch: "Consultorio", service: "Tratamiento" },
  PSICOLOGIA: { label: "Consult psicológico", emoji: "🧠", worker: "Psicólogo", workers: "Psicólogos", appointment: "Sesión", appointments: "Sesiones", client: "Paciente", branch: "Consultorio", service: "Sesión" },
  FISIOTERAPIA: { label: "Fisioterapia", emoji: "🦴", worker: "Fisioterapeuta", workers: "Fisioterapeutas", appointment: "Sesión", appointments: "Sesiones", client: "Paciente", branch: "Consultorio", service: "Sesión" },
  NUTRICION: { label: "Nutrición", emoji: "🥗", worker: "Nutricionista", workers: "Nutricionistas", appointment: "Consulta", appointments: "Consultas", client: "Paciente", branch: "Consultorio", service: "Consulta" },
  SPA: { label: "Spa", emoji: "🧖", worker: "Terapeuta", workers: "Terapeutas", appointment: "Sesión", appointments: "Sesiones", client: "Cliente", branch: "Sucursal", service: "Tratamiento" },
  UNAS: { label: "Estudio de uñas", emoji: "💅", worker: "Manicurista", workers: "Manicuristas", appointment: "Cita", appointments: "Citas", client: "Cliente", branch: "Sucursal", service: "Servicio" },
  MAQUILLAJE: { label: "Maquillaje", emoji: "💄", worker: "Maquillador", workers: "Maquilladores", appointment: "Cita", appointments: "Citas", client: "Cliente", branch: "Estudio", service: "Servicio" },
  TATUAJES: { label: "Estudio de tatuajes", emoji: "🖋️", worker: "Tatuador", workers: "Tatuadores", appointment: "Sesión", appointments: "Sesiones", client: "Cliente", branch: "Estudio", service: "Diseño" },
  PILATES: { label: "Centro de pilates", emoji: "🧘", worker: "Instructor", workers: "Instructores", appointment: "Clase", appointments: "Clases", client: "Alumno", branch: "Estudio", service: "Clase" },
  GIMNASIO: { label: "Gimnasio", emoji: "🏋️", worker: "Entrenador", workers: "Entrenadores", appointment: "Sesión", appointments: "Sesiones", client: "Socio", branch: "Sede", service: "Sesión" },
  YOGA: { label: "Estudio de yoga", emoji: "🧘‍♀️", worker: "Instructor", workers: "Instructores", appointment: "Clase", appointments: "Clases", client: "Alumno", branch: "Estudio", service: "Clase" },
  BOXEO: { label: "Gimnasio de boxeo", emoji: "🥊", worker: "Coach", workers: "Coaches", appointment: "Sesión", appointments: "Sesiones", client: "Alumno", branch: "Sede", service: "Sesión" },
  DANZA: { label: "Escuela de danza", emoji: "💃", worker: "Profesor", workers: "Profesores", appointment: "Clase", appointments: "Clases", client: "Alumno", branch: "Estudio", service: "Clase" },
  MUSICA: { label: "Escuela de música", emoji: "🎸", worker: "Profesor", workers: "Profesores", appointment: "Clase", appointments: "Clases", client: "Alumno", branch: "Estudio", service: "Clase" },
  IDIOMAS: { label: "Academia de idiomas", emoji: "🗣️", worker: "Profesor", workers: "Profesores", appointment: "Clase", appointments: "Clases", client: "Alumno", branch: "Sede", service: "Clase" },
  OPTICA: { label: "Óptica", emoji: "👓", worker: "Optómetra", workers: "Optómetras", appointment: "Cita", appointments: "Citas", client: "Cliente", branch: "Sucursal", service: "Servicio" },
  VETERINARIA: { label: "Veterinaria", emoji: "🐶", worker: "Veterinario", workers: "Veterinarios", appointment: "Consulta", appointments: "Consultas", client: "Dueño", branch: "Clínica", service: "Consulta" },
  ESTETICA: { label: "Centro de estética", emoji: "🧖‍♀️", worker: "Esteticista", workers: "Esteticistas", appointment: "Cita", appointments: "Citas", client: "Cliente", branch: "Sucursal", service: "Tratamiento" },
  MASAJES: { label: "Centro de masajes", emoji: "💆", worker: "Masajista", workers: "Masajistas", appointment: "Sesión", appointments: "Sesiones", client: "Cliente", branch: "Sucursal", service: "Sesión" },
  TALLER_AUTOS: { label: "Taller mecánico", emoji: "🔧", worker: "Mecánico", workers: "Mecánicos", appointment: "Turno", appointments: "Turnos", client: "Cliente", branch: "Taller", service: "Servicio" },
  MANICURE: { label: "Manicure y pedicure", emoji: "💅", worker: "Manicurista", workers: "Manicuristas", appointment: "Cita", appointments: "Citas", client: "Cliente", branch: "Sucursal", service: "Servicio" },
};

/** Devuelve la terminología para un rubro (con fallback por defecto). */
export function termsFor(rubro: string | null | undefined): Terms {
  const key = (rubro ?? "") as Rubro;
  return RUBROS[key] ?? DEFAULT_TERMS;
}

/** Lista de rubros para selects (value + label). */
export const RUBRO_OPTIONS = (Object.keys(RUBROS) as Rubro[]).map((r) => ({
  value: r,
  label: `${RUBROS[r].emoji} ${RUBROS[r].label}`,
}));
