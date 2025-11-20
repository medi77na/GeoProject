# Modelo Conceptual de Riesgos y Controles – Simulador Urbano (Fase 2)

## 1. Portada y propósito
- Modelo conceptual basado en ISO/IEC 27000 para documentar riesgos y controles del Simulador Urbano.
- Describe cómo se abordan Confidencialidad, Integridad y Disponibilidad (CIA) en la API FastAPI, simulaciones y recomendaciones.
- No es una certificación ni una auditoría formal; sirve como evidencia académica y guía de referencia.

## 2. Alcance y contexto del sistema
- Simulador Urbano con backend FastAPI (endpoints `/api/v1/simulate`, `/api/v1/simulate/compare`, `/api/v1/recommend`) y frontends Streamlit/React.
- Entorno académico con datos sintéticos; foco en la API, el motor de simulación y el módulo de reglas de recomendación.
- Considera controles ya desarrollados en la Fase 2: validación estricta (F2-HU02), optimización de rendimiento (F2-HU03), versionado y OpenAPI (F2-HU04), API Key en endpoints críticos (F2-HU11) y logging estructurado (F2-HU12).

## 3. Inventario de activos
| Activo | Tipo | Descripción |
| --- | --- | --- |
| Backend FastAPI (servicio de API) | Lógico | Servicio que expone operaciones de simulación y recomendaciones. |
| Endpoint `/api/v1/simulate` | Lógico | Ejecuta la simulación principal con parámetros de tráfico y contaminación. |
| Endpoint `/api/v1/simulate/compare` | Lógico | Compara escenarios de simulación cuando está habilitado. |
| Endpoint `/api/v1/recommend` | Lógico | Devuelve recomendaciones basadas en reglas y KPIs ambientales. |
| Código fuente del motor de simulación | Lógico | Implementación de lógica de simulación de tráfico y dispersión. |
| Módulo de reglas y recomendaciones | Lógico | Motor de reglas que aplica umbrales y genera acciones sugeridas. |
| Datos sintéticos de entrada | Datos | Parámetros de tráfico, clima y contaminación usados para pruebas académicas. |
| Resultados de simulación (series, KPIs, mapas) | Datos | Salidas de la simulación y comparaciones de escenarios. |
| API Key y configuración `.env` | Datos | Credenciales y parámetros sensibles para el acceso a endpoints críticos. |
| Registros de logs (F2-HU12) | Datos | Logs estructurados para trazabilidad y diagnóstico. |
| Infraestructura de despliegue (local, contenedor Docker) | Infraestructura | Entorno de ejecución y red asociado al backend. |
| Usuarios académicos (estudiantes, docentes) | Datos | Actores que consumen la API o las interfaces para fines académicos. |

## 4. Amenazas y vulnerabilidades (modelo conceptual)
- Input malicioso o mal formado hacia `/simulate` o `/compare` que busque romper la simulación o provocar errores.
  - Vulnerabilidades: validación insuficiente (mitigada por F2-HU02), sanitización incompleta, dependencias sin actualizar.
- Envío masivo de requests al backend (abuso/DoS) que degrade tiempos de respuesta.
  - Vulnerabilidades: ausencia de rate limiting o cuotas, despliegues con recursos limitados.
- Fuga de la API Key por exposición del `.env`, repositorios públicos o trazas del frontend.
  - Vulnerabilidades: mala gestión de secretos, permisos laxos en archivos de configuración.
- Manipulación de parámetros de simulación para obtener resultados engañosos o sesgados.
  - Vulnerabilidades: controles de rangos insuficientes, falta de monitoreo de anomalías en los inputs.
- Acceso no autorizado a logs o resultados de simulación que contengan patrones sensibles.
  - Vulnerabilidades: almacenamiento sin controles de acceso, despliegues con permisos excesivos.
- Configuración insegura del despliegue (puertos abiertos, sin TLS cuando aplica, contenedores con privilegios).
  - Vulnerabilidades: configuraciones por defecto sin hardening, falta de revisiones previas al despliegue.
- Errores en reglas de recomendación o documentación desactualizada que generen acciones incorrectas.
  - Vulnerabilidades: falta de pruebas de coherencia, ausencia de revisión periódica de reglas y OpenAPI.

## 5. Matriz de riesgos conceptual
| Amenaza | Vulnerabilidad asociada | Probabilidad | Impacto | Nivel de riesgo | Controles / HUs relacionadas |
| --- | --- | --- | --- | --- | --- |
| Input malicioso rompe simulación | Validación débil | Media | Alto | Alto | F2-HU02, manejo de errores |
| Requests masivos (DoS) | Sin límites de uso | Media | Alto | Alto | F2-HU03, F2-HU11, rate limiting (planeado) |
| Fuga de API Key | Exposición de `.env` | Media | Alto | Alto | Buenas prácticas de secretos, F2-HU11 |
| Acceso no autorizado a `/recommend` | Autenticación omitida | Baja | Alto | Medio | F2-HU11 |
| Parámetros manipulados para sesgo | Rangos poco controlados | Media | Medio | Medio | F2-HU02, reglas de negocio |
| Lectura de logs por terceros | Permisos laxos | Baja | Medio | Bajo/Medio | F2-HU12, controles de acceso al host |
| Despliegue mal configurado | Falta de hardening | Media | Alto | Alto | Guías de despliegue, revisión previa |
| Datos sintéticos alterados | Fuentes no controladas | Baja | Medio | Bajo/Medio | F2-HU02, firmas/checksums (plan) |
| Resultados expuestos públicamente | Falta de control de acceso a salidas | Media | Medio | Medio | API Key, diseño de rutas |
| Falta de trazabilidad ante fallos | Logging insuficiente | Media | Medio | Medio | F2-HU12 |

## 6. Controles mínimos implementados y planificados
| Control | Descripción | HU / Implementación | Estado |
| --- | --- | --- | --- |
| Autenticación por API Key | Protección de endpoints críticos (`/simulate`, `/recommend`) | F2-HU11 | Implementado |
| Validación estricta con Pydantic | Modelos de entrada con tipos y rangos definidos | F2-HU02 | Implementado |
| Logging estructurado y trazabilidad | Captura de eventos, errores y contexto | F2-HU12 | Implementado |
| Optimización de rendimiento y tiempos de respuesta | Mejora de eficiencia para disponibilidad | F2-HU03 | Implementado |
| Gestión de `.env` y secretos | Separar credenciales; no versionar secretos reales | Buenas prácticas | Parcial (depende del despliegue) |
| Manejo de errores y sanitización de mensajes | Evitar fugas de información sensible en respuestas | Middleware/handlers | Implementado/continuo |
| Documentación OpenAPI | Claridad de contratos y parámetros | F2-HU04 | Implementado |
| Hardening de despliegue y control de acceso a logs | Permisos mínimos, contenedores sin privilegios | Guías/ops | Parcial/planificado |
| Rate limiting y monitoreo básico | Límites por API Key y alertas de abuso | Mejora futura | Planificado |

## 7. Relación con ISO/IEC 27000 (CIA)
- Confidencialidad: la API Key y la gestión adecuada del `.env` restringen el acceso a endpoints y datos; controles de despliegue evitan exposición de logs y resultados.
- Integridad: la validación de entrada con Pydantic y las reglas de negocio previenen datos corruptos o manipulados; el logging estructurado facilita detectar anomalías o cambios no autorizados.
- Disponibilidad: optimizaciones de rendimiento, protección de endpoints críticos y futuras medidas de rate limiting buscan mantener la respuesta en tiempos razonables incluso bajo carga.

## 8. Conclusiones y próximos pasos
- Los principales riesgos se centran en acceso indebido (API Key), manipulación de datos de simulación y degradación de servicio; existen controles implementados en validación, autenticación y trazabilidad.
- Próximos pasos recomendados: rate limiting, hardening sistemático del despliegue, protección adicional de logs y monitoreo centralizado; considerar cifrado en tránsito y políticas formales si el proyecto escala.
- Este documento funciona como evidencia académica de que la seguridad de la información se integra en el diseño y operación del Simulador Urbano.
