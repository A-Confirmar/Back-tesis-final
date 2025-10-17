import dayjs from "dayjs";

export function obtenerDiaSemana(fechaStr) {
    const dias = ["Domingo", "Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado"];
    const d = dayjs(fechaStr);
    return dias[d.day()];
}