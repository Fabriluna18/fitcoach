import useContador from '../hooks/useContador';
import Sparkline from './Sparkline';

export default function StatCard({
  icono, color, valor, sufijo = '', etiqueta, serie, colorLinea, enPuntos = false, indice = 0,
}) {
  const numero = useContador(valor);
  const actual = serie[serie.length - 1];
  const previo = serie.length > 1 ? serie[serie.length - 2] : 0;

  let texto = null;
  let tono = 'neutro';

  if (enPuntos) {
    const d = actual - previo;
    if (d !== 0) {
      texto = d > 0 ? `↑ +${d} pts vs. mes anterior` : `↓ ${Math.abs(d)} pts vs. mes anterior`;
      tono = d > 0 ? 'sube' : 'baja';
    }
  } else if (previo > 0) {
    const pct = Math.round(((actual - previo) / previo) * 100);
    if (pct !== 0) {
      texto = `${pct > 0 ? '↑' : '↓'} ${Math.abs(pct)}% vs. mes anterior`;
      tono = pct > 0 ? 'sube' : 'baja';
    }
  } else if (actual > 0) {
    texto = `↑ +${actual} vs. mes anterior`;
    tono = 'sube';
  }
  if (!texto) texto = 'Sin cambios vs. mes anterior';

  return (
    <div className="stat" style={{ '--i': indice }}>
      <div className="stat-cabecera">
        <div className={`icono ${color}`}>{icono}</div>
        <div>
          <div className="numero">{numero}{sufijo}</div>
          <div className="etiqueta">{etiqueta}</div>
        </div>
      </div>
      <div className={`cambio ${tono}`}>{texto}</div>
      <Sparkline datos={serie} color={colorLinea} />
    </div>
  );
}