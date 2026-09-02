# Proyecciones: Bitcoin

Bitcoin, Ethereum y XRP: las tres criptomonedas de mayor capitalización de mercado, con gráfica interactiva de histórico y rendimiento anual.

Sitio en vivo: https://adrianezd.github.io/proyecciones-bitcoin/

Parte de [Proyecciones](https://adrianezd.github.io/proyecciones/), once páginas de datos públicos, cada una
en su propio repositorio y su propio GitHub Pages.

## Fuente de datos

**Yahoo Finance** (endpoint de gráficas, sin clave). Si falla, se prueba Stooq (necesita clave propia desde 2026) y después **Kraken** como respaldo sin clave, aunque solo guarda 720 días de histórico.

## Cómo funciona

No hay servidor. Una GitHub Action (dos veces al día) descarga la fuente, calcula
lo que haga falta y escribe HTML plano con los datos ya incrustados en
`docs/`. GitHub Pages sirve esa carpeta directamente.

Si la fuente falla y no hay copia en `cache/` (que se versiona en el
repo), la página no se genera: nunca se rellena un hueco con datos
inventados.

## Arrancar en local

```bash
pip install -r requirements.txt
python -m fuente.construir
python -m http.server 8000 --directory docs
```

## Publicar

1. Sube el repo a GitHub.
2. Settings → Pages → Source: **GitHub Actions**.
3. Actions → *Construir y publicar* → **Run workflow**.
