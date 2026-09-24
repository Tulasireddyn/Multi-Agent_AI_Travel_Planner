

from langchain_core.messages import HumanMessage
from backend.core.llm import get_llm
import json

async def chat_node(state):
    llm = get_llm()
    prompt = f"""
    Context:
    Preferences: {json.dumps(state['preferences'], indent=2)}
    Itinerary: {state['itinerary']}
    
    Previous History: {json.dumps(state['chat_history'], indent=2)}
    
    User Question: {state['user_question']}
    
    Respond as a helpful travel assistant.
    """
    try:
        response = await llm.ainvoke([HumanMessage(content=prompt)])
        answer = response.content
        state['chat_history'].append({"question": state['user_question'], "response": answer})
        return {"chat_response": answer, "chat_history": state['chat_history']}
    except Exception:
        return {"chat_response": "Sorry, I'm having trouble responding right now.", "chat_history": state['chat_history']}