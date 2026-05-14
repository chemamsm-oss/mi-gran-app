
import { GoogleGenAI, Type } from "@google/genai";
import { TextType, AIAuditError } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const TOPICS = {
  [TextType.PLANO]: [
    "el debate parlamentario sobre la Ley Orgánica del Régimen Electoral General",
    "la tramitación de la Ley Orgánica del Tribunal Constitucional y sus enmiendas",
    "el análisis de la Ley Orgánica del Poder Judicial en el Congreso de los Diputados",
    "el discurso de defensa de la Ley Orgánica de Educación en sede parlamentaria",
    "la comisión de investigación sobre la financiación de partidos políticos",
    "el debate sobre el estado de la nación y las resoluciones aprobadas",
    "la tramitación parlamentaria de los Presupuestos Generales del Estado",
    "la moción de censura y los mecanismos de control al Gobierno",
    "la aprobación de la Ley Orgánica de Protección de Datos y Garantía de los Derechos Digitales",
    "el debate de totalidad de la Ley Orgánica de Libertad Sindical",
    "la intervención parlamentaria sobre la Ley Orgánica de Seguridad Ciudadana",
    "el proceso de convalidación de Reales Decretos-leyes en el Congreso",
    "el papel del Senado en la lectura y enmienda de Leyes Orgánicas",
    "la sesión constitutiva de las Cortes Generales y el reglamento del Congreso",
    "el debate parlamentario sobre la Ley Orgánica de Universidades",
    "la tramitación de la Ley Orgánica de Régimen Disciplinario de las Fuerzas Armadas",
    "el análisis de la Ley Orgánica del Defensor del Pueblo en comisión",
    "la comparecencia del Presidente del Gobierno ante el Pleno del Congreso",
    "el debate de la Ley Orgánica de Estabilidad Presupuestaria y Sostenibilidad Financiera",
    "la aprobación de la Ley Orgánica reguladora de los estados de alarma, excepción y sitio",
    "la reforma del Código Penal en materia de delitos contra la Administración Pública",
    "el debate sobre la Ley de Enjuiciamiento Criminal y la figura del juez instructor",
    "la transposición de directivas europeas sobre medio ambiente en la legislación nacional",
    "el análisis histórico de la Ley para la Reforma Política de 1976",
    "la discusión en comisión sobre la Ley de Memoria Democrática",
    "el debate de investidura y la exposición del programa de gobierno",
    "la regulación del derecho de asilo y la protección subsidiaria",
    "la tramitación de la Ley de Bases de Régimen Local",
    "el debate sobre la financiación autonómica y la LOFCA",
    "la reforma de la Ley de Extranjería y el debate migratorio",
    "la discusión parlamentaria sobre la Ley del Aborto y los derechos reproductivos",
    "el análisis de la Ley de Contratos del Sector Público",
    "la tramitación de la Ley de Transparencia, Acceso a la Información Pública y Buen Gobierno",
    "el debate sobre la Ley del Deporte y las federaciones",
    "la aprobación de la Ley de Propiedad Intelectual y los derechos de autor",
    "el debate sobre la Ley de Arrendamientos Urbanos y el acceso a la vivienda",
    "la tramitación de la Ley General de Sanidad",
    "el análisis de la Ley de Prevención de Riesgos Laborales",
    "el debate sobre la Ley de Igualdad Efectiva de Mujeres y Hombres",
    "la discusión de la Ley de Protección a la Infancia y a la Adolescencia",
    "la regulación de la inteligencia artificial y algoritmos en el marco europeo",
    "la protección del medio ambiente y transición energética en la legislación española",
    "los derechos digitales y privacidad ciudadana ante las nuevas tecnologías",
    "la modernización de la administración pública y reducción de la burocracia",
    "la protección de datos personales en el ámbito sanitario y de investigación",
    "la regulación del teletrabajo y conciliación de la vida familiar y laboral",
    "la ley de vivienda, regulación de desahucios y control de alquileres",
    "la regulación de las criptomonedas y activos digitales en el sistema financiero",
    "la ley de bienestar animal y protección de especies en peligro",
    "la reforma laboral y medidas para la lucha contra la precariedad en el empleo",
    "la regulación del mercado eléctrico y el control de precios de la energía",
    "la regulación de la publicidad de juegos de azar y apuestas online",
    "la ley de fomento del ecosistema de empresas emergentes y startups",
    "la concesión de subvenciones para proyectos de I+D+i y su justificación",
    "la expropiación forzosa por obras de alta velocidad y justiprecio",
    "la resolución de un recurso de alzada sobre planeamiento urbanístico",
    "la aprobación de bases para oposiciones a la Administración de Justicia",
    "la declaración de impacto ambiental de grandes infraestructuras",
    "la imposición de sanciones por fraude fiscal y blanqueo de capitales",
    "la adjudicación de contratos de suministros hospitalarios y recursos",
    "la aprobación de planes de igualdad en empresas públicas y privadas",
    "la resolución de un expediente de responsabilidad patrimonial de la Administración",
    "la resolución de un conflicto de atribuciones entre ministerios",
    "la instrucción de un expediente disciplinario a un funcionario público",
    "la reciente jurisprudencia del Tribunal Constitucional sobre el derecho al olvido",
    "los límites de la libertad de expresión y la tipificación de los delitos de odio",
    "el impacto de las directivas europeas en el derecho civil y mercantil español",
    "la evolución del concepto de familia y filiación en el Código Civil",
    "la responsabilidad del Estado legislador por actos inconstitucionales",
    "el derecho a la tutela judicial efectiva y el acceso a la justicia gratuita",
    "la aplicación de la perspectiva de género en la interpretación del derecho",
    "la evolución del derecho administrativo sancionador y sus garantías",
    "los retos de la justicia restaurativa y la mediación penal en España",
    "el impacto del Brexit en las relaciones jurídicas y comerciales con el Reino Unido",
    "la protección jurídica de los denunciantes de corrupción y alertadores",
    "el análisis de la ley de segunda oportunidad y exoneración del pasivo insatisfecho",
    "la regulación de la economía colaborativa y las plataformas digitales",
    "la protección jurídica de las personas con discapacidad y su capacidad jurídica",
    "el análisis del derecho a la huelga y la fijación de servicios mínimos esenciales"
  ]
};

const PROMPTS = {
  [TextType.PLANO]: "Genera un texto extenso de prosa continua sobre {TOPIC}. REGLA CRÍTICA: NO uses encabezados, NO uses listas, NO uses saludos ni despedidas. Solo párrafos de texto plano, denso y fluido. El texto DEBE tener un tono marcadamente parlamentario, legislativo o jurídico-administrativo, citando explícitamente artículos de la Constitución, Leyes Orgánicas reales (con su año y número) y terminología propia de las Cortes Generales o la Administración Pública. OTRA REGLA CRÍTICA: Escribe siempre los números con cifras (ej. 'artículo 12.3', '1500', '2024') y no con letras ('doce punto tres', 'mil quinientos'). {PERSPECTIVE}"
};

const PERSPECTIVES_PLANO = [
  "Escribe desde la perspectiva de un Voto Particular discrepante emitido por un magistrado o diputado de la oposición, criticando duramente la medida con argumentos técnicos.",
  "Escribe desde la perspectiva de un Diario de Sesiones histórico, transcribiendo un discurso apasionado y vehemente de defensa de la ley desde la tribuna del Congreso.",
  "Escribe desde la perspectiva de un informe técnico frío, objetivo y extremadamente denso elaborado por los Letrados de las Cortes Generales advirtiendo de posibles inconstitucionalidades.",
  "Escribe desde la perspectiva de una Exposición de Motivos de una ley, justificando la necesidad imperiosa y urgente de la reforma legislativa con datos y contexto socioeconómico.",
  "Escribe desde la perspectiva de un dictamen del Consejo de Estado, analizando minuciosamente la técnica normativa y la adecuación del texto al ordenamiento jurídico vigente.",
  "Escribe desde la perspectiva de una sentencia del Tribunal Supremo sentando jurisprudencia sobre la interpretación de esta norma en un caso complejo y controvertido.",
  "Escribe desde la perspectiva de un discurso de investidura, donde el candidato a Presidente del Gobierno desgrana este tema como el pilar fundamental de su futura legislatura."
];

export const generateLegislativeText = async (type: TextType = TextType.PLANO): Promise<string> => {
  try {
    const topics = TOPICS[TextType.PLANO];
    const randomTopic = topics[Math.floor(Math.random() * topics.length)];
    let basePrompt = PROMPTS[TextType.PLANO].replace('{TOPIC}', randomTopic);
    
    if (type === TextType.PLANO) {
      const randomPerspective = PERSPECTIVES_PLANO[Math.floor(Math.random() * PERSPECTIVES_PLANO.length)];
      basePrompt = basePrompt.replace('{PERSPECTIVE}', randomPerspective);
    }
    
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `${basePrompt} El texto debe ser extremadamente extenso (mínimo 5000 caracteres) para una prueba de 10 minutos.`,
      config: {
        temperature: 0.9,
      }
    });

    return response.text || "Error al generar el texto.";
  } catch (error) {
    console.error("Gemini Error:", error);
    throw new Error("No se pudo conectar con el servicio de IA.");
  }
};

export const analyzeFreeText = async (text: string): Promise<AIAuditError[]> => {
  try {
    const words = text.split(/\s+/).filter(w => w !== "");
    const indexedText = words.map((w, i) => `[${i}] ${w}`).join(" ");

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: `ERES EL TRIBUNAL DE ORTOGRAFÍA DE LAS CORTES GENERALES.
Tu única misión es leer el texto del opositor y encontrar TODOS los errores ortográficos, tipográficos (erratas) y gramaticales sin excepción.

REGLAS ESTRICTAS:
1. Revisa PALABRA por PALABRA. No te dejes llevar por el contexto. Si dice "plaver" en lugar de "placer", es un ERROR.
2. Errores que debes buscar:
   - Faltas de ortografía (b/v, g/j, h, etc.)
   - Faltas de acentuación (tildes que faltan o sobran)
   - Erratas tipográficas ("mudno" por "mundo", "plaver" por "placer", "porpiedad" por "propiedad")
   - Uniones de palabras ("dela" por "de la")
3. No evalúes el estilo, puntuación estilística ni mayúsculas después de punto, SOLO ORTOGRAFÍA Y TIPOGRAFÍA.
4. El texto tiene índices: "[0] Hola [1] mudno". Usa el índice EXACTO de la palabra errónea.

CLASIFICACIÓN DEL ERROR ('type'):
- 'simple': Un solo carácter mal (ej. "plaver", "dificl"), o falta de tilde.
- 'inversion': Dos letras contiguas invertidas (ej. "mudno", "ocmo").
- 'multiple': Varios caracteres mal, o palabra irreconocible.

TEXTO DEL OPOSITOR:
${indexedText}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              word: { type: Type.STRING, description: "La palabra errónea exacta del texto" },
              correction: { type: Type.STRING, description: "La palabra correcta" },
              type: { type: Type.STRING, enum: ["simple", "inversion", "multiple"] },
              reason: { type: Type.STRING },
              index: { type: Type.INTEGER }
            },
            required: ["word", "correction", "type", "reason", "index"]
          }
        }
      }
    });

    try {
      // Remove any potential markdown formatting from the response
      const rawText = response.text || "[]";
      const cleanedText = rawText.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
      return JSON.parse(cleanedText);
    } catch (e) {
      console.error("JSON Parse Error:", e, response.text);
      return [];
    }
  } catch (error) {
    console.error("Audit Error:", error);
    return [];
  }
};
