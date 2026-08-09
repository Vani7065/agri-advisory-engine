from openai import OpenAI
from app.core.config import settings

client = OpenAI(api_key=settings.OPENAI_API_KEY)


def generate_agri_response(query: str, intent: str, entities: dict) -> str:
    """
    Generate an agricultural advisory using OpenAI.
    """

    prompt = f"""
You are an expert agricultural advisor.

Farmer Query:
{query}

Detected Intent:
{intent}

Entities:
{entities}

Give practical agricultural advice in simple language.
Include:
1. Problem
2. Cause
3. Solution
4. Prevention

Keep the answer under 150 words.
"""

    try:
        response = client.chat.completions.create(
            model="gpt-3.5-turbo-0125",
            messages=[
                {
                    "role": "system",
                    "content": "You are an agricultural expert helping Indian farmers."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.4,
            max_tokens=300
        )

        return response.choices[0].message.content.strip()

    except Exception as e:
        print("OpenAI Error:", e)
        return "Sorry, I could not generate an agricultural advisory at this time."