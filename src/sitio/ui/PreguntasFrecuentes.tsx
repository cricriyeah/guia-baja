// Lista de preguntas (bloque del artículo y ficha del lugar). El FAQPage lo pone quien la usa.
export function PreguntasFrecuentes({ preguntas, etiqueta }: { preguntas: { pregunta: string; respuesta: string }[]; etiqueta: string }) {
  if (!preguntas.length) return null
  return (
    <div className="faq" aria-label={etiqueta}>
      {preguntas.map((p, i) => (
        <details key={i}>
          <summary>{p.pregunta}</summary>
          <div className="faq__resp"><p>{p.respuesta}</p></div>
        </details>
      ))}
    </div>
  )
}
