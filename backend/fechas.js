const ZONA = 'America/Argentina/Buenos_Aires';

// Fecha de hoy en Argentina, como texto AAAA-MM-DD
function hoy() {
  return new Date().toLocaleDateString('en-CA', { timeZone: ZONA });
}

function sumarDias(fecha, dias) {
  const d = new Date(`${fecha}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

function diasEntre(desde, hasta) {
  return Math.round((new Date(`${hasta}T00:00:00Z`) - new Date(`${desde}T00:00:00Z`)) / 86400000);
}

function fechaValida(f) {
  return typeof f === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(f) && !Number.isNaN(Date.parse(`${f}T00:00:00Z`));
}

// activa, programada o finalizada (se calcula con las fechas, no se guarda)
function estadoDe(r, hoyStr = hoy()) {
  if (r.archivada || (r.fecha_fin && r.fecha_fin < hoyStr)) return 'finalizada';
  if (r.fecha_inicio > hoyStr) return 'programada';
  return 'activa';
}

module.exports = { hoy, sumarDias, diasEntre, fechaValida, estadoDe };