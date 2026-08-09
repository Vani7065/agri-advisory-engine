from openai import OpenAI
from app.core.config import settings

client = OpenAI(api_key=settings.OPENAI_API_KEY)


def generate_ai_response(query: str):
    response = client.chat.completions.create(
        model="gpt-3.5-turbo-0125",
        messages=[
            {
                "role": "system",
                "content": "You are an expert agricultural advisor. Give practical advice to farmers."
            },
            {
                "role": "user",
                "content": query
            }
        ],
        temperature=0.4,
    )

    return response.choices[0].message.content