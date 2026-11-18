# ANI Insights

Aplicación web para explorar las lecciones aprendidas de los proyectos carreteros de Asociación Público-Privada (APP) de la Agencia Nacional de Infraestructura. Comienza con la matriz adjunta **LECCIONES APRENDIDAS VEJ 8feb24.csv**, incluida en UTF-8 como fuente de referencia.

## Ejecutar

Requiere Node.js 20.19+ o 22.12+.

```bash
npm ci
npm run dev
```

`npm test` ejecuta las pruebas de importación, análisis y PDF. `npm run build` compila la aplicación estática en `dist/`; `npm run preview` sirve esa compilación para revisarla localmente.

## Publicar en GitHub Pages

1. En el repositorio, selecciona **Settings → Pages → Build and deployment → Source → GitHub Actions** si aún no está configurado.
2. Integra el pull request en `main`. El flujo **GitHub Pages** ejecuta las pruebas, compila y publica el sitio. Los pull requests solo ejecutan las pruebas y la compilación, sin publicar.
3. Cuando termine el despliegue en la pestaña **Actions**, abre <https://oswaldsantos.github.io/prueba_ani/>. Si necesitas volver a publicar, puedes ejecutar el flujo manualmente desde `main`.

La matriz de referencia incluida en este repositorio también forma parte del sitio público. Los archivos que se importen después desde la aplicación solo se procesan en el navegador y no se publican.

## Uso

- **Visión general:** resúmenes por componente, alcance, temas y proyectos. Las barras de componentes y las filas del ranking llevan a las lecciones correspondientes.
- **Explorar lecciones:** búsqueda sin distinción de mayúsculas ni tildes, filtros combinables de componente y proyecto, y detalle de la recomendación con sus referencias.
- **Cargar archivo:** importa CSV separado por punto y coma, coma o tabulación (UTF-8, UTF-16 con BOM o Windows-1252), o la primera hoja de un Excel `.xlsx`. Se requieren `Componente`, `Tema` y `Recomendación`. `Proyectos` y `Página` son opcionales. Dentro de una celda, separa varios proyectos con saltos de línea, `|` o `;`. El diálogo permite descargar una plantilla y avisa si hay filas incompletas. Límite: 10 MB y 20.000 lecciones válidas.
- **Reportes PDF:** la exportación rápida usa los filtros de la vista actual. La sección **Reportes PDF** permite elegir la fuente completa o la selección filtrada e incluir un anexo con recomendaciones, proyectos y páginas.

Cada fila válida cuenta como una lección. Se agrupan variantes de escritura de los nombres de proyectos, conservando el texto original en el detalle; un registro puede mencionar varios proyectos. Se distingue una recomendación explícitamente general de una fila sin dato de proyecto. Los conteos describen la fuente: no son un inventario contractual ni una evaluación de severidad o probabilidad de riesgo.

La importación, el análisis y la generación del PDF ocurren en el navegador, sin enviar los archivos importados a un servidor. Al recargar vuelve a mostrarse la matriz de referencia.
