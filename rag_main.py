import logging
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from google.genai import errors as genai_errors
from pydantic import BaseModel, Field

from rag_setup import answer_question, get_client, get_embedder


logger = logging.getLogger("seerah")


@asynccontextmanager
async def lifespan(app: FastAPI):
    get_client()
    get_embedder()
    yield


app = FastAPI(title="Seerah RAG", lifespan=lifespan)


app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("ALLOWED_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


class AskRequest(BaseModel):
    question: str = Field(min_length=2, max_length=500)


class SourceItem(BaseModel):
    n: int
    title: str | None
    source: str


class AskResponse(BaseModel):
    answer: str
    resources: list[SourceItem]


@app.post("/ask", response_model=AskResponse)
def ask(req: AskRequest):
    try:
        return answer_question(req.question.strip())

    except genai_errors.APIError as e:
        logger.exception("Gemini error")

        if getattr(e, "code", None) == 429:
            raise HTTPException(
                429,
                "الخدمة مشغولة الآن، حاول بعد قليل."
            )

        raise HTTPException(
            502,
            "تعذّر الاتصال بخدمة التوليد."
        )

    except Exception:
        logger.exception("Unexpected error")

        raise HTTPException(
            500,
            "حدث خطأ غير متوقع."
        )



@app.get("/health")
def health():
    get_client().get_collections()

    return {"status": "ok"}