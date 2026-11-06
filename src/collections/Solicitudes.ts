import { NotFound, type CheckboxField, type CollectionBeforeChangeHook, type CollectionConfig } from 'payload'

import { campoSoloAdmin, nadie, soloPersonal } from '../acceso/reglas'
import { esAdmin } from '../acceso/roles'
import { anonimizarSolicitud } from '../solicitudes/anonimizar'

// Spec §12: «sin cambio de estado en 12 meses» se mide desde aquí; una nota interna no reinicia el plazo.
// En un update sin cambio de estado se conserva el valor guardado: así un cliente de la API no puede
// reiniciar el reloj de 12 meses enviando una fecha propia.
const marcarCambioDeEstado: CollectionBeforeChangeHook = ({ data, operation, originalDoc }) => {
  if (operation === 'create') return { ...data, estadoCambiadoEl: new Date().toISOString() }
  const cambioDeEstado = data.estado !== undefined && data.estado !== originalDoc?.estado
  return { ...data, estadoCambiadoEl: cambioDeEstado ? new Date().toISOString() : originalDoc?.estadoCambiadoEl }
}

// Solo se crean desde la Server Action de F3 (overrideAccess). El público nunca las lee (spec §6, §11).
export const Solicitudes: CollectionConfig = {
  slug: 'solicitudes',
  admin: { useAsTitle: 'negocio', defaultColumns: ['negocio', 'estado', 'zonaTexto', 'createdAt'] },
  access: { read: soloPersonal, create: nadie, update: soloPersonal, delete: soloPersonal },
  defaultSort: '-createdAt',
  hooks: { beforeChange: [marcarCambioDeEstado] },
  endpoints: [
    {
      path: '/:id/anonimizar',
      method: 'post',
      // Spec §12: una Solicitud aceptada la anonimiza un Admin cuando termina la relación.
      // El log nunca lleva datos personales: solo el id y el nombre del error.
      handler: async (req) => {
        if (!esAdmin(req.user)) return Response.json({ error: 'Solo un Admin puede anonimizar.' }, { status: 403 })
        const crudo = String(req.routeParams?.id ?? '')
        const id = Number(crudo)
        if (!/^\d+$/.test(crudo) || !Number.isSafeInteger(id)) return Response.json({ error: 'Id inválido.' }, { status: 400 })
        try {
          await anonimizarSolicitud(req.payload, id)
          return Response.json({ ok: true })
        } catch (error) {
          if (error instanceof NotFound) return Response.json({ error: 'No existe la solicitud.' }, { status: 404 })
          const nombre = error instanceof Error ? error.name : 'Desconocido'
          req.payload.logger.error({ msg: 'Falló la anonimización', id, error: nombre })
          return Response.json({ error: 'No se pudo anonimizar.' }, { status: 500 })
        }
      },
    },
  ],
  fields: [
    { name: 'negocio', type: 'text', required: true },
    { name: 'giro', type: 'text' },
    { name: 'zonaTexto', type: 'text' },
    { name: 'zona', type: 'relationship', relationTo: 'zonas' },
    { name: 'contactoNombre', type: 'text' },
    { name: 'correo', type: 'email' },
    { name: 'telefono', type: 'text' },
    { name: 'webOInstagram', type: 'text' },
    { name: 'mensaje', type: 'textarea', maxLength: 2000 },
    {
      name: 'aceptoPrivacidad',
      type: 'checkbox',
      required: true,
      validate: (v: unknown, { operation }: { operation?: string }) =>
        operation !== 'create' || v === true ? true : 'Hay que aceptar el aviso de privacidad.',
    } as CheckboxField,
    { name: 'versionAviso', type: 'text', admin: { readOnly: true } },
    { name: 'ipHash', type: 'text', admin: { hidden: true }, access: { read: campoSoloAdmin } },
    {
      name: 'estado',
      type: 'select',
      defaultValue: 'nueva',
      options: [
        { label: 'Nueva', value: 'nueva' },
        { label: 'En contacto', value: 'en-contacto' },
        { label: 'Aceptada', value: 'aceptada' },
        { label: 'Rechazada', value: 'rechazada' },
      ],
      admin: { position: 'sidebar' },
    },
    {
      name: 'estadoCambiadoEl',
      type: 'date',
      admin: { readOnly: true, position: 'sidebar', description: 'Último cambio de estado (conservación, aviso §12).' },
    },
    { name: 'notasInternas', type: 'textarea' },
    { name: 'lugarCreado', type: 'relationship', relationTo: 'lugares' },
    { name: 'anonimizadaEl', type: 'date', admin: { readOnly: true, position: 'sidebar' } },
    {
      name: 'accionAnonimizar',
      type: 'ui',
      admin: {
        position: 'sidebar',
        condition: (datos) => Boolean(datos?.id) && !datos?.anonimizadaEl,
        components: { Field: '/componentes-admin/BotonAnonimizar#BotonAnonimizar' },
      },
    },
  ],
}
