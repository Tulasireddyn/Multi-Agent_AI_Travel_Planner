from langchain_core.messages import HumanMessage
from langchain_community.utilities import GoogleSerperAPIWrapper
from backend.core.llm import get_llm
from backend.core.rag import build_rag_retriever
import json
import os
import asyncio

async def recommend_activities(state):
    llm = get_llm()
    search = GoogleSerperAPIWrapper()
    
    preferences = state.get('preferences', {})
    destination = preferences.get('destination', '')
    month = preferences.get('month', '')
    itinerary_summary = state.get('itinerary', '')[:500] 
    gemini_key = os.getenv("GEMINI_API_KEY")
    
    print(f"[BACKEND RAG] Recommending activities for {destination}...")
    
    # 1. Search for top blogs/resources
    query = f"top travel tips things to do in {destination} in {month} local blogs"
    try:
        search_results = await asyncio.to_thread(search.results, query)
        organic = search_results.get('organic', [])[:3]
        urls = [res.get('link') for res in organic if res.get('link')]
    except Exception as e:
        print(f"[BACKEND RAG] Google Serper search failed: {e}")
        urls = []
        
    # 2. Build RAG vector store and retrieve
    retrieved_context = "No live web content retrieved. Using fallback model knowledge."
    if urls and gemini_key:
        retriever = await build_rag_retriever(urls, gemini_key)
        if retriever:
            search_query = f"activities attractions hidden gems in {destination} during {month}"
            # FAISS invoke is synchronous, we run in thread pool
            docs = await asyncio.to_thread(retriever.invoke, search_query)
            retrieved_context = "\n---\n".join([doc.page_content for doc in docs])
            
    prompt = f"""
    Suggest 3-5 unique local activities and hidden gems in {destination} for the month of {month}.
    Consider these preferences: {preferences.get('holiday_type', 'Any')}
    Context itinerary: {itinerary_summary}
    
    VERIFIED LOCAL WEB DATA (Use this context as your source of truth for location details, names, and tips):
    {retrieved_context}
    
    INSTRUCTIONS:
    - Only suggest activities that exist and are supported by the verified web data or general knowledge.
    - Provide suggestions in bullet points.
    """
    
    try:
        response = await llm.ainvoke([HumanMessage(content=prompt)])
        return {"activity_suggestions": response.content}
    except Exception as e:
        print(f"[BACKEND RAG] Error in recommend_activities: {e}")
        return {"activity_suggestions": "Could not fetch activities."}