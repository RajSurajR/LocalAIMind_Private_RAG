"""LLM configuration and prompt management.

This class wraps the model client and centralizes the prompt templates used for retrieval and final answer generation.
By keeping them in one place, we can swap models cleanly without rewriting the full RAG logic.
contains : 
1. constructor : store model_name, llm_model obj
2. get_query_prompt : return PromptyTemplate( ... {question})
3. get_rag_prompt : return ChatPromptTemplate(.... {context} ... {question})
4. supports_thinking : return true/false => current_model thinker model
"""

from langchain_core.prompts import ChatPromptTemplate, PromptTemplate
from langchain_ollama import ChatOllama
from backend.config import settings

class LLMManager:
    """Manage the selected Ollama model and prompt templates."""

    def __init__(self, model_name: str = settings.DEFAULT_CHAT_MODEL):
        self.model_name = model_name
        self.llm = ChatOllama(model=model_name)

    def get_query_prompt(self) -> PromptTemplate:
        """Create a prompt for generating better alternative queries."""
        return PromptTemplate(
            input_variables=["question"],
            template="""You are an AI language model assistant. Generate 2 different versions
            of the user question to improve retrieval from a vector database.
            Return each alternative question on a separate line.
            Original question: {question}""",
        )

    def get_rag_prompt(self) -> ChatPromptTemplate:
        """Create the final answer prompt used after retrieval."""
        template = """Answer the question based ONLY on the following context from multiple PDF documents.
        Each section is marked with its source document.

        Use reasoning steps:
        1. Identify the relevant information
        2. Compare sources and synthesize an answer
        3. Cite the source document for every important claim

        Context:
        {context}

        Question: {question}

        Think step-by-step and provide the final answer with source citations."""
        return ChatPromptTemplate.from_template(template)

    def supports_thinking(self) -> bool:
        """Return True for models that support the Ollama thinking mode."""
        thinking_markers = ["qwen3", "deepseek-r1", "qwen", "deepseek"]
        return any(marker in self.model_name.lower() for marker in thinking_markers)
