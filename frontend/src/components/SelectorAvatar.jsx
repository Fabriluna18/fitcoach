import Avatar from './Avatar';

const OPCIONES = ['hombre-1', 'hombre-2', 'hombre-3', 'mujer-1', 'mujer-2', 'mujer-3'];

export default function SelectorAvatar({ valor, onChange }) {
  return (
    <div className="selector-avatar">
      {OPCIONES.map((a) => (
        <button
          type="button" key={a} title={a}
          className={valor === a ? 'elegido' : ''}
          onClick={() => onChange(valor === a ? '' : a)}
        >
          <Avatar nombre={a} avatar={a} size={44} />
        </button>
      ))}
    </div>
  );
}