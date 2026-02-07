"""
MeritSim - OpenAI Service
Integration with OpenAI GPT for pedagogical explanations
"""
import os
import json
from typing import Optional, Dict, Any
from openai import OpenAI

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "your-openai-api-key")

# Initialize OpenAI client
client = None
if OPENAI_API_KEY and OPENAI_API_KEY != "your-openai-api-key":
    # Let OpenAI pick up the key from environment or handle it internally
    # Removing explicit api_key= to avoid TypeError in some httpx/openai version combinations
    client = OpenAI()


def get_openai_client():
    """Get the OpenAI client instance"""
    return client


async def generate_explanation_openai(
    question_text: str,
    correct_answer: str,
    user_answer: str,
    topic: Optional[str] = None,
    is_correct: bool = False
) -> str:
    """Generate a pedagogical explanation using OpenAI GPT."""
    if not client:
        return "Explicación no disponible. Configure la API de OpenAI."
    
    system_prompt = """Eres un tutor educativo amigable y motivador para estudiantes que preparan exámenes de estado en Colombia.
Tu rol es explicar conceptos de forma clara, usar un tono positivo y motivador, e incluir emojis de forma moderada.
Responde siempre en español colombiano."""

    user_prompt = f"""{"¡El estudiante respondió correctamente! 🎉" if is_correct else "El estudiante se equivocó, pero es una oportunidad de aprendizaje."}

Pregunta: {question_text}
Respuesta correcta: Opción {correct_answer}
Respuesta del estudiante: Opción {user_answer}
{"Tema: " + topic if topic else ""}

Genera una explicación educativa breve (máximo 3 párrafos) que:
1. {"Felicite al estudiante y refuerce por qué es correcta" if is_correct else "Explique amablemente por qué la respuesta correcta es la mejor opción"}
2. Proporcione contexto relevante sobre el tema
3. {"Sugiera cómo aplicar este conocimiento" if is_correct else "Ofrezca consejos para recordar este concepto"}"""

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            max_tokens=500,
            temperature=0.7
        )
        return response.choices[0].message.content
    except Exception as e:
        print(f"Error generating OpenAI explanation: {e}")
        return "No se pudo generar la explicación en este momento."


async def generate_study_recommendation_openai(
    weak_topics: list,
    recent_errors: list
) -> str:
    """Generate personalized study recommendations using OpenAI GPT."""
    if not client:
        return "Configure la API de OpenAI para recomendaciones personalizadas."
    
    system_prompt = """Eres un asesor de estudio experto para exámenes de estado en Colombia.
Ofreces consejos prácticos, motivadores y personalizados. Usa viñetas y emojis."""

    user_prompt = f"""El estudiante tiene dificultades en estos temas: {', '.join(weak_topics) if weak_topics else 'No identificados'}

Errores recientes:
{chr(10).join([f"- {e}" for e in recent_errors[:5]]) if recent_errors else "Sin errores recientes"}

Genera una recomendación de estudio personalizada que:
1. Priorice los temas más débiles
2. Sugiera técnicas de estudio específicas
3. Proponga un mini-plan de acción para la próxima sesión
4. Sea motivador y alcanzable

Responde de forma concisa (máximo 4 puntos)."""

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            max_tokens=400,
            temperature=0.7
        )
        return response.choices[0].message.content
    except Exception as e:
        print(f"Error generating OpenAI recommendation: {e}")
        return "No se pudieron generar recomendaciones en este momento."


async def chat_with_tutor(
    user_message: str,
    context: Optional[str] = None
) -> str:
    """Have a conversation with the AI tutor about study topics."""
    if not client:
        return "Configure la API de OpenAI para usar el tutor."
    
    system_prompt = """Eres MeritBot, un tutor virtual amigable especializado en preparación para exámenes de estado colombianos (DIAN, CAR, Acueducto).

Tus características:
- Explicas conceptos de derecho administrativo, tributario y ambiental de forma simple
- Usas ejemplos prácticos de Colombia
- Eres motivador y paciente
- Respondes de forma concisa pero completa
- Usas emojis moderadamente para hacer la conversación amigable

Siempre responde en español colombiano."""

    messages = [{"role": "system", "content": system_prompt}]
    
    if context:
        messages.append({"role": "user", "content": f"Contexto actual: {context}"})
        messages.append({"role": "assistant", "content": "Entendido, tengo ese contexto en cuenta."})
    
    messages.append({"role": "user", "content": user_message})

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            max_tokens=600,
            temperature=0.8
        )
        return response.choices[0].message.content
    except Exception as e:
        print(f"Error in chat with tutor: {e}")
        return "Lo siento, hubo un error. ¿Puedes intentar de nuevo?"


async def generate_ai_question(
    entity_name: str = "General",
    topic: Optional[str] = None,
    profile_name: Optional[str] = None
) -> Dict[str, Any]:
    """Generate a random exam question using OpenAI."""
    if not client:
        return {"error": "OpenAI API not configured"}
    
    system_prompt = """Eres un experto generador de preguntas para exámenes de estado en Colombia (DIAN, CAR, Acueducto, CNSC).
Tu tarea es crear una pregunta de opción múltiple realista, desafiante y educativa.
La salida DEBE ser un JSON válido con esta estructura:
{
    "text": "Texto de la pregunta",
    "option_a": "Opción A",
    "option_b": "Opción B",
    "option_c": "Opción C",
    "option_d": "Opción D",
    "correct_answer": "A, B, C o D",
    "explanation": "Explicación detallada de por qué es la correcta",
    "topic": "Tema específico",
    "difficulty": 1-3
}"""

    user_prompt = f"""Genera una pregunta tipo examen para la entidad: {entity_name}.
{f"Perfil/Cargo: {profile_name}" if profile_name else ""}
{f"Tema específico: {topic}" if topic else "Tema: Cualquier tema relevante para un examen de esta entidad (Derecho, Administración, Técnica, etc)."}

Asegúrate de que la pregunta sea técnica y específica del contexto colombiano.
NO inventes leyes inexistentes. Usa normativa real."""

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            response_format={"type": "json_object"},
            max_tokens=600,
            temperature=0.8
        )
        content = response.choices[0].message.content
        return json.loads(content)
    except Exception as e:
        print(f"Error generating AI question: {e}")
        return {
            "error": "Failed to generate question",
            "text": "Error al generar pregunta con IA. Intenta de nuevo.",
            "option_a": "Error",
            "option_b": "Error",
            "option_c": "Error",
            "option_d": "Error", 
            "correct_answer": "A",
            "explanation": "Hubo un problema de conexión con la IA."
        }
