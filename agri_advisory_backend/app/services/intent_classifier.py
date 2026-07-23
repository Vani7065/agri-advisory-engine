from transformers import pipeline

# Candidate intents
CANDIDATE_LABELS = [
    "CROP_ADVISORY",
    "MARKET_PRICES",
    "WEATHER_INFO",
    "SCHEME_LOOKUP"
]

# Load HuggingFace zero-shot classifier
classifier = pipeline(
    "zero-shot-classification",
    model="facebook/bart-large-mnli"
)


def classify_intent(query: str) -> str:
    """
    Predict the intent of the user's query.
    """
    result = classifier(
        query,
        candidate_labels=CANDIDATE_LABELS
    )

    return result["labels"][0]