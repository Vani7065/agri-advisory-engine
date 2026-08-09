from app.services.nlp_engine import nlp_engine
from app.services.nlp_engine import nlp_engine

print(nlp_engine.extract_crop("tomato"))
print(nlp_engine.extract_crop("What is tomato mandi price today?"))
print(nlp_engine.extract_crop("rice"))
print("Crop list:")
print(nlp_engine.crop_list)
from app.services.nlp_engine import nlp_engine

print(
    nlp_engine.extract_crop(
        "Should I use urea fertilizer for rice?"
    )
)

queries = [
    "My tomato leaves have brown spots",
    "Should I use urea fertilizer for rice?",
    "What is tomato mandi price today?",
    "Will it rain tomorrow in Bangalore?"
]

for q in queries:
    print("\nQuery:", q)
    print(nlp_engine.process(q))