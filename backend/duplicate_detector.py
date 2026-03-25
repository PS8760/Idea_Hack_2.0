"""
Semantic duplicate detection — gracefully disabled if sentence-transformers
is not installed (e.g. on lightweight cloud deployments).
"""
try:
    from sentence_transformers import SentenceTransformer
    import numpy as np

    _model = None

    def get_model():
        global _model
        if _model is None:
            _model = SentenceTransformer("all-MiniLM-L6-v2")
        return _model

    def embed(text: str) -> list:
        return get_model().encode(text).tolist()

    def cosine_similarity(a: list, b: list) -> float:
        a, b = np.array(a), np.array(b)
        return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b) + 1e-9))

    async def find_duplicates(db, text: str, threshold: float = 0.85, exclude_id=None) -> list:
        new_emb = embed(text)
        cursor = db.complaints.find({"embedding": {"$exists": True}})
        duplicates = []
        async for doc in cursor:
            if exclude_id and str(doc["_id"]) == str(exclude_id):
                continue
            sim = cosine_similarity(new_emb, doc["embedding"])
            if sim >= threshold:
                duplicates.append(str(doc["_id"]))
        return duplicates

except ImportError:
    # sentence-transformers not available — duplicate detection disabled
    async def find_duplicates(db, text: str, threshold: float = 0.85, exclude_id=None) -> list:
        return []
