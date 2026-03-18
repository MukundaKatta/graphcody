import tiktoken
from openai import OpenAI
from app.core.config import get_settings


def get_openai_client() -> OpenAI:
    settings = get_settings()
    return OpenAI(api_key=settings.openai_api_key)


def generate_embedding(text: str) -> list[float]:
    """Generate an embedding vector for the given text."""
    settings = get_settings()
    client = get_openai_client()

    # Truncate to token limit
    enc = tiktoken.encoding_for_model(settings.embedding_model)
    tokens = enc.encode(text)
    if len(tokens) > 8000:
        tokens = tokens[:8000]
        text = enc.decode(tokens)

    response = client.embeddings.create(
        model=settings.embedding_model,
        input=text,
    )
    return response.data[0].embedding


def generate_embeddings_batch(texts: list[str]) -> list[list[float]]:
    """Generate embeddings for a batch of texts."""
    settings = get_settings()
    client = get_openai_client()
    enc = tiktoken.encoding_for_model(settings.embedding_model)

    truncated = []
    for text in texts:
        tokens = enc.encode(text)
        if len(tokens) > 8000:
            tokens = tokens[:8000]
            text = enc.decode(tokens)
        truncated.append(text)

    response = client.embeddings.create(
        model=settings.embedding_model,
        input=truncated,
    )
    return [item.embedding for item in response.data]


def generate_chat_completion(
    messages: list[dict],
    temperature: float = 0.3,
    max_tokens: int = 4096,
) -> str:
    """Generate a chat completion."""
    settings = get_settings()
    client = get_openai_client()

    response = client.chat.completions.create(
        model=settings.chat_model,
        messages=messages,
        temperature=temperature,
        max_tokens=max_tokens,
    )
    return response.choices[0].message.content or ""
