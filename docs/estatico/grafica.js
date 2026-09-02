/* =========================================================================
   Motor de graficas.

   SVG generado en el navegador, sin librerias. Tres tipos:

     Grafica.linea(...)      serie temporal con banda de incertidumbre
     Grafica.barras(...)     barras verticales
     Grafica.histograma(...) distribucion

   Todas responden a raton y a dedo: al mover el puntero o arrastrar sobre
   el grafico aparece una guia vertical y un globo con el valor. En movil
   se cancela el desplazamiento de la pagina mientras se arrastra dentro
   del area del grafico.
   ========================================================================= */

const Grafica = (function () {
  "use strict";

  const NS = "http://www.w3.org/2000/svg";

  function el(nombre, atributos) {
    const n = document.createElementNS(NS, nombre);
    for (const k in atributos) n.setAttribute(k, atributos[k]);
    return n;
  }

  /* El contenido del globo se construye con nodos, no con cadenas de HTML.
     Aparte de ser mas seguro, evita el patron "datos remotos -> innerHTML"
     que las heuristicas de los antivirus marcan por parecerse a un
     redirector malicioso. */
  function globoContenido(titulo, valor, extra) {
    const frag = document.createDocumentFragment();

    const b = document.createElement("b");
    b.textContent = titulo;
    frag.appendChild(b);

    const s = document.createElement("span");
    s.textContent = valor;
    frag.appendChild(s);

    if (extra) {
      const e = document.createElement("em");
      e.textContent = extra;
      frag.appendChild(e);
    }
    return frag;
  }

  function vaciar(n) {
    while (n.firstChild) n.removeChild(n.firstChild);
  }

  function euros(v) {
    return new Intl.NumberFormat("es-ES", {
      style: "currency", currency: "EUR",
      maximumFractionDigits: v < 100 ? 2 : 0,
    }).format(v);
  }

  function numero(v, dec) {
    return new Intl.NumberFormat("es-ES", {
      minimumFractionDigits: dec === undefined ? 0 : dec,
      maximumFractionDigits: dec === undefined ? 0 : dec,
    }).format(v);
  }

  /* --- Escala logaritmica opcional, util para bitcoin --- */
  function escala(tipo) {
    return tipo === "log"
      ? { ida: (v) => Math.log10(Math.max(v, 1e-6)), vuelta: (v) => Math.pow(10, v) }
      : { ida: (v) => v, vuelta: (v) => v };
  }

  /* --- Globo de informacion compartido por todas las graficas --- */
  function crearGlobo(contenedor) {
    const g = document.createElement("div");
    g.className = "globo";
    g.setAttribute("role", "status");
    g.hidden = true;
    contenedor.appendChild(g);
    return g;
  }

  /* --- Interaccion comun: puntero sobre el area de trazado --- */
  function conectarPuntero(svg, contenedor, globo, guia, alSeñalar, total) {
    let activo = false;

    function indice(evento) {
      const caja = svg.getBoundingClientRect();
      const x = (evento.clientX ?? 0) - caja.left;
      const frac = Math.max(0, Math.min(1, x / caja.width));
      return Math.round(frac * (total - 1));
    }

    function mover(evento) {
      const i = indice(evento);
      const info = alSeñalar(i);
      if (!info) return;

      guia.setAttribute("x1", info.x);
      guia.setAttribute("x2", info.x);
      guia.style.opacity = "1";

      globo.hidden = false;
      vaciar(globo);
      globo.appendChild(info.contenido);

      const caja = svg.getBoundingClientRect();
      const px = (info.x / info.ancho) * caja.width;
      const ancho = globo.offsetWidth || 120;
      let izq = px - ancho / 2;
      izq = Math.max(4, Math.min(caja.width - ancho - 4, izq));
      globo.style.left = izq + "px";
    }

    function salir() {
      activo = false;
      guia.style.opacity = "0";
      globo.hidden = true;
    }

    svg.addEventListener("pointerdown", (e) => { activo = true; svg.setPointerCapture(e.pointerId); mover(e); });
    svg.addEventListener("pointermove", (e) => {
      if (e.pointerType === "mouse" || activo) {
        if (activo && e.pointerType !== "mouse") e.preventDefault();
        mover(e);
      }
    });
    svg.addEventListener("pointerup", salir);
    svg.addEventListener("pointercancel", salir);
    svg.addEventListener("pointerleave", (e) => { if (e.pointerType === "mouse") salir(); });
    svg.style.touchAction = "pan-y";
  }

  function preparar(destino) {
    const cont = typeof destino === "string" ? document.querySelector(destino) : destino;
    while (cont.firstChild) cont.removeChild(cont.firstChild);
    cont.classList.add("lienzo");
    return cont;
  }

  /* =======================================================================
     LINEA con banda de incertidumbre
     opciones: {pasado:[{x,y}], futuro:[{x,bajo,centro,alto}], formato, escala}
     ======================================================================= */
  function linea(destino, opciones) {
    const cont = preparar(destino);
    const pasado = opciones.pasado || [];
    const futuro = opciones.futuro || [];
    const fmt = opciones.formato || euros;
    const esc = escala(opciones.escala);

    const todos = pasado.concat(futuro.map((p) => ({ x: p.x, y: p.centro })));
    if (todos.length < 2) return;

    const A = 360, AL = 210, MI = 42, MD = 10, MS = 14, MB = 28;

    const valores = pasado.map((p) => p.y)
      .concat(futuro.map((p) => p.alto))
      .concat(futuro.map((p) => p.bajo));
    let vmin = Math.min.apply(null, valores);
    let vmax = Math.max.apply(null, valores);
    if (opciones.escala !== "log") vmin = Math.min(vmin, 0);
    if (vmax === vmin) vmax = vmin + 1;

    const emin = esc.ida(vmin), emax = esc.ida(vmax);
    const n = todos.length - 1;
    const X = (i) => MI + (A - MI - MD) * (i / n);
    const Y = (v) => MS + (AL - MS - MB) * (1 - (esc.ida(v) - emin) / (emax - emin));

    const svg = el("svg", {
      viewBox: `0 0 ${A} ${AL}`,
      preserveAspectRatio: "xMidYMid meet",
      role: "img",
      "aria-label": opciones.titulo || "Grafico de evolucion",
    });

    /* rejilla */
    for (let k = 0; k <= 4; k++) {
      const v = esc.vuelta(emin + (emax - emin) * (k / 4));
      const y = Y(v);
      svg.appendChild(el("line", { x1: MI, y1: y, x2: A - MD, y2: y, class: "rejilla" }));
      const t = el("text", { x: MI - 6, y: y + 3.5, "text-anchor": "end", class: "eje" });
      t.textContent = opciones.escalaCorta ? opciones.escalaCorta(v) : numero(v);
      svg.appendChild(t);
    }

    const corte = pasado.length - 1;

    /* banda */
    if (futuro.length) {
      const arriba = futuro.map((p, i) => `${X(corte + i).toFixed(1)},${Y(p.alto).toFixed(1)}`);
      const abajo = futuro.map((p, i) => `${X(corte + i).toFixed(1)},${Y(p.bajo).toFixed(1)}`).reverse();
      svg.appendChild(el("polygon", { points: arriba.concat(abajo).join(" "), class: "banda" }));
    }

    /* lineas */
    svg.appendChild(el("polyline", {
      points: pasado.map((p, i) => `${X(i).toFixed(1)},${Y(p.y).toFixed(1)}`).join(" "),
      class: "trazo-pasado",
    }));

    if (futuro.length) {
      svg.appendChild(el("polyline", {
        points: futuro.map((p, i) => `${X(corte + i).toFixed(1)},${Y(p.centro).toFixed(1)}`).join(" "),
        class: "trazo-futuro",
      }));
      svg.appendChild(el("line", { x1: X(corte), y1: MS, x2: X(corte), y2: AL - MB, class: "corte" }));
      const h = el("text", { x: X(corte), y: AL - 8, "text-anchor": "middle", class: "eje destacado" });
      h.textContent = "hoy";
      svg.appendChild(h);
    }

    /* etiquetas de los extremos */
    const e0 = el("text", { x: MI, y: AL - 8, class: "eje" });
    e0.textContent = todos[0].x;
    svg.appendChild(e0);
    const e1 = el("text", { x: A - MD, y: AL - 8, "text-anchor": "end", class: "eje" });
    e1.textContent = todos[n].x;
    svg.appendChild(e1);

    const guia = el("line", { y1: MS, y2: AL - MB, class: "guia" });
    svg.appendChild(guia);
    const punto = el("circle", { r: 4, class: "marcador" });
    svg.appendChild(punto);

    cont.appendChild(svg);
    const globo = crearGlobo(cont);

    conectarPuntero(svg, cont, globo, guia, (i) => {
      if (i < 0 || i > n) return null;
      const enPasado = i < pasado.length;
      const d = enPasado ? pasado[i] : futuro[i - corte];
      const v = enPasado ? d.y : d.centro;
      punto.setAttribute("cx", X(i));
      punto.setAttribute("cy", Y(v));
      punto.style.opacity = "1";

      const extra = (!enPasado && d.bajo !== d.alto)
        ? `de ${fmt(d.bajo)} a ${fmt(d.alto)}`
        : null;

      return {
        x: X(i), ancho: A,
        contenido: globoContenido(d.x, fmt(v), extra),
      };
    }, n + 1);

    return svg;
  }

  /* =======================================================================
     BARRAS
     opciones: {datos:[{x, y}], formato, color}
     ======================================================================= */
  function barras(destino, opciones) {
    const cont = preparar(destino);
    const datos = opciones.datos || [];
    if (!datos.length) return;
    const fmt = opciones.formato || ((v) => numero(v));

    const A = 360, AL = 180, MI = 34, MD = 8, MS = 12, MB = 26;
    const valores = datos.map((d) => d.y);
    const vmax = Math.max.apply(null, valores.concat([1]));
    const vmin = Math.min.apply(null, valores.concat([0]));
    const rango = vmax - vmin || 1;

    const ancho = (A - MI - MD) / datos.length;
    const Y = (v) => MS + (AL - MS - MB) * (1 - (v - vmin) / rango);

    const svg = el("svg", {
      viewBox: `0 0 ${A} ${AL}`,
      preserveAspectRatio: "xMidYMid meet",
      role: "img",
      "aria-label": opciones.titulo || "Grafico de barras",
    });

    for (let k = 0; k <= 3; k++) {
      const v = vmin + rango * (k / 3);
      svg.appendChild(el("line", { x1: MI, y1: Y(v), x2: A - MD, y2: Y(v), class: "rejilla" }));
      const t = el("text", { x: MI - 6, y: Y(v) + 3.5, "text-anchor": "end", class: "eje" });
      t.textContent = numero(v, rango < 5 ? 1 : 0);
      svg.appendChild(t);
    }

    const cero = Y(Math.max(0, vmin));
    datos.forEach((d, i) => {
      const y = Y(d.y);
      svg.appendChild(el("rect", {
        x: (MI + i * ancho + 0.7).toFixed(1),
        y: Math.min(y, cero).toFixed(1),
        width: Math.max(0.8, ancho - 1.4).toFixed(1),
        height: Math.max(1, Math.abs(cero - y)).toFixed(1),
        rx: 1,
        class: d.y < 0 ? "barra negativa" : "barra",
      }));
    });

    if (vmin < 0) {
      svg.appendChild(el("line", { x1: MI, y1: cero, x2: A - MD, y2: cero, class: "cero" }));
    }

    const p0 = el("text", { x: MI, y: AL - 8, class: "eje" });
    p0.textContent = datos[0].x;
    svg.appendChild(p0);
    const p1 = el("text", { x: A - MD, y: AL - 8, "text-anchor": "end", class: "eje" });
    p1.textContent = datos[datos.length - 1].x;
    svg.appendChild(p1);

    const guia = el("line", { y1: MS, y2: AL - MB, class: "guia" });
    svg.appendChild(guia);

    cont.appendChild(svg);
    const globo = crearGlobo(cont);

    conectarPuntero(svg, cont, globo, guia, (i) => {
      const d = datos[Math.max(0, Math.min(datos.length - 1, i))];
      if (!d) return null;
      const x = MI + (datos.indexOf(d) + 0.5) * ancho;
      return { x, ancho: A, contenido: globoContenido(d.x, fmt(d.y)) };
    }, datos.length);

    return svg;
  }

  /* =======================================================================
     HISTOGRAMA
     opciones: {cubos:[{desde,hasta,cuantas}], unidad}
     ======================================================================= */
  function histograma(destino, opciones) {
    const cont = preparar(destino);
    const cubos = opciones.cubos || [];
    if (!cubos.length) return;

    const A = 360, AL = 170, MI = 28, MD = 8, MS = 12, MB = 28;
    const tope = Math.max.apply(null, cubos.map((c) => c.cuantas).concat([1]));
    const ancho = (A - MI - MD) / cubos.length;

    const svg = el("svg", {
      viewBox: `0 0 ${A} ${AL}`,
      preserveAspectRatio: "xMidYMid meet",
      role: "img",
      "aria-label": opciones.titulo || "Distribucion de valores",
    });

    cubos.forEach((c, i) => {
      if (!c.cuantas) return;
      const h = (AL - MS - MB) * (c.cuantas / tope);
      svg.appendChild(el("rect", {
        x: (MI + i * ancho + 0.6).toFixed(1),
        y: (AL - MB - h).toFixed(1),
        width: Math.max(0.8, ancho - 1.2).toFixed(1),
        height: h.toFixed(1),
        rx: 1,
        class: "barra",
        opacity: (0.5 + 0.5 * (c.cuantas / tope)).toFixed(2),
      }));
    });

    svg.appendChild(el("line", { x1: MI, y1: AL - MB, x2: A - MD, y2: AL - MB, class: "rejilla" }));

    const u = opciones.unidad || "";
    const t0 = el("text", { x: MI, y: AL - 10, class: "eje" });
    t0.textContent = numero(cubos[0].desde, 3) + u;
    svg.appendChild(t0);
    const t1 = el("text", { x: A - MD, y: AL - 10, "text-anchor": "end", class: "eje" });
    t1.textContent = numero(cubos[cubos.length - 1].hasta, 3) + u;
    svg.appendChild(t1);

    const guia = el("line", { y1: MS, y2: AL - MB, class: "guia" });
    svg.appendChild(guia);

    cont.appendChild(svg);
    const globo = crearGlobo(cont);

    conectarPuntero(svg, cont, globo, guia, (i) => {
      const c = cubos[Math.max(0, Math.min(cubos.length - 1, i))];
      if (!c) return null;
      const x = MI + (cubos.indexOf(c) + 0.5) * ancho;
      return {
        x, ancho: A,
        contenido: globoContenido(
          `${numero(c.desde, 3)}${u} a ${numero(c.hasta, 3)}${u}`,
          `${c.cuantas} ${c.cuantas === 1 ? "estación" : "estaciones"}`
        ),
      };
    }, cubos.length);

    return svg;
  }

  /* ---------------------------------------------------------------------
     Helpers de DOM para las paginas. Existen para que ninguna plantilla
     tenga que concatenar HTML: se pasan trozos de texto y, donde haga
     falta negrita, un objeto {fuerte: "..."}.
     --------------------------------------------------------------------- */

  function vaciarNodo(destino) {
    const n = typeof destino === "string" ? document.querySelector(destino) : destino;
    while (n.firstChild) n.removeChild(n.firstChild);
    return n;
  }

  function crear(etiqueta, clase, texto) {
    const n = document.createElement(etiqueta);
    if (clase) n.className = clase;
    if (texto !== undefined && texto !== null) n.textContent = String(texto);
    return n;
  }

  /* frase("#rango", ["Entre ", {fuerte: "10 €"}, " y ", {fuerte: "20 €"}, "."]) */
  function frase(destino, partes) {
    const n = vaciarNodo(destino);
    partes.forEach((t) => {
      if (t && typeof t === "object" && "fuerte" in t) {
        n.appendChild(crear("strong", null, t.fuerte));
      } else {
        n.appendChild(document.createTextNode(String(t)));
      }
    });
    return n;
  }

  /* lista("#ranking", [{nombre, valor, sub}, ...]) */
  function lista(destino, filas) {
    const n = vaciarNodo(destino);
    const ol = crear("ol", "lista");
    filas.forEach((f) => {
      const li = crear("li", "item");
      const pos = crear("span", "pos");
      pos.setAttribute("aria-hidden", "true");
      li.appendChild(pos);
      li.appendChild(crear("span", "nombre", f.nombre));
      li.appendChild(crear("span", "valor", f.valor));
      if (f.sub) li.appendChild(crear("span", "sub", f.sub));
      ol.appendChild(li);
    });
    n.appendChild(ol);
    return n;
  }

  /* tabla("#tabla", [["Espana", "3,10 %", "+65 pb"], ...]) */
  function tabla(destino, filas, claseDestacada) {
    const n = vaciarNodo(destino);
    filas.forEach((celdas) => {
      const tr = crear("tr");
      celdas.forEach((c, i) => {
        tr.appendChild(crear("td", i === 1 ? (claseDestacada || "destaca") : null, c));
      });
      n.appendChild(tr);
    });
    return n;
  }

  return { linea, barras, histograma, euros, numero, frase, lista, tabla, crear, vaciar: vaciarNodo };
})();
