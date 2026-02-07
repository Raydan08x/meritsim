"""
MeritSim - Gemini AI Service
Integration with Google Gemini for pedagogical explanations
"""
import os
from typing import Optional
import google.generativeai as genai

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "your-gemini-api-key")

# Configure Gemini
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)


def get_gemini_model():
    """Get the Gemini model instance"""
    if not GEMINI_API_KEY:
        return None
    return genai.GenerativeModel('gemini-pro')


async def generate_explanation(
    question_text: str,
    correct_answer: str,
    user_answer: str,
    topic: Optional[str] = None,
    is_correct: bool = False
) -> str:
    """
    Generate a pedagogical explanation for a question answer.
    
    Args:
        question_text: The question that was asked
        correct_answer: The correct option (A, B, C, D)
        user_answer: What the user selected
        topic: Optional topic for context
        is_correct: Whether the user got it right
    
    Returns:
        A friendly, educational explanation
    """
    model = get_gemini_model()
    if not model:
        return "Explicación no disponible. Configure la API de Gemini."
    
    prompt = f"""Eres un tutor educativo amigable y motivador para estudiantes que preparan exámenes de estado en Colombia.

{"¡El estudiante respondió correctamente! 🎉" if is_correct else "El estudiante se equivocó, pero es una oportunidad de aprendizaje."}

Pregunta: {question_text}
Respuesta correcta: Opción {correct_answer}
Respuesta del estudiante: Opción {user_answer}
{"Tema: " + topic if topic else ""}

Genera una explicación educativa breve (máximo 3 párrafos) que:
1. {"Felicite al estudiante y refuerce por qué es correcta" if is_correct else "Explique amablemente por qué la respuesta correcta es la mejor opción"}
2. Proporcione contexto relevante sobre el tema
3. {"Sugiera cómo aplicar este conocimiento" if is_correct else "Ofrezca consejos para recordar este concepto"}

Usa un tono amigable, motivador y pedagógico. Incluye emojis de forma moderada.
Responde en español colombiano."""

    try:
        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        print(f"Error generating Gemini explanation: {e}")
        return "No se pudo generar la explicación en este momento."


async def generate_study_recommendation(
    weak_topics: list,
    recent_errors: list
) -> str:
    """
    Generate personalized study recommendations based on user weaknesses.
    
    Args:
        weak_topics: List of topics where user struggles
        recent_errors: List of recent wrong answers
    
    Returns:
        Personalized study advice
    """
    model = get_gemini_model()
    if not model:
        return "Configure la API de Gemini para recomendaciones personalizadas."
    
    prompt = f"""Eres un asesor de estudio experto para exámenes de estado en Colombia.

El estudiante tiene dificultades en estos temas: {', '.join(weak_topics) if weak_topics else 'No identificados'}

Errores recientes:
{chr(10).join([f"- {e}" for e in recent_errors[:5]]) if recent_errors else "Sin errores recientes"}

Genera una recomendación de estudio personalizada que:
1. Priorice los temas más débiles
2. Sugiera técnicas de estudio específicas
3. Proponga un mini-plan de acción para la próxima sesión
4. Sea motivador y alcanzable

Responde en español, de forma concisa (máximo 4 puntos).
Usa viñetas y emojis para hacerlo visualmente atractivo."""

    try:
        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        print(f"Error generating study recommendation: {e}")
        return "No se pudieron generar recomendaciones en este momento."


async def summarize_material(file_content: str, max_length: int = 500) -> str:
    """
    Generate a summary of study material content.
    
    Args:
        file_content: Text content from a PDF or document
        max_length: Maximum characters for the summary
    
    Returns:
        Concise summary of the material
    """
    model = get_gemini_model()
    if not model:
        return "Configure la API de Gemini para resumir materiales."
    
    prompt = f"""Resume el siguiente material de estudio para un examen de estado colombiano.

Contenido:
{file_content[:5000]}  # Limit input length

Genera un resumen que:
1. Identifique los conceptos clave
2. Destaque puntos importantes para el examen
3. Sea fácil de memorizar
4. No exceda {max_length} caracteres

Responde en español, formato de puntos clave."""

    try:
        response = model.generate_content(prompt)
        return response.text[:max_length]
    except Exception as e:
        print(f"Error summarizing material: {e}")
        return "No se pudo generar el resumen."
