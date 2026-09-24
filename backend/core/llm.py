import os
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage
try:
    from langchain_ollama import ChatOllama
except ImportError:
    from langchain_community.chat_models import ChatOllama

# Import Gemini LangChain integration
try:
    from langchain_google_genai import ChatGoogleGenerativeAI
except ImportError:
    ChatGoogleGenerativeAI = None

class SafeLLMWrapper:
    def __init__(self, llm):
        self.llm = llm

    def invoke(self, *args, **kwargs):
        res = self.llm.invoke(*args, **kwargs)
        if hasattr(res, "content") and isinstance(res.content, list):
            res.content = self._extract_text(res.content)
        return res

    async def ainvoke(self, *args, **kwargs):
        res = await self.llm.ainvoke(*args, **kwargs)
        if hasattr(res, "content") and isinstance(res.content, list):
            res.content = self._extract_text(res.content)
        return res
        
    def _extract_text(self, content_list):
        text_parts = []
        for part in content_list:
            if isinstance(part, dict) and part.get("type") == "text":
                text_parts.append(part.get("text", ""))
            elif isinstance(part, str):
                text_parts.append(part)
        return "".join(text_parts)

    def __getattr__(self, name):
        return getattr(self.llm, name)

def get_llm():
    """
    Returns an LLM instance based on environment variables.
    Defaults to Gemini (if API key is present) with local Ollama fallback.
    """
    use_cloud = os.getenv("USE_CLOUD_LLM", "false").lower() == "true"
    
    if use_cloud:
        api_key = os.getenv("OPENAI_API_KEY")
        if api_key:
            return SafeLLMWrapper(ChatOpenAI(model="gpt-4o", openai_api_key=api_key))
    
    # Initialize local Ollama (used as fallback or primary)
    base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    model = os.getenv("OLLAMA_MODEL", "llama3.2")
    
    ollama_llm = ChatOllama(
        model=model, 
        base_url=base_url,
        temperature=0.1,    # Lower temperature for faster, more focused output
    )
    
    gemini_key = os.getenv("GEMINI_API_KEY")
    if gemini_key and ChatGoogleGenerativeAI is not None:
        try:
            gemini_llm = ChatGoogleGenerativeAI(
                model="gemini-3.6-flash",
                google_api_key=gemini_key,
                temperature=0.1,
            )
            # Return wrapped Gemini with fallback to Ollama
            return SafeLLMWrapper(gemini_llm.with_fallbacks([ollama_llm]))
        except Exception as e:
            print(f"[LLM CONFIG] Failed to initialize Gemini model: {e}. Falling back to Ollama.")
            return SafeLLMWrapper(ollama_llm)
            
    return SafeLLMWrapper(ollama_llm)
