import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { apiFetch } from '../api/client';

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];
const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const TIPOS = {
  evaluacion: 'Evaluación física',
  seguimiento: 'Sesión de seguimiento',
  clase: 'Clase grupal',
  otra: 'Otra',
};

const iso = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const hoyISO = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' });
const fechaLarga = (f) => {
  const [a, m, d] = f.split('-').map(Number);
  return new Date(a, m - 1, d).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
};

// 42 celdas (6 semanas) que arrancan en lunes
function celdasDelMes(anio, mes) {
  const desfase = (new Date(anio, mes, 1).getDay() + 6) % 7;
  return Array.from({ length: 42 }, (_, i) => new Date(anio, mes, 1 - desfase + i));
}

export default function Calendario() {
  const hoy = hoyISO();
  const [anio, setAnio] = useState(Number(hoy.slice(0, 4)));
  const [mes, setMes] = useState(Number(hoy.slice(5, 7)) - 1);
  const [dia, setDia] = useState(hoy);
  const [citas, setCitas] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [form, setForm] = useState({
    titulo: '', tipo: 'evaluacion', destino: 'cliente', user_id: '', group_id: '',
    fecha: hoy, hora: '09:00', duracion: '60', notas: '',
  });
  const [choques, setChoques] = useState(null);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');

  const celdas = celdasDelMes(anio, mes);
  const desde = iso(celdas[0]);
  const hasta = iso(celdas[41]);

  const cargar = () =>
    apiFetch(`/appointments?desde=${desde}&hasta=${hasta}`).then(setCitas).catch((err) => setError(err.message));

  useEffect(() => {
    apiFetch(`/appointments?desde=${desde}&hasta=${hasta}`).then(setCitas).catch((err) => setError(err.message));
  }, [desde, hasta]);

  useEffect(() => {
    apiFetch('/clients').then(setClientes).catch((err) => setError(err.message));
    apiFetch('/groups').then(setGrupos).catch((err) => setError(err.message));
  }, []);

  const porDia = {};
  citas.forEach((c) => {
    if (!porDia[c.fecha]) porDia[c.fecha] = [];
    porDia[c.fecha].push(c);
  });

  const irMes = (delta) => {
    const d = new Date(anio, mes + delta, 1);
    setAnio(d.getFullYear());
    setMes(d.getMonth());
  };

  const elegirDia = (f) => {
    const [a, m] = f.split('-').map(Number);
    setAnio(a);
    setMes(m - 1);
    setDia(f);
    setForm((anterior) => ({ ...anterior, fecha: f }));
    setChoques(null);
  };

  const cambiar = (campo) => (e) => setForm({ ...form, [campo]: e.target.value });

  const armarCuerpo = (forzar) => {
    const cuerpo = {
      titulo: form.titulo,
      tipo: form.tipo,
      fecha: form.fecha,
      hora: form.hora,
      duracion: Number(form.duracion),
      notas: form.notas || null,
    };
    if (form.destino === 'cliente') cuerpo.user_id = Number(form.user_id);
    else cuerpo.group_id = Number(form.group_id);
    if (forzar) cuerpo.forzar = true;
    return cuerpo;
  };

  const enviar = async (forzar) => {
    setError('');
    setOk('');
    try {
      await apiFetch('/appointments', { method: 'POST', body: JSON.stringify(armarCuerpo(forzar)) });
      setChoques(null);
      setOk('Cita agendada');
      setForm({ ...form, titulo: '', notas: '' });
      setDia(form.fecha);

      const [a, m] = form.fecha.split('-').map(Number);
      if (a === anio && m - 1 === mes) {
        cargar();
      } else {
        setAnio(a);
        setMes(m - 1);
      }
    } catch (err) {
      if (err.codigo === 'CHOQUE') {
        setChoques(err.datos.choques);
        return;
      }
      setChoques(null);
      setError(err.message);
    }
  };

  const crear = (e) => {
    e.preventDefault();
    enviar(false);
  };

  const cancelar = async (id) => {
    setError('');
    setOk('');
    try {
      await apiFetch(`/appointments/${id}`, { method: 'DELETE' });
      setOk('Cita cancelada');
      cargar();
    } catch (err) {
      setError(err.message);
    }
  };

  const clientesActivos = clientes.filter((c) => c.activo);
  const delDia = porDia[dia] || [];

  return (
    <>
      <h1>Calendario</h1>
      {error && <p className="error">{error}</p>}
      {ok && <p className="ok">{ok}</p>}

      <div className="card">
        <div className="cal-cabecera">
          <h3>{MESES[mes]} {anio}</h3>
          <div className="cal-nav">
            <button onClick={() => irMes(-1)} aria-label="Mes anterior"><ChevronLeft size={18} /></button>
            <button onClick={() => elegirDia(hoy)}>Hoy</button>
            <button onClick={() => irMes(1)} aria-label="Mes siguiente"><ChevronRight size={18} /></button>
          </div>
        </div>

        <div className="cal-grilla">
          {DIAS.map((d) => (
            <div key={d} className="cal-dia-nombre">{d}</div>
          ))}
          {celdas.map((d) => {
            const f = iso(d);
            const lista = porDia[f] || [];
            const clases = ['cal-celda'];
            if (d.getMonth() !== mes) clases.push('otro');
            if (f === hoy) clases.push('hoy');
            if (f === dia) clases.push('elegido');
            return (
              <button key={f} type="button" className={clases.join(' ')} onClick={() => elegirDia(f)}>
                <span className="cal-num">{d.getDate()}</span>
                <span className="cal-chips">
                  {lista.slice(0, 2).map((c) => (
                    <span key={c.id} className={`chip tipo-${c.tipo}`}>{c.hora_inicio} {c.titulo}</span>
                  ))}
                  {lista.length > 2 && <span className="cal-mas">+{lista.length - 2} más</span>}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="card">
        <h3 style={{ textTransform: 'capitalize' }}>{fechaLarga(dia)}</h3>
        {delDia.length === 0 ? (
          <p className="sub">No hay citas este día.</p>
        ) : (
          delDia.map((c) => (
            <div className="cita-item" key={c.id}>
              <div>
                <span className="cita-hora">{c.hora_inicio} – {c.hora_fin}</span>
                <span className={`etiqueta-tipo tipo-${c.tipo}`}>{TIPOS[c.tipo]}</span>
                <div><strong>{c.titulo}</strong></div>
                <div className="sub">{c.cliente ? `Cliente: ${c.cliente}` : `Grupo: ${c.grupo}`}</div>
                {c.notas && <div className="sub">{c.notas}</div>}
              </div>
              <button className="btn-peligro con-icono" onClick={() => cancelar(c.id)}>
                <Trash2 size={14} /> Cancelar
              </button>
            </div>
          ))
        )}
      </div>

      <div className="card">
        <h3>Agendar una cita</h3>
        {(clientesActivos.length === 0 && grupos.length === 0) && (
          <p className="sub">Para agendar necesitás al menos un cliente activo o un grupo.</p>
        )}
        <form onSubmit={crear}>
          <div className="fila-form" style={{ marginBottom: 12 }}>
            <input placeholder="Título (ej: Evaluación inicial)" maxLength={100}
              value={form.titulo} onChange={cambiar('titulo')} required />
            <select value={form.tipo} onChange={cambiar('tipo')}>
              {Object.entries(TIPOS).map(([clave, nombre]) => (
                <option key={clave} value={clave}>{nombre}</option>
              ))}
            </select>
          </div>

          <div className="fila-form" style={{ marginBottom: 12 }}>
            <select value={form.destino} onChange={cambiar('destino')}>
              <option value="cliente">Con un cliente</option>
              <option value="grupo">Con un grupo</option>
            </select>
            {form.destino === 'cliente' ? (
              <select value={form.user_id} onChange={cambiar('user_id')} required>
                <option value="">Elegí un cliente...</option>
                {clientesActivos.map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            ) : (
              <select value={form.group_id} onChange={cambiar('group_id')} required>
                <option value="">Elegí un grupo...</option>
                {grupos.map((g) => (
                  <option key={g.id} value={g.id}>{g.nombre}</option>
                ))}
              </select>
            )}
          </div>

          <div className="fila-form" style={{ marginBottom: 12 }}>
            <label className="campo">
              Fecha
              <input type="date" value={form.fecha} onChange={cambiar('fecha')} required />
            </label>
            <label className="campo">
              Hora
              <input type="time" value={form.hora} onChange={cambiar('hora')} required />
            </label>
            <label className="campo">
              Duración
              <select value={form.duracion} onChange={cambiar('duracion')}>
                <option value="15">15 minutos</option>
                <option value="30">30 minutos</option>
                <option value="45">45 minutos</option>
                <option value="60">1 hora</option>
                <option value="90">1 hora y media</option>
                <option value="120">2 horas</option>
              </select>
            </label>
          </div>

          <div className="fila-form">
            <input placeholder="Notas (opcional)" maxLength={500} value={form.notas} onChange={cambiar('notas')} />
            <button className="btn" type="submit">Agendar</button>
          </div>
        </form>

        {choques && (
          <div className="aviso">
            <strong>Esta cita se pisa con:</strong>
            <ul>
              {choques.map((c, i) => (
                <li key={i}>{c.hora_inicio} – {c.hora_fin} · {c.titulo} ({c.quien})</li>
              ))}
            </ul>
            <div className="acciones">
              <button className="btn" onClick={() => enviar(true)}>Agendar igual</button>
              <button className="btn-chico" onClick={() => setChoques(null)}>Cambiar horario</button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}