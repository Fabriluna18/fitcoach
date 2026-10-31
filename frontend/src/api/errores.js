export function mensajeDeError(err) {
  if (err instanceof TypeError || err instanceof SyntaxError) {
    return 'No pudimos conectarnos con el servidor. Esperá unos segundos y probá de nuevo.';
  }
  return err.message;
}