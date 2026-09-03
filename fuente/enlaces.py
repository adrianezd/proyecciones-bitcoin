"""
Enlaces entre los sitios hermanos.

Cada pagina vive en su propio repositorio y su propio GitHub Pages, asi
que la barra de navegacion no puede usar rutas relativas: enlaza a la URL
absoluta de cada sitio hermano. Este fichero es identico en los doce
repositorios del proyecto para que todos compartan el mismo menu.
"""

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
