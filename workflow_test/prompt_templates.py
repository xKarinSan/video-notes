from langchain_core.prompts import ChatPromptTemplate

"""
For generating common content
"""

system_template = """
List the key ideas and main arguments from this transcript section.
"""
general_notes_prompt = ChatPromptTemplate(
   [
      ("system",system_template), 
      ("user",rag_user_codebase)
   ]
)