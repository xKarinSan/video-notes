from langchain_openai import ChatOpenAI

import os
from dotenv import load_dotenv

load_dotenv()
langchain_client = ChatOpenAI(model="gpt-3.5-turbo", api_key=os.getenv("OPENAI_API_KEY"))
