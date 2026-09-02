"""
Aritmetica de las proyecciones.

Metodo: se toma la distribucion historica de tasas anuales y se compone
hacia adelante con tres percentiles. Es extrapolacion, no prediccion.
"""

from __future__ import annotations

import datetime as dt
import math


def percentil(valores: list[float], p: float) -> float:
    """Percentil por interpolacion lineal. p entre 0 y 1."""
    if not valores:
        return 0.0
    o = sorted(valores)
    if len(o) == 1:
        return o[0]
    pos = (len(o) - 1) * p
    bajo, alto = math.floor(pos), math.ceil(pos)
    if bajo == alto:
        return o[bajo]
    return o[bajo] + (o[alto] - o[bajo]) * (pos - bajo)


def proyectar(valor: float, tasas: list[float], anios: int, anio_base: int) -> dict:
    """Tres caminos hacia adelante: percentil 25, mediana y percentil 75."""
    bajo = percentil(tasas, 0.25)
    medio = percentil(tasas, 0.50)
    alto = percentil(tasas, 0.75)

    puntos = [{
        "anio": anio_base + a,
        "bajo":   round(valor * (1 + bajo / 100) ** a, 2),
        "centro": round(valor * (1 + medio / 100) ** a, 2),
        "alto":   round(valor * (1 + alto / 100) ** a, 2),
    } for a in range(anios + 1)]

    return {
        "puntos": puntos,
        "tasa_baja": round(bajo, 2),
        "tasa_media": round(medio, 2),
        "tasa_alta": round(alto, 2),
        "n_anios": len(tasas),
    }


def reconstruir_pasado(valor: float, tasas_por_anio: list[dict]) -> list[dict]:
    """Camina hacia atras: que valia este mismo importe en años anteriores."""
    if not tasas_por_anio:
        return []
    serie = [{"anio": tasas_por_anio[-1]["anio"], "valor": round(valor, 2)}]
    for reg in reversed(tasas_por_anio):
        previo = serie[0]["valor"] / (1 + reg["tasa"] / 100)
        serie.insert(0, {"anio": reg["anio"] - 1, "valor": round(previo, 2)})
    return serie


# --------------------------------------------------------------------------
# Gasolina
# --------------------------------------------------------------------------

def histograma(valores: list[float], cubos: int = 24) -> dict:
    """Reparte los precios en cubos para dibujar la distribucion."""
    if len(valores) < 3:
        return {"cubos": [], "min": 0, "max": 0}

    lo, hi = min(valores), max(valores)
    if hi - lo < 0.02:
        lo, hi = lo - 0.01, hi + 0.01

    conteo = [0] * cubos
    for v in valores:
        i = min(cubos - 1, int((v - lo) / (hi - lo) * cubos))
        conteo[i] += 1

    ancho = (hi - lo) / cubos
    return {
        "min": round(lo, 3),
        "max": round(hi, 3),
        "cubos": [{
            "desde": round(lo + i * ancho, 3),
            "hasta": round(lo + (i + 1) * ancho, 3),
            "cuantas": c,
        } for i, c in enumerate(conteo)],
    }


# --------------------------------------------------------------------------
# Sismos
# --------------------------------------------------------------------------

def periodos_retorno(magnitudes: list[float], anios: float) -> list[dict]:
    """Cada cuanto ha ocurrido historicamente cada nivel de magnitud.

    Conteo dividido por la ventana del catalogo. Describe el pasado; no
    dice cuando sera el siguiente.
    """
    if not magnitudes or anios <= 0:
        return []

    salida = []
    for umbral in (3.0, 3.5, 4.0, 4.5, 5.0, 5.5, 6.0):
        n = sum(1 for m in magnitudes if m >= umbral)
        if n:
            salida.append({
                "magnitud": umbral,
                "cuantos": n,
                "cada_anios": round(anios / n, 1),
                "por_anio": round(n / anios, 2),
            })
    return salida


def sismos_por_anio(eventos: list[dict]) -> list[dict]:
    conteo: dict[int, int] = {}
    for e in eventos:
        if e.get("tiempo"):
            a = dt.datetime.fromtimestamp(e["tiempo"] / 1000, dt.timezone.utc).year
            conteo[a] = conteo.get(a, 0) + 1
    return [{"anio": a, "cuantos": conteo[a]} for a in sorted(conteo)]


# --------------------------------------------------------------------------
# Bitcoin
# --------------------------------------------------------------------------

def caidas(precios: list[float]) -> dict:
    """Peor caida desde un maximo previo, y caida actual."""
    if len(precios) < 2:
        return {"peor": 0.0, "actual": 0.0, "maximo": 0.0}

    maximo = precios[0]
    peor = 0.0
    for p in precios:
        maximo = max(maximo, p)
        peor = min(peor, (p - maximo) / maximo * 100)

    return {
        "peor": round(peor, 1),
        "actual": round((precios[-1] - maximo) / maximo * 100, 1),
        "maximo": round(maximo, 2),
    }


def volatilidad(precios: list[float]) -> float:
    """Desviacion tipica de rendimientos diarios, anualizada, en porcentaje."""
    if len(precios) < 30:
        return 0.0
    r = [math.log(precios[i] / precios[i - 1])
         for i in range(1, len(precios))
         if precios[i - 1] > 0 and precios[i] > 0]
    if len(r) < 2:
        return 0.0
    media = sum(r) / len(r)
    var = sum((x - media) ** 2 for x in r) / (len(r) - 1)
    return round(math.sqrt(var) * math.sqrt(365) * 100, 1)


def rendimientos_anuales(serie: list[dict]) -> list[dict]:
    """Rendimiento de cada año natural, en porcentaje."""
    por_anio: dict[int, list[float]] = {}
    for punto in serie:
        a = dt.datetime.fromtimestamp(punto["t"] / 1000, dt.timezone.utc).year
        por_anio.setdefault(a, []).append(punto["precio"])

    salida = []
    for a in sorted(por_anio):
        p = por_anio[a]
        if len(p) >= 2 and p[0] > 0:
            salida.append({"anio": a, "rendimiento": round((p[-1] / p[0] - 1) * 100, 1)})
    return salida
