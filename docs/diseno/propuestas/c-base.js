// Comportamiento común de la propuesta C. Expone window.Guia con utilidades de hora de La Paz.
(() => {
  document.documentElement.classList.add('js');
  const ZONA = 'America/Mazatlan';
  const reducido = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  // ---------- Hora de La Paz ----------
  const partes = (d = new Date()) => Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: ZONA, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(d).map((p) => [p.type, p.value]));
  const CORTOS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  // Los mismos valores que el select «dia» de Lugares.horario en el backoffice.
  const DIAS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
  const NOMBRES = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
  const ahora = () => { const p = partes(); return { min: +p.hour * 60 + +p.minute, dia: CORTOS.indexOf(p.weekday) }; }; // dia: 0 = lunes
  const duracion = (min) => { min = Math.max(0, Math.round(min)); const h = Math.floor(min / 60), m = min % 60; return h ? (m ? `${h} h ${m} min` : `${h} h`) : `${m} min`; };
  const hhmm = (min) => { min = ((min % 1440) + 1440) % 1440; const h = Math.floor(min / 60), m = min % 60; return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'a. m.' : 'p. m.'}`; };
  const aMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };

  // horario: filas del backoffice [{ dia: 'martes', abre: '08:00', cierra: '18:00' }, …].
  // Un día puede tener varios tramos; si cierra ≤ abre, el tramo pasa de medianoche.
  // Sin filas no se sabe el horario: devuelve null y no se muestra nada.
  function estado(horario) {
    if (!Array.isArray(horario) || !horario.length) return null;
    const { min, dia } = ahora();
    const tramos = horario.map((f) => { const a = aMin(f.abre), c = aMin(f.cierra); return { d: DIAS.indexOf(f.dia), a, c: c <= a ? c + 1440 : c }; });
    // Abierto: tramo de hoy, o tramo de ayer que pasó de medianoche
    for (const t of tramos) {
      const inicio = t.d === dia ? t.a : t.d === (dia + 6) % 7 ? t.a - 1440 : null;
      if (inicio === null) continue;
      const fin = inicio + (t.c - t.a);
      if (min >= inicio && min < fin) {
        const falta = fin - min;
        return { abierto: true, texto: falta <= 60 ? `Cierra en ${duracion(falta)}` : `Abierto · cierra a las ${hhmm(fin)}` };
      }
    }
    // Cerrado: la próxima apertura
    for (let i = 0; i <= 7; i++) {
      const d = (dia + i) % 7;
      const hoy = tramos.filter((t) => t.d === d && (i > 0 || t.a > min)).sort((x, y) => x.a - y.a)[0];
      if (hoy) {
        const cuando = i === 0 ? '' : i === 1 ? 'mañana ' : `el ${NOMBRES[d]} `;
        return { abierto: false, texto: `Cerrado · abre ${cuando}a las ${hhmm(hoy.a)}` };
      }
    }
    return { abierto: false, texto: 'Cerrado' };
  }

  // Distancia en línea recta (km) entre dos coordenadas; la zona tiene las suyas en el backoffice.
  function km(a, b) {
    const r = Math.PI / 180, R = 6371;
    const dLat = (b[0] - a[0]) * r, dLon = (b[1] - a[1]) * r;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin(dLon / 2) ** 2;
    return Math.round(2 * R * Math.asin(Math.sqrt(h)));
  }

  window.Guia = { reducido, ahora, duracion, hhmm, estado, km, DIAS, NOMBRES, aMin };

  // ---------- Cabecera de la Guía y pie del sitio de reservas ----------
  // Cabecera (derivación PFD): sello de marca, zonas, búsqueda, idioma y un puente a reservas que nombra su
  // destino y conoce la zona. El pie es el mismo del sitio de reservas (site-footer.tsx). Links al sitio: <a>.
  const ZONAS = [['Toda la Baja', 'c-portada.html', 'portada'], ['La Paz', 'c-portal.html', 'la-paz'], ['La Ventana', '#', 'la-ventana'], ['Puerto Chale', '#', 'puerto-chale']];
  const NOMBRE_ZONA = { 'la-paz': 'La Paz', 'la-ventana': 'La Ventana', 'puerto-chale': 'Puerto Chale' };
  const LUPA = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>';
  // Sugerencias de ejemplo; en F3 salen del índice de búsqueda por idioma.
  const SUGERENCIAS = [
    ['Zonas', [['La Paz', 'c-portal.html', 'Zona'], ['La Ventana', '#', 'Zona'], ['Puerto Chale', '#', 'Zona']]],
    ['Categorías', [['Playas', 'c-categoria.html', 'Categoría'], ['Restaurantes', '#', 'Categoría'], ['Paseos en lancha', '#', 'Categoría']]],
    ['Lugares y eventos', [['Playa Balandra', 'c-ficha.html', 'La Paz'], ['Noche de museo', 'c-evento.html', 'Evento · La Paz'], ['Pescado del día', 'c-articulo.html', 'Artículo']]],
  ];
  const listaSugerencias = (filtro = '') => SUGERENCIAS.map(([grupo, items]) => {
    const f = items.filter(([n]) => n.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').includes(filtro.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')));
    return f.length ? `<p>${grupo}</p>${f.map(([n, h, t]) => `<a href="${h}">${n}<span>${t}</span></a>`).join('')}` : '';
  }).join('') || '<p>Sin resultados</p>';
  function cabecera(actual) {
    const zonas = ZONAS.map(([n, h, id]) => `<a class="zona" href="${h}"${id === actual ? ' aria-current="page"' : ''}>${n}</a>`).join('');
    const nombre = NOMBRE_ZONA[actual];
    const destino = nombre ? `Tours en ${nombre}` : 'Tours en la Baja';
    return `
<header class="guia-cab" id="guia-cab">
  <div class="ancho guia-cab__fila">
    <a class="sello" href="c-portada.html" aria-label="Guía de la Baja, de Sun Baja"><img src="../recursos/logos/logosm.svg" width="36" height="36" alt=""><span class="sello__txt" aria-hidden="true"><small>Sun Baja</small><b>Guía de la Baja</b></span></a>
    <nav class="guia-cab__zonas" aria-label="Zonas">${zonas}</nav>
    <div class="guia-cab__der">
      <form class="busca" role="search" action="c-busqueda.html">${LUPA}<label class="solo-lector" for="q">Buscar en la Guía</label><input id="q" type="search" name="q" placeholder="Buscar en la Guía" autocomplete="off"><div class="sugerencias" id="sugerencias">${listaSugerencias()}</div></form>
      <button class="busca-movil presionable" type="button" id="abrir-busqueda" aria-label="Buscar en la Guía">${LUPA}</button>
      <div class="idiomas" role="group" aria-label="Idioma"><a href="#" aria-current="true" lang="es">ES</a><a href="#" lang="en" hreflang="en">EN</a></div>
      <a class="puente presionable" href="#?desde=guia&amp;pieza=cabecera"><span class="puente__largo">${destino}</span><span class="puente__corto">Tours</span><span aria-hidden="true">→</span></a>
    </div>
  </div>
  <div class="guia-cab__zonas-movil"><div><nav class="ancho guia-cab__zonas" aria-label="Zonas">${zonas}</nav></div></div>
</header>
<div class="busqueda" id="busqueda" role="dialog" aria-modal="true" aria-label="Buscar en la Guía">
  <div class="busqueda__cabeza"><label>${LUPA}<span class="solo-lector">Buscar</span><input type="search" id="q-movil" placeholder="Playas, tacos, eventos…" autocomplete="off"></label><button type="button" id="cerrar-busqueda">Cancelar</button></div>
  <div class="busqueda__cuerpo"><div class="sugerencias" id="sugerencias-movil">${listaSugerencias()}</div></div>
</div>`;
  }
  const pie = () => `
<footer class="pie-sb" id="contacto">
  <div class="pie-sb__dentro">
    <div class="pie-sb__rejilla">
      <div class="pie-sb__grupo">
        <h2>Sal al mar con la gente de Baja Sur</h2>
        <a class="pie-sb__boton" href="#">Reserva ahora</a>
        <nav aria-label="Explora"><ul class="pie-sb__enlaces"><li><a class="enlace" href="#">Mapa</a></li><li><a class="enlace" href="#">Sedes</a></li><li><a class="enlace" href="#">Cómo funciona</a></li><li><a class="enlace" href="#">Empresas</a></li><li><a class="enlace" href="#">Sobre nosotros</a></li></ul></nav>
      </div>
      <div class="pie-sb__grupo">
        <h3>Atención al cliente</h3>
        <a class="pie-sb__boton" href="#" target="_blank" rel="noopener"><svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M187.58,144.84l-32-16a8,8,0,0,0-8,.5l-14.69,9.8a40.55,40.55,0,0,1-16-16l9.8-14.69a8,8,0,0,0,.5-8l-16-32A8,8,0,0,0,104,64a40,40,0,0,0-40,40,88.1,88.1,0,0,0,88,88,40,40,0,0,0,40-40A8,8,0,0,0,187.58,144.84ZM128,24A104,104,0,0,0,36.18,176.88L24.83,210.93a16,16,0,0,0,20.24,20.24l34.05-11.35A104,104,0,1,0,128,24Z"/></svg>Escríbenos por WhatsApp</a>
        <p style="margin-top:8px">La Paz, BCS: C. Toronja 561, Indeco, Donceles 28, 23070</p>
      </div>
      <div class="pie-sb__grupo">
        <h3>Formas de pago</h3>
        <ul class="pie-sb__pagos"><li><img src="../recursos/pagos/visa.svg" alt="Visa"></li><li><img src="../recursos/pagos/mastercard.svg" alt="Mastercard"></li><li><img src="../recursos/pagos/amex.svg" alt="American Express"></li><li class="pie-sb__efectivo">Efectivo</li></ul>
        <p style="max-width:28ch">Tarjetas de crédito y débito. Efectivo, para el resto el día del viaje.</p>
      </div>
      <nav class="pie-sb__legal" aria-label="Información legal">
        <h3>Información legal</h3>
        <a class="enlace" href="#">Deslinde de responsabilidad</a>
        <a class="enlace" href="#">Aviso de privacidad</a>
        <a class="enlace" href="c-privacidad.html">Aviso de privacidad de la Guía</a>
      </nav>
    </div>
    <div class="pie-sb__logo" role="img" aria-label="Sun Baja Experience" id="logo-pie"><img class="logo-isotipo" src="../recursos/logos/logolg-isotipo.svg" alt=""><img class="logo-letras" src="../recursos/logos/logolg-letras.svg" alt=""></div>
    <div class="pie-sb__final"><span>Sun Baja Experience. Todos los derechos reservados.</span><span>Diseñado y desarrollado por <strong>crwncode studios</strong></span></div>
  </div>
</footer>`;

  addEventListener('DOMContentLoaded', () => {
    const c = document.querySelector('[data-cabecera]');
    if (c) c.outerHTML = cabecera(c.dataset.cabecera);
    const p = document.querySelector('[data-pie]');
    if (p) p.outerHTML = pie();
    const cab = document.getElementById('guia-cab');
    if (cab) {
      // Alto de la cabecera para lo que se pega debajo; borde al bajar; zonas del celular se esconden al bajar
      const medir = () => document.documentElement.style.setProperty('--cabecera', cab.offsetHeight + 'px');
      medir(); addEventListener('resize', medir);
      cab.querySelector('.guia-cab__zonas-movil')?.addEventListener('transitionend', medir);
      let ultimo = scrollY;
      addEventListener('scroll', () => {
        const y = scrollY;
        cab.classList.toggle('con-borde', y > 4);
        if (y > ultimo + 6 && y > 120) cab.classList.add('compacta');
        else if (y < ultimo - 6 || y < 120) cab.classList.remove('compacta');
        ultimo = y;
      }, { passive: true });
      // Búsqueda: sugerencias mientras se escribe
      const q = document.getElementById('q');
      q.addEventListener('input', () => { document.getElementById('sugerencias').innerHTML = listaSugerencias(q.value); });
      const hoja = document.getElementById('busqueda'), qm = document.getElementById('q-movil');
      qm.addEventListener('input', () => { document.getElementById('sugerencias-movil').innerHTML = listaSugerencias(qm.value); });
      qm.addEventListener('keydown', (e) => { if (e.key === 'Enter' && qm.value.trim()) location.href = `c-busqueda.html?q=${encodeURIComponent(qm.value.trim())}`; });
      const cerrarBusqueda = () => { hoja.classList.remove('abierta'); document.body.style.overflow = ''; document.getElementById('abrir-busqueda').focus(); };
      document.getElementById('abrir-busqueda').addEventListener('click', () => { hoja.classList.add('abierta'); document.body.style.overflow = 'hidden'; setTimeout(() => qm.focus(), 60); });
      document.getElementById('cerrar-busqueda').addEventListener('click', cerrarBusqueda);
      addEventListener('keydown', (e) => { if (e.key === 'Escape' && hoja.classList.contains('abierta')) cerrarBusqueda(); });
    }
    // Logo del pie: donde no hay animation-timeline, se anima por tiempo al verse (como LogoPie)
    const logo = document.getElementById('logo-pie');
    if (logo && !CSS.supports('animation-timeline: view()') && !reducido) {
      logo.dataset.anima = 'espera';
      const o = new IntersectionObserver(([e]) => { if (e.isIntersecting) { logo.dataset.anima = 'ya'; o.disconnect(); } }, { threshold: 0.4 });
      o.observe(logo);
    }
    $$('.riel__boton').forEach((b) => b.addEventListener('click', () => { const pista = document.getElementById(b.dataset.riel); pista.scrollBy({ left: pista.clientWidth * 0.8 * +b.dataset.dir, behavior: reducido ? 'auto' : 'smooth' }); }));
    Guia.observarEntradas();
    Guia.pintarAbiertos(); setInterval(Guia.pintarAbiertos, 30000);

    // Cifras que cuentan hasta su valor al entrar en pantalla: [data-contar]
    const contar = new IntersectionObserver((es) => es.forEach((e) => {
      if (!e.isIntersecting) return; contar.unobserve(e.target);
      const el = e.target, fin = parseInt(el.textContent, 10); if (isNaN(fin) || reducido) return;
      const t0 = performance.now(), dur = 700;
      (function paso(t) { const p = Math.min(1, (t - t0) / dur), k = 1 - Math.pow(1 - p, 3); el.textContent = Math.round(fin * k); if (p < 1) requestAnimationFrame(paso); })(t0);
    }), { threshold: 0.6 });
    setTimeout(() => $$('[data-contar]').forEach((el) => contar.observe(el)), 50);

    // Rieles en pantallas táctiles: un empujón leve la primera vez que se ven, para que se note que se deslizan
    if (matchMedia('(hover: none)').matches && !reducido) {
      const pista = new IntersectionObserver((es) => es.forEach((e) => {
        if (!e.isIntersecting) return; pista.unobserve(e.target);
        const el = e.target; if (el.scrollWidth <= el.clientWidth + 8) return;
        setTimeout(() => { el.scrollBy({ left: 48, behavior: 'smooth' }); setTimeout(() => el.scrollBy({ left: -48, behavior: 'smooth' }), 420); }, 400);
      }), { threshold: 0.7 });
      $$('.riel__pista').forEach((el) => pista.observe(el));
    }
  });

  // Confirmación breve en un botón (compartir, copiar): Guia.confirmar(boton)
  Guia.confirmar = (b) => { b.classList.add('confirmado'); setTimeout(() => b.classList.remove('confirmado'), 1400); };

  // ---------- Presión inmediata ----------
  document.addEventListener('pointerdown', (e) => {
    const el = e.target.closest('.presionable'); if (!el) return;
    el.classList.add('presionado');
    const soltar = () => { el.classList.remove('presionado'); removeEventListener('pointerup', soltar); removeEventListener('pointercancel', soltar); };
    addEventListener('pointerup', soltar); addEventListener('pointercancel', soltar);
  });
  document.addEventListener('pointermove', (e) => { if (e.buttons && Math.abs(e.movementX) + Math.abs(e.movementY) > 6) $$('.presionado').forEach((x) => x.classList.remove('presionado')); }, { passive: true });

  // ---------- Entradas escalonadas (también para lo que se agregue después) ----------
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); } }), { threshold: 0.12 });
  Guia.observarEntradas = () => $$('.entra:not([data-visto])').forEach((el) => { el.dataset.visto = '1'; io.observe(el); });

  // ---------- Insignia de apertura en vivo: [data-horario] con las filas del backoffice ----------
  Guia.pintarAbiertos = () => $$('[data-horario]').forEach((el) => {
    const s = estado(JSON.parse(el.dataset.horario));
    el.hidden = !s; if (!s) return;
    el.classList.add('abierto'); el.classList.toggle('si', s.abierto); el.classList.toggle('no', !s.abierto);
    el.textContent = el.dataset.corto !== undefined ? (s.abierto ? (s.texto.startsWith('Cierra en') ? s.texto : 'Abierto ahora') : 'Cerrado') : s.texto;
  });
})();
