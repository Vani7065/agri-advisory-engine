from dotenv import load_dotenv
from openai import OpenAI
import os

load_dotenv()

api_key = os.getenv("OPENAI_API_KEY")

print("API Key Loaded:", api_key is not None)

client = OpenAI(api_key=api_key)

models = client.models.list()

for model in models.data:
    print(model.id)