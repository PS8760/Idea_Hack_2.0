from groq import Groq
from dotenv import load_dotenv
import os, json, re

load_dotenv()

MODEL = "llama-3.3-70b-versatile"

# ── Keyword-based title extraction ────────────────────────────────────────────
# Ordered by specificity. All matches collected and joined with "/"
KEYWORD_TITLE_MAP = [
    # Account / Login
    (r'\b(otp.{0,20}(not|no|never).{0,10}(receiv|arriv|come|sent)|not.{0,10}receiv.{0,10}otp|otp.{0,10}(fail|issue|problem))\b', "OTP Issue"),
    (r'\b(can.{0,5}t?.{0,5}(log.?in|sign.?in)|unable.{0,10}(log.?in|sign.?in|access)|login.{0,10}(fail|issue|error|not.{0,5}work)|not.{0,10}(log.?in|sign.?in))\b', "Login Issue"),
    (r'\b(password.{0,15}(reset|not.{0,5}work|fail|issue|forgot|not.{0,5}receiv))\b', "Password Reset"),
    (r'\b(account.{0,15}(lock|block|suspend|ban|disabled))\b', "Account Locked"),
    (r'\b(account.{0,15}(hack|compromis|unauthoriz|breach))\b', "Account Compromised"),
    (r'\b(account.{0,15}(not.{0,5}(access|open)|access.{0,10}(deny|denied|issue)))\b', "Account Access"),
    # Billing / Payment
    (r'\b(double.?charg|charg.{0,10}twice|duplicate.{0,10}(payment|charge))\b', "Double Charge"),
    (r'\b(payment.{0,15}(fail|not.{0,5}(process|receiv|credit)|declin|stuck|pend))\b', "Payment Failed"),
    (r'\b(refund.{0,15}(not|pending|delay|no|haven|issue))\b', "Refund Pending"),
    (r'\b(overcharg|wrong.{0,10}(amount|bill|charg)|incorrect.{0,10}(bill|charg|amount))\b', "Wrong Billing"),
    (r'\b(invoice.{0,15}(wrong|incorrect|missing|not.{0,5}receiv))\b', "Invoice Issue"),
    (r'\b(subscription.{0,15}(charg|bill|renew|cancel))\b', "Subscription Issue"),
    # Delivery
    (r'\b(not.{0,10}deliver|delivery.{0,10}(fail|miss|delay|not|never)|never.{0,10}arriv|package.{0,10}(lost|missing|not))\b', "Delivery Failed"),
    (r'\b(wrong.{0,10}(item|product|order)|incorrect.{0,10}(item|product|order))\b', "Wrong Item"),
    (r'\b(order.{0,15}(cancel|not.{0,5}(confirm|process|ship)))\b', "Order Cancelled"),
    (r'\b(delay.{0,10}(deliver|ship|dispatch)|late.{0,10}(deliver|ship))\b', "Delayed Delivery"),
    # Technical
    (r'\b(app.{0,15}(crash|not.{0,5}(work|open|load)|error|bug|freeze))\b', "App Crash"),
    (r'\b(website.{0,15}(down|not.{0,5}(work|load|open)|error))\b', "Website Down"),
    (r'\b(error.{0,10}(message|code|appear|show)|getting.{0,10}error)\b', "Technical Error"),
    (r'\b(slow.{0,10}(load|response|speed)|performance.{0,10}(issue|problem))\b', "Slow Performance"),
    (r'\b(internet.{0,10}(not.{0,5}work|down|disconnect)|no.{0,5}(internet|connection|network))\b', "No Internet"),
    # Service
    (r'\b(no.{0,10}(response|reply)|support.{0,10}(not.{0,5}(respond|help|reply)|unresponsive|ignor))\b', "No Response"),
    (r'\b(rude.{0,10}(staff|agent|support)|bad.{0,10}(service|support|experience))\b', "Poor Service"),
    (r'\b(service.{0,10}(outage|down|unavailab|interrupt))\b', "Service Outage"),
    # Product
    (r'\b(product.{0,15}(defect|damage|broken|not.{0,5}work|fault|malfunction))\b', "Defective Product"),
    (r'\b(missing.{0,10}(part|item|component|accessory))\b', "Missing Parts"),
]

def extract_title_from_keywords(text: str) -> str:
    """Scan description, collect ALL matching issue labels, join with '/'."""
    lower = text.lower()
    matched = []
    seen_labels = set()
    for pattern, label in KEYWORD_TITLE_MAP:
        if label not in seen_labels and re.search(pattern, lower):
            matched.append(label)
            seen_labels.add(label)
        if len(matched) == 3:
            break
    if matched:
        return "/".join(matched)
    # Fallback: top 2 meaningful words + "Issue"
    stopwords = {
        'i','my','me','we','the','a','an','is','are','was','were','be','been',
        'have','has','had','do','did','does','not','no','and','or','but','in',
        'on','at','to','for','of','with','this','that','it','its','your','our',
        'their','from','by','as','so','if','when','then','than','very','just',
        'also','about','after','before','since','still','already','please','hello',
        'dear','sir','madam','team','customer','service','support','complaint',
        'issue','problem','facing','getting','received','would','could','should',
        'want','need','like','know','think','feel','make','take','give','come',
        'go','see','use','try','get','put','let','keep','seem','look','turn',
        'show','find','tell','ask','work','call','back','more','some','any',
        'all','will','can','may','might','must','shall','here','there',
        'what','which','who','how','why','where','into','over','such',
        'even','only','same','other','new','old','last','first','next','few',
    }
    words = re.findall(r'\b[a-zA-Z]{4,}\b', text)
    seen = set()
    keywords = []
    for w in words:
        lw = w.lower()
        if lw not in stopwords and lw not in seen:
            seen.add(lw)
            keywords.append(w.title())
        if len(keywords) == 2:
            break
    return " ".join(keywords) + " Issue" if keywords else "Service Issue"


def _get_client():
    return Groq(api_key=os.getenv("GROQ_API_KEY"))

def _chat(prompt: str) -> str:
    client = _get_client()
    resp = client.chat.completions.create(
        model=MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3,
        max_tokens=512,
    )
    return resp.choices[0].message.content.strip()

def analyze_complaint(text: str) -> dict:
    # Extract title from keywords — fast, accurate, no AI needed
    keyword_title = extract_title_from_keywords(text)

    prompt = f"""You are an expert complaint analysis AI. Analyze this customer complaint and return ONLY a raw JSON object. No explanation, no markdown, no code blocks. Just the JSON.

Required keys:
- "sentiment": "positive" or "neutral" or "negative"
- "priority": "high" or "medium" or "low"
- "category": one of Billing, Technical, Delivery, Product, Service, Account, Refund, Other
- "product": specific product/service name inferred from complaint (max 3 words, e.g. "Payment Gateway", "Broadband Service", "Mobile App")
- "summary": A single factual sentence (max 30 words) capturing: (1) what the user is experiencing, (2) the specific impact, and (3) what they want resolved. Never use generic phrases like "customer is facing an issue". Be specific to the complaint text. Example: "User cannot log in despite correct credentials and is not receiving OTP for password reset, requesting immediate account access restoration."
- "key_issues": array of 3-5 short strings, each describing a distinct specific problem extracted directly from the complaint text (e.g. ["Double charge on invoice", "No confirmation email received", "Support unresponsive for 3 days"]). Be precise and factual — pull real details from the text.
- "urgency_signals": array of 0-3 strings for urgency indicators (e.g. ["Financial loss mentioned", "Repeat complaint", "Threatening escalation"])
- "suggested_actions": array of exactly 3 short agent action strings (e.g. ["Check transaction logs", "Issue refund within 24h", "Send apology"])
- "severity_score": a number from 1 to 10. Use this scale strictly:
  1-3 = minor inconvenience, no financial impact, first time
  4-6 = moderate issue, some frustration, possible financial impact
  7-8 = significant issue, financial loss, repeated attempts, work/life impact
  9-10 = critical, legal threats, major financial loss, complete service failure

Complaint text: {text}

JSON only:"""
    try:
        raw = _chat(prompt)
        print(f"[AI RAW] {raw[:300]}")
        raw = raw.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        start = raw.find('{')
        end = raw.rfind('}') + 1
        if start == -1 or end == 0:
            raise ValueError("No JSON found in response")
        result = json.loads(raw[start:end])
        result["severity_score"] = int(result.get("severity_score", 5))
        result.setdefault("key_issues", [])
        result.setdefault("urgency_signals", [])
        result.setdefault("suggested_actions", [])
        result.setdefault("product", "General")
        # Always use keyword-extracted title
        result["title"] = keyword_title
        return result
    except Exception as e:
        print(f"[AI ERROR] analyze_complaint failed: {e}")
        sentences = re.split(r'(?<=[.!?])\s+', text.strip())
        fallback_summary = " ".join(sentences[:2])[:200].strip()
        return {
            "sentiment": "neutral", "priority": "medium", "category": "Other",
            "product": "General", "summary": fallback_summary or text[:150],
            "title": keyword_title,
            "key_issues": [], "urgency_signals": [], "suggested_actions": [],
            "severity_score": 5
        }

def suggest_reply(complaint_title: str, description: str, category: str) -> str:
    prompt = f"""You are a customer support agent. Write a professional, empathetic reply to this complaint.
Keep it under 80 words. Do not include subject line.

Category: {category}
Title: {complaint_title}
Description: {description}

Reply:"""
    return _chat(prompt)

def summarize_text(text: str) -> str:
    """Summarize a chat transcript into 1-2 sentences for escalation context."""
    prompt = f"""Summarize this customer support chat transcript in 1-2 sentences. 
Focus on the key issue discussed and outcome. Be concise.

Transcript:
{text[:2000]}

Summary:"""
    try:
        return _chat(prompt)
    except Exception:
        return "Chat session ended before resolution."
