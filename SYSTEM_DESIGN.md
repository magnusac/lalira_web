# System Design & Architecture Guidelines — La Lira CMS

Este documento registra los principios de diseño de sistema y decisiones de arquitectura (ADR - Architecture Decision Records) para mantener la coherencia y estabilidad del CMS y la plataforma La Lira.

---

## Decisiones de Arquitectura (ADR)

### ADR-001: Independencia Estricta de Módulos Editores en el CMS

**Fecha**: 12 de agosto de 2026  
**Estado**: Aprobado / En Vigor  
**Contexto**:  
El CMS cuenta con editores diferenciados para manejar los aspectos de una alabanza:
1. **Pestaña 1: Cifrado y Acordes (ChordPro)** — Diseñada para editar la notación musical de acordes, tono, compás y ritmo.
2. **Pestaña 2: Texto Plano y Estrofas (`estrofa`)** — Diseñada para gestionar la letra estructurada por estrofas (usada en la vista de lectura sin acordes de la app móvil y en el motor de búsqueda por texto completo FTS).
3. **Pestaña 3: Metadatos** — Diseñada para títulos, autores y traductores por idioma.
4. **Pestaña 4: Notas Referenciales** — Notas bíblicas e históricas.

**Regla de Diseño**:
1. **Cero Acoplamiento Destructivo**: Cada módulo editor gestiona únicamente su propia entidad de datos. 
2. **Prohibición de Autogeneración en Servidor**: Queda **estrictamente prohibido** que al guardar o aprobar un borrador desde el editor de cifrado (ChordPro) el backend destruya, sobrescriba o reconstruya automáticamente las estrofas en la tabla `estrofa` mediante algoritmos de limpieza de caracteres de acordes.
3. **Prioridad a Datos Explícitos**: El servidor debe almacenar exactamente lo que el usuario define en la pestaña de estrofas (`songData.estrofas`). Si el borrador no contiene estrofas explícitas, se deben preservar las estrofas existentes en la base de datos sin borrarlas ni sobreescribirlas.

**Razonamiento**:  
Cualquier sincronización o parsing automático que modifique entidades de datos entre pestañas altera la previsibilidad del UX y destruye el trabajo manual que los editores realizan en las estrofas de texto plano.
