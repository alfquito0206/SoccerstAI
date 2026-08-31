const GROQ_API_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY;
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.3-70b-versatile';

function buildPrompt({ homeTeam, awayTeam, league, stats, h2h }) {
  const hasStats = stats?.length > 0;

  const h2hSummary = h2h.length
    ? h2h.slice(0, 5)
        .map((m) => `${m.teams.home.name} ${m.goals.home}-${m.goals.away} ${m.teams.away.name} (${m.league.season})`)
        .join(' | ')
    : 'Sin historial disponible';

  const getStat = (teamIdx, key) =>
    stats?.[teamIdx]?.statistics?.find((s) => s.type === key)?.value ?? 'N/D';

  const statsSection = hasStats
    ? `ESTADÍSTICAS DEL PARTIDO:
- Posesión: ${homeTeam.name} ${getStat(0, 'Ball Possession')} | ${awayTeam.name} ${getStat(1, 'Ball Possession')}
- Tiros al arco: ${homeTeam.name} ${getStat(0, 'Shots on Goal')} | ${awayTeam.name} ${getStat(1, 'Shots on Goal')}
- Tiros totales: ${homeTeam.name} ${getStat(0, 'Total Shots')} | ${awayTeam.name} ${getStat(1, 'Total Shots')}
- Córners: ${homeTeam.name} ${getStat(0, 'Corner Kicks')} | ${awayTeam.name} ${getStat(1, 'Corner Kicks')}
- Tarjetas amarillas: ${homeTeam.name} ${getStat(0, 'Yellow Cards')} | ${awayTeam.name} ${getStat(1, 'Yellow Cards')}
- xG: ${homeTeam.name} ${getStat(0, 'expected_goals')} | ${awayTeam.name} ${getStat(1, 'expected_goals')}
- Faltas: ${homeTeam.name} ${getStat(0, 'Fouls')} | ${awayTeam.name} ${getStat(1, 'Fouls')}`
    : `ESTADÍSTICAS: Partido aún no jugado — usa el historial H2H y tu conocimiento de estos equipos en ${league.name}.`;

  return `Eres un analista experto en fútbol de clubes y apuestas deportivas. Analiza el siguiente partido.

PARTIDO: ${homeTeam.name} (local) vs ${awayTeam.name} (visitante)
COMPETICIÓN: ${league.name}${league.round ? ` · ${league.round}` : ''}

${statsSection}

HISTORIAL H2H reciente (últimos 5 disponibles): ${h2hSummary}

INSTRUCCIONES:
- Si las estadísticas son N/D, basa el análisis en el H2H y tu conocimiento propio de estos equipos y la liga.
- Considera la ventaja de local de ${homeTeam.name}.
- Sé específico con los equipos mencionados, no genérico.

Responde ÚNICAMENTE con JSON válido sin markdown, con esta estructura:
{
  "resumen": "Párrafo de 3-4 oraciones explicando el contexto del partido, forma reciente y patrones clave.",
  "mercados": [
    {
      "mercado": "Nombre del mercado",
      "prediccion": "Predicción concreta",
      "probabilidad": 75,
      "confianza": "Alta",
      "razon": "Explicación breve basada en los datos disponibles."
    }
  ],
  "valueBets": [
    {
      "apuesta": "Descripción de la apuesta",
      "valor": "Alto",
      "razon": "Por qué tiene valor esta apuesta."
    }
  ]
}

Analiza estos 4 mercados: Más/Menos 2.5 Goles, Ambos Equipos Marcan, Total Córners +/- 9.5, Total Tarjetas +/- 3.5.
Solo incluye en valueBets apuestas con probabilidad mayor al 65%.`;
}

export async function analyzeMatch(data) {
  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: 'user', content: buildPrompt(data) }],
      max_tokens: 1024,
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message ?? `Groq error ${res.status}`);
  }

  const json = await res.json();
  const raw = json.choices[0].message.content;
  const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  return JSON.parse(cleaned);
}
