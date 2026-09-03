"""
Enlaces entre los sitios hermanos.

Cada pagina vive en su propio repositorio y su propio GitHub Pages, asi
que la barra de navegacion no puede usar rutas relativas: enlaza a la URL
absoluta de cada sitio hermano. Este fichero es identico en los doce
repositorios del proyecto para que todos compartan el mismo menu.
"""

import json as _json

USUARIO = "adrianezd"


def sitio(repo: str) -> str:
    return f"https://{USUARIO}.github.io/{repo}/"


HUB = sitio("proyecciones")

MENU = [
    {"repo": "proyecciones-bolsa", "titulo": "Bolsa", "acento": "bolsa",
     "resumen": "El S&P 500 y otros grandes indices y fondos del mundo."},
    {"repo": "proyecciones-materias-primas", "titulo": "Materias primas", "acento": "materias-primas",
     "resumen": "Oro, plata, petroleo Brent y gas natural."},
    {"repo": "proyecciones-divisas", "titulo": "Divisas", "acento": "divisas",
     "resumen": "El euro frente al dolar, la libra y el yen."},
    {"repo": "proyecciones-bitcoin", "titulo": "Bitcoin", "acento": "bitcoin",
     "resumen": "Bitcoin, Ethereum y XRP: las tres mayores criptomonedas."},
    {"repo": "proyecciones-bonos", "titulo": "Bonos", "acento": "bonos",
     "resumen": "Lo que paga cada pais del euro por su deuda a diez años."},
    {"repo": "proyecciones-vivienda", "titulo": "Vivienda", "acento": "vivienda",
     "resumen": "Precio de compra segun el indice del INE."},
    {"repo": "proyecciones-alquiler", "titulo": "Alquiler", "acento": "alquiler",
     "resumen": "Lo mismo aplicado a la renta mensual."},
    {"repo": "proyecciones-gasolina", "titulo": "Gasolina", "acento": "gasolina",
     "resumen": "Precio de repostar, provincia a provincia."},
    {"repo": "proyecciones-supermercado", "titulo": "Supermercado", "acento": "supermercado",
     "resumen": "Precios de la compra. Cobertura escasa, y se avisa."},
    {"repo": "proyecciones-terremotos", "titulo": "Terremotos", "acento": "terremotos",
     "resumen": "Lo que ha temblado en el mundo en las ultimas 24 horas."},
    {"repo": "proyecciones-sismos", "titulo": "Sismos en España", "acento": "sismos",
     "resumen": "Cada cuanto tiembla aqui, segun el catalogo historico."},
]

for _p in MENU:
    _p["url"] = sitio(_p["repo"])


def _json_seguro(obj) -> str:
    """Igual que json_seguro en construir.py: escapa lo que podria cerrar
    la etiqueta <script> o romper el parser de JS."""
    texto = _json.dumps(obj, ensure_ascii=False)
    return (texto
            .replace("<", "\\u003c")
            .replace(">", "\\u003e")
            .replace("&", "\\u0026")
            .replace(" ", "\\u2028")
            .replace(" ", "\\u2029"))


def jsonld_pagina(*, titulo: str, descripcion: str, url: str, fuente_nombre: str,
                   fuente_url: str | None = None,
                   licencia: str = "https://creativecommons.org/licenses/by/4.0/") -> str:
    """JSON-LD de la pagina: Dataset (para que Google entienda que es un
    dato publico, no un articulo) mas BreadcrumbList (Proyecciones > la
    pagina), como un unico array servido en un <script type="ld+json">.
    """
    dataset = {
        "@context": "https://schema.org",
        "@type": "Dataset",
        "name": titulo,
        "description": descripcion,
        "url": url,
        "license": licencia,
        "isAccessibleForFree": True,
        "inLanguage": "es",
        "creator": {"@type": "Organization", "name": fuente_nombre,
                    **({"url": fuente_url} if fuente_url else {})},
    }
    breadcrumb = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "Proyecciones", "item": HUB},
            {"@type": "ListItem", "position": 2, "name": titulo, "item": url},
        ],
    }
    return _json_seguro([dataset, breadcrumb])
