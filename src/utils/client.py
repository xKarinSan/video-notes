from langchain_openai import ChatOpenAI

import os
from dotenv import load_dotenv

load_dotenv()
langchain_client = ChatOpenAI(model="gpt-4", api_key=os.getenv("OPENAI_API_KEY"))
