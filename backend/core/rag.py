import os
import asyncio
import aiohttp
from bs4 import BeautifulSoup
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain_google_genai import GoogleGenerativeAIEmbeddings

async def fetch_url_text(session: aiohttp.ClientSession, url: str) -> str:
    """Scrapes a URL and extracts clean plain text, ignoring common non-content elements."""
    try:
        async with session.get(url, timeout=8.0, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}) as response:
            if response.status == 200:
                html = await response.text()
                soup = BeautifulSoup(html, "html.parser")
                # Remove non-text elements
                for element in soup(["script", "style", "nav", "footer", "header", "aside", "form"]):
                    element.decompose()
                # Extract clean text
                text = soup.get_text(separator=" ", strip=True)
                return text
    except Exception as e:
        print(f"[RAG] Failed to scrape {url}: {e}")
    return ""

async def build_rag_retriever(urls: list[str], gemini_key: str):
    """
    Given a list of URLs, scrapes them in parallel, splits the content,
    embeds them using Google Generative AI Embeddings, and builds an
    in-memory FAISS vector retriever.
    """
    if not urls or not gemini_key:
        print("[RAG] No URLs or Gemini API Key provided. Skipping vector indexing.")
        return None
        
    print(f"[RAG] Scraped URLs: {urls}")
    try:
        # 1. Scrape URLs in parallel
        async with aiohttp.ClientSession() as session:
            tasks = [fetch_url_text(session, url) for url in urls]
            pages_content = await asyncio.gather(*tasks)
            
        # 2. Filter out empty documents
        documents = [content for content in pages_content if content.strip()]
        if not documents:
            print("[RAG] No readable content extracted from the URLs.")
            return None
            
        full_text = "\n\n".join(documents)
        
        # 3. Chunk the text
        text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=150)
        chunks = text_splitter.split_text(full_text)
        print(f"[RAG] Successfully parsed web content into {len(chunks)} text chunks.")
        
        if not chunks:
            return None
            
        # 4. Embed and Index using FAISS
        embeddings = GoogleGenerativeAIEmbeddings(
            model="models/embedding-001",
            google_api_key=gemini_key
        )
        
        # Run FAISS indexing inside a thread pool since it's CPU-bound
        vectorstore = await asyncio.to_thread(
            FAISS.from_texts, chunks, embeddings
        )
        return vectorstore.as_retriever(search_kwargs={"k": 4})
    except Exception as e:
        print(f"[RAG] Error building temporary vector store: {e}")
        return None
