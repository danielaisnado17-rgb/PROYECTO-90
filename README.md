# PROJECT 90 — Body Transformation

Plataforma personal de transformación física de 90 días: entrenamiento con progresión doble,
nutrición con pesaje de alimentos, body tracking con fotos privadas, hábitos, natación,
mapa de 90 días con logros e informes quincenales/final.

**Stack:** Next.js 15 · TypeScript · Tailwind CSS 4 · Recharts · Supabase (Auth, Postgres con RLS, Storage) · Vercel.

## Ejecutar en local

```bash
npm install
npm run dev
```

Sin variables de entorno funciona en **modo local** (datos en el navegador; fotos en IndexedDB).

## Conectar Supabase (datos en la nube, multi-dispositivo)

1. Crea un proyecto en supabase.com.
2. SQL Editor → pega y ejecuta `supabase/migrations/0001_init.sql`
   (crea las 19 tablas, la vista `load_history`, RLS en todas y el bucket privado `progress-photos`).
3. Copia `.env.example` a `.env.local` y rellena la URL y la clave publishable (o anon).
4. Reinicia `npm run dev`. Aparecerá el login; al crear tu cuenta, lo que hubiera en el
   dispositivo se sube automáticamente.

La app es *local-first*: cada cambio se guarda al instante en el dispositivo y se sincroniza
con Supabase; si no hay conexión queda en cola y se reintenta.

## Desplegar en Vercel

1. Sube el repositorio a GitHub e impórtalo en vercel.com.
2. Añade `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (o `..._ANON_KEY`) en Environment Variables.
3. Deploy. En el móvil: abre la URL → «Añadir a pantalla de inicio» (necesario en iPhone para notificaciones).

## Notificaciones

- Al pulsar **«Cerrar mi día»** llega una notificación con un mensaje bonito + pantalla de celebración.
- Recordatorios opcionales (entreno, registro de comidas, agua, cerrar el día) mientras la app está abierta o instalada.
- Para avisos con la app totalmente cerrada hace falta Web Push (claves VAPID + función programada);
  el service worker (`public/sw.js`) ya escucha eventos `push`.

## Fuentes de datos

- Imágenes de ejercicios: [free-exercise-db](https://github.com/yuhonas/free-exercise-db) (Unlicense, dominio público),
  cada ejercicio con sus propias fotos. No se incluyen videos inventados: la usuaria puede guardar su enlace.
- Alimentos: USDA FoodData Central (redondeado, marcado como referencia). Platos fuera de casa: estimaciones por composición, marcadas.
- Calorías: Mifflin-St Jeor × factor de actividad; no usa % de grasa (no medido).

## Estructura

```
src/lib/        dominio: types, store (persistencia+sync), program (etapas/logros), nutrition,
                progression (progresión doble), reports, photos, notify, seed/
src/app/        páginas: / · ruta · entrenamientos(+sesion) · nutricion · body · progreso(+informe) · habitos · configuracion
supabase/       migración SQL con RLS
```

> No es una herramienta médica. Ante dolor, lesiones o dudas de alimentación, consulta con profesionales.
