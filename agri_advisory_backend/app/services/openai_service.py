from openai import OpenAI
from app.core.config import settings

client = OpenAI(api_key=settings.OPENAI_API_KEY)


def generate_ai_response(query: str, entities: dict = None):
    try:

        prompt = f"""
You are an expert agricultural advisor.

Farmer Question:
{query}

Crop Information:
{entities}

Provide:

1. Problem
2. Cause
3. Recommended pesticide/fungicide/fertilizer
4. Dosage
5. Prevention
6. Additional farming tips

Respond in simple English.
"""

        response = client.chat.completions.create(
            model="gpt-3.5-turbo-0125",
            messages=[
                {
                    "role": "system",
                    "content": "You are an expert agricultural advisor."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.3,
            max_tokens=350
        )

        return response.choices[0].message.content

    except Exception as e:
        print("OpenAI Error:", e)

        return (
            "Sorry, AI service is currently unavailable. "
            "Please try again later."
        )