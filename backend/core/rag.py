"""Retrieval-Augmented Generation pipeline.

This class ties the vector retrieval and LLM response together. The usual flow is:
1. fetch relevant chunks from the vector store
2. build context from the retrieved passages
3. ask the LLM to answer using that context
4. optionally use a thinking-capable model for deeper reasoning

contains : 
1. constructor : vector_db obj, LLMManager obj 
2. build_chain : i/p:{context:_ , question: _} => get_rag_prompt() => llm => StrOutputParser
3. get_response : (question, fromatted_context) => build_chain and invoke chain by give question
4. get_thinking_response : (question, formatted_conted) => use ollama.chat and show thinking
"""

import ollama
from langchain_core.output_parsers import StrOutputParser

from backend.core.llm import LLMManager


class RAGPipeline:
    """Reusable RAG orchestration class for the service layer."""

    def __init__(self, vector_db=None, llm_manager: LLMManager | None = None):
        self.vector_db = vector_db
        self.llm_manager = llm_manager or LLMManager()

    def build_chain(self, formatted_context: str):
        """Construct a LangChain execution chain from context to answer."""
        return (
            {"context": lambda _: formatted_context, "question": lambda x: x}
            | self.llm_manager.get_rag_prompt()
            | self.llm_manager.llm
            | StrOutputParser()
        )

    def get_response(self, question: str, formatted_context: str):
        """Get a standard answer without explicit thinking mode."""
        chain = self.build_chain(formatted_context)
        return chain.invoke(question)

    def get_thinking_response(self, question: str, formatted_context: str):
        """Use Ollama thinking mode when the selected model supports it."""
        system_message = f"""You are an expert AI assistant.
        Answer the question using only the PDF context below.
        Context:
        {formatted_context}
        Think through the problem step-by-step and cite the source document for each claim."""

        response = ollama.chat(
            model=self.llm_manager.model_name,
            messages=[
                {"role": "system", "content": system_message},
                {"role": "user", "content": f"Question: {question}\n\nAnswer with careful reasoning and source citations."},
            ],
            think=True,
            stream=False,
        )
        return response.message.content
