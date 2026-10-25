import { Hammer } from 'lucide-react';

export default function Proximamente({ titulo, dia }) {
  return (
    <div className="proximamente">
      <Hammer size={48} />
      <h1>{titulo}</h1>
      <p className="sub">Esta sección se arma en el Día {dia}.</p>
    </div>
  );
}