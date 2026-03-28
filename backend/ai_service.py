from groq import Groq
from dotenv import load_dotenv
import os, json, asyncio
from functools import partial

load_dotenv()

# Use env var with a reliable fallback model
MODEL = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")

def _get_client():
    return Groq(api_key=os.getenv("GROQ_API_KEY"))

def _chat_sync(prompt: str, max_tokens: int = 512, temperature: float = 0.3) -> str:
    """Synchronous Groq call — run via asyncio executor to avoid blocking the event loop."""
    client = _get_client()
    resp = client.chat.completions.create(
        model=MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=temperature,
        max_tokens=max_tokens,
    )
    return resp.choices[0].message.content.strip()

async def _chat(prompt: str, max_tokens: int = 512, temperature: float = 0.3) -> str:
    """Async wrapper — offloads blocking Groq call to a thread pool."""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, partial(_chat_sync, prompt, max_tokens, temperature))

async def analyze_complaint(text: str) -> dict:
    prompt = f"""Analyze this customer complaint and return ONLY valid JSON with these exact keys:
- sentiment: "positive" | "neutral" | "negative"
- priority: "high" | "medium" | "low"
- category: one of [Billing, Technical, Delivery, Product, Service, Other]
- summary: one sentence summary (max 30 words)

Complaint: {text}

Return ONLY the JSON object, no explanation:"""
    try:
        raw = await _chat(prompt, max_tokens=256)
        start = raw.find('{')
        end = raw.rfind('}') + 1
        if start == -1 or end == 0:
            raise ValueError("No JSON found")
        return json.loads(raw[start:end])
    except Exception as e:
        print(f"[AI] analyze_complaint failed: {e}")
        return {"sentiment": "neutral", "priority": "medium", "category": "Other", "summary": text[:100]}

async def suggest_reply(complaint_title: str, description: str, category: str, escalation_history: list = None) -> str:
    history_ctx = ""
    if escalation_history:
        for e in escalation_history:
            summary = e.get("chat_summary", "")
            history_ctx += f"\n- Previously escalated from {e.get('from')} to {e.get('to')} channel. {summary}"

    # Use higher temperature + random seed phrase to ensure unique output each call
    import random
    seed_phrases = [
        "Focus on actionable next steps.",
        "Emphasize empathy and urgency.",
        "Be concise and solution-oriented.",
        "Highlight the resolution timeline.",
        "Acknowledge the inconvenience first.",
    ]
    style = random.choice(seed_phrases)

    prompt = f"""You are a professional customer support agent. Write a helpful, empathetic reply to this complaint.
Keep it under 100 words. Be specific to the issue. Do not include a subject line or greeting header.
Style note: {style}

Category: {category}
Title: {complaint_title}
Description: {description}{f'''
Escalation context: {history_ctx}''' if history_ctx else ''}

Reply:"""
    return await _chat(prompt, max_tokens=200, temperature=0.8)


async def ai_assist_step(complaint_title: str, description: str, category: str, conversation: list) -> str:
    """
    Step-by-step AI assistant that guides the user through resolving their issue.
    conversation: list of {"role": "user"|"assistant", "content": str}
    """
    system = f"""You are a helpful, friendly customer support AI assistant for SmartResolve.
Your job is to help the customer resolve their issue step by step.
- Ask ONE clarifying question at a time if needed
- Provide specific, actionable guidance
- Be concise (under 80 words per response)
- If you can resolve it, give clear steps
- If it needs human escalation, say so clearly

Complaint context:
Category: {category}
Title: {complaint_title}
Description: {description}"""

    messages = [{"role": "system", "content": system}]
    for msg in conversation[-10:]:  # last 10 turns for context
        messages.append({"role": msg["role"], "content": msg["content"]})

    loop = asyncio.get_event_loop()
    client = _get_client()

    def _call():
        resp = client.chat.completions.create(
            model=MODEL,
            messages=messages,
            temperature=0.6,
            max_tokens=200,
        )
        return resp.choices[0].message.content.strip()

    return await loop.run_in_executor(None, _call)

async def summarize_text(text: str) -> str:
    """Summarize a chat transcript into 1-2 sentences for escalation context."""
    prompt = f"""Summarize this customer support chat in 1-2 sentences.
Focus on the key issue and outcome. Be concise.

Transcript:
{text[:2000]}

Summary:"""
    try:
        return await _chat(prompt, max_tokens=100)
    except Exception:
        return "Chat session ended before resolution."


async def bullet_summary(title: str, description: str, category: str) -> list[str]:
    """Generate 3-5 short bullet points summarizing the complaint issue."""
    prompt = f"""Summarize this customer complaint as 3 to 5 short bullet points.
Each bullet must be under 12 words. Be specific and factual. No fluff.
Return ONLY the bullet points, one per line, starting with a dash (-).

Category: {category}
Title: {title}
Description: {description}

Bullet points:"""
    try:
        raw = await _chat(prompt, max_tokens=150, temperature=0.3)
        lines = [l.strip().lstrip('-').strip() for l in raw.strip().splitlines() if l.strip()]
        return [l for l in lines if l][:5]
    except Exception:
        return [description[:80]]
