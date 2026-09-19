# ⚽ SoccerstAI

<p align="center">
  <strong>Plataforma Móvil de Análisis, Predicciones y Estadísticas de Fútbol impulsada por IA</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Expo-v56.0-black?style=for-the-badge&logo=expo" alt="Expo SDK 56" />
  <img src="https://img.shields.io/badge/React_Native-0.85-61DAFB?style=for-the-badge&logo=react" alt="React Native" />
  <img src="https://img.shields.io/badge/Firebase-v10-FFCA28?style=for-the-badge&logo=firebase" alt="Firebase" />
  <img src="https://img.shields.io/badge/Groq_AI-Llama_3-FF6C37?style=for-the-badge" alt="Groq AI" />
  <img src="https://img.shields.io/badge/License-MIT-green.style=for-the-badge" alt="MIT License" />
</p>

---

## 📌 Descripción

**SoccerstAI** es una aplicación móvil avanzada desarrollada con **React Native (Expo)** y **Firebase** que ofrece predicciones deportivas inteligentes, análisis situacional detallado de partidos de fútbol, comparación de cuotas en tiempo real e historial estadístico completo.

Combina modelos de lenguaje de alto rendimiento a través de la API de **Groq Cloud** con feeds de datos deportivos globales (**Football-Data.org**, **API-Football** y **The Odds API**).

---

## ✨ Características Principales

- 🤖 **Análisis IA Avanzado (Groq AI)**: Genera resúmenes ejecutivos, análisis táctico, mercados de valor y apuestas recomendadas (`Value Bets`) con porcentaje de probabilidad y confianza.
- 📅 **Marcadores & Calendario en Vivo**: Cobertura de las principales ligas del mundo (Champions League, Premier League, LaLiga, Serie A, Bundesliga, Copa Libertadores, Mundial de la FIFA, etc.).
- 📊 **Cuotas de Apuestas en Tiempo Real**: Integración con **The Odds API** para consultar cuotas decimales en mercados 1X2 (H2H) y Totales (Over/Under).
- 🏆 **Historial de Mundiales (H2H)**: Consulta enfrentamientos históricos y rendimiento entre selecciones nacionales en Copas del Mundo.
- ⚡ **Caché Multinivel Eficiente**:
  - **Servidor**: Cloud Functions sincronizan partidos y cuotas en **Firestore** en segundo plano para minimizar consumo de llamadas API.
  - **Cliente**: Caché local persistente con **AsyncStorage**.
- 🔐 **Autenticación de Usuarios**: Registro e inicio de sesión seguro con **Firebase Authentication**.

---

## 🛠️ Arquitectura y Tecnologías

| Componente | Tecnología |
| :--- | :--- |
| **Mobile App** | React Native (v0.85), Expo (v56), React (v19) |
| **Navegación** | React Navigation v7 (Stack & Bottom Tabs) |
| **Inteligencia Artificial** | Groq Cloud API (Llama 3 / Mixtral) |
| **Base de Datos & Auth** | Firebase Cloud Firestore, Firebase Authentication |
| **Backend & Jobs** | Firebase Cloud Functions v2 (Scheduled Cron Jobs) |
| **APIs Deportivas** | Football-Data.org, The Odds API, API-Sports (API-Football) |

---

## 🚀 Instalación y Configuración

### Prerrequisitos

- **Node.js** (v18 o superior)
- **npm** o **yarn**
- Aplicación **Expo Go** instalada en tu dispositivo móvil o un simulador iOS/Android.

### 1. Clonar el repositorio

```bash
git clone https://github.com/tu-usuario/SoccerstAI.git
cd SoccerstAI
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

Copia el archivo `.env.example` a `.env`:

```bash
cp .env.example .env
```

Edita `.env` agregando tus credenciales:

```env
EXPO_PUBLIC_GROQ_API_KEY=tu_groq_api_key
EXPO_PUBLIC_FD_API_KEY=tu_football_data_key
EXPO_PUBLIC_ODDS_API_KEY=tu_odds_api_key
EXPO_PUBLIC_FOOTBALL_API_KEY=tu_football_api_key
```

---

## 📱 Ejecución en Desarrollo

Iniciar el servidor de desarrollo de Expo:

```bash
npm start
```

O para iniciar directamente en plataformas específicas:

```bash
npm run android   # Para emulador o dispositivo Android
npm run ios       # Para simulador iOS (macOS)
npm run web       # Para versión Web
```

---

## ☁️ Firebase Cloud Functions

Las funciones programadas en [`functions/index.js`](file:///Users/chopyrul/2.%20Gravity%20Projects/SoccerstAI/functions/index.js) se encargan de refrescar los datos automáticamente en Firestore:

- **`syncMatchesByDate`**: Sincroniza partidos del día cada 2 minutos.
- **`syncOdds`**: Actualiza cuotas activas cada 5 minutos.

Para desplegar las funciones a Firebase:

```bash
cd functions
npm install
firebase deploy --only functions
```

---

## 🛡️ Reglas de Seguridad (Firestore)

Asegúrate de aplicar las reglas definidas en [`firestore.rules`](file:///Users/chopyrul/2.%20Gravity%20Projects/SoccerstAI/firestore.rules) en tu consola de Firebase para proteger la lectura/escritura de los documentos.

---

## 📜 Licencia

Este proyecto está bajo la Licencia **MIT**. Consulta el archivo [`LICENSE`](file:///Users/chopyrul/2.%20Gravity%20Projects/SoccerstAI/LICENSE) para más detalles.
