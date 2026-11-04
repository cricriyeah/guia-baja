// «<» escapado: un texto del admin con «</script>» no puede cerrar la etiqueta.
export function JsonLd({ datos }: { datos: object }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(datos).replace(/</g, '\\u003c') }} />
}
