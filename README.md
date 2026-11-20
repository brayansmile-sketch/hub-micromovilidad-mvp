# Hub de Micromovilidad Sostenible — MVP digital

Prototipo web local para presentar la estación integral propuesta en el anteproyecto de Ingeniería Electromecánica. La primera versión prioriza la simulación del inflado de neumáticos y el balance energético solar/batería, y representa visualmente los módulos de herramientas y carga USB previstos.

## Abrir en Windows

1. Mantén juntos `index.html`, `styles.css`, `app.js` y `README.md`.
2. Abre `index.html` con doble clic. También puedes hacer clic derecho, elegir **Abrir con** y seleccionar Chrome, Edge o Firefox.
3. Para mostrarlo en una presentación, maximiza la ventana del navegador. No requiere instalación, servidor, cuenta ni conexión con hardware.

La tipografía externa puede usar Google Fonts si hay conexión a internet; si no, el navegador usará fuentes de respaldo. La aplicación y sus cálculos funcionan localmente.

## Funciones de la versión

### Implementadas en la interfaz

- Vista conceptual de la estación integral: panel fotovoltaico, controlador/visualizador, batería, compresor, inflado, puertos USB y espacio para herramientas.
- Estado del MVP que separa implementación visual, simulaciones y módulos pendientes.
- Parámetros editables, mensajes de validación y unidades visibles en español.

### Simuladas

- Ciclo de inflado con presión inicial y objetivo en PSI, barra de progreso y resultado.
- Tiempo idealizado: `duración (min) = (presión objetivo − presión inicial) / ritmo de inflado`.
- Energía idealizada del ciclo: `E (Wh) = potencia del compresor (W) × duración (min) / 60`.
- Generación diaria aproximada: `E solar (Wh/día) = potencia pico del panel (Wp) × horas sol pico (h/día) × rendimiento global`.
- Descarga de batería, reserva mínima y número entero de ciclos estimado desde la carga actual.
- Ciclos equivalentes teóricos que podría cubrir la generación solar diaria, comparados con la energía de un inflado.
- Descarga de un resumen de escenario en texto y opción del navegador para imprimir o guardar la vista como PDF.
- Restablecimiento independiente de la carga inicial y de todos los valores ilustrativos.

### Previstas, todavía sin función operativa

- Módulo “Pit Stop” y herramientas para mantenimiento mecánico.
- Puertos USB, entrega efectiva de carga y consumo eléctrico asociado.
- Controlador, sensor de presión y cualquier integración con Arduino u otro hardware.

## Supuestos iniciales y límites

Los valores iniciales son exclusivamente ilustrativos: panel de 120 Wp, 4 horas sol pico/día, rendimiento global del 75 %, batería AGM de 12 V y 20 Ah (240 Wh nominales), carga inicial del 80 %, reserva del 20 %, compresor de 150 W y ritmo de 8 PSI/min. Son configurables en pantalla y **no están confirmados por medición, ficha técnica ni dimensionamiento final**.

El modelo usa potencia constante y un ritmo lineal de aumento de presión. La animación del progreso está acelerada para presentación: el tiempo calculado se presenta como estimación idealizada, no como duración de la animación. No calcula el caudal real, volumen del neumático, eficiencia del compresor, pérdidas de conversión, comportamiento de tensión de la batería, irradiación horaria ni cargas de iluminación/USB/herramientas. La energía solar diaria se informa como estimación y no se añade automáticamente a la carga de batería durante una simulación. El indicador de ciclos equivalentes solares divide esa generación diaria entre el consumo idealizado del ciclo; no representa operación diaria garantizada. El número de ciclos desde la carga actual supone que el consumo por ciclo se mantiene constante y que la batería puede descargarse hasta la reserva indicada.

Por tanto, los resultados no son mediciones reales ni una predicción de desempeño del prototipo físico. Deben sustituirse o validarse con fichas técnicas, cálculos de ingeniería y pruebas experimentales antes de utilizarlos como resultados del proyecto.

