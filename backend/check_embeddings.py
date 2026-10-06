"""Check that API embeddings match the local model, so hosted search = local search.

Run on your laptop (where the local bge-m3 model is already downloaded):
    pip install -r requirements-rag-local.txt
    cd backend && python check_embeddings.py
"""
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[1] / ".env")
import rag  # noqa: E402

QUESTIONS = ["متى كانت غزوة بدر؟", "من هي خديجة رضي الله عنها؟", "ماذا حدث في غار حراء؟", "بيعة العقبة"]


def top_ids(vec):
    pts = rag.get_client().query_points(collection_name=rag.COLLECTION, query=vec, using="dense", limit=5).points
    return [p.id for p in pts]


ok = True
for q in QUESTIONS:
    qn = rag.normalize_arabic(q)
    rag.EMBEDDINGS = "api"
    api = rag.embed_query(qn)
    rag.EMBEDDINGS = "local"
    local = rag.embed_query(qn)
    cosine = sum(a * b for a, b in zip(api, local))
    same = top_ids(api) == top_ids(local)
    ok &= cosine > 0.99 and same
    print(f"{q}\n   dims {len(api)}/{len(local)} | cosine {cosine:.4f} | same top-5 results: {same}")
print("\nRESULT:", "OK - safe to use RAG_EMBEDDINGS=api" if ok else "MISMATCH - send this output for review")
