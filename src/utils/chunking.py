from langchain_text_splitters import RecursiveCharacterTextSplitter

def split_chunks(original_content = str) -> list[str]:
    
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,
        chunk_overlap=50,
        separators=["\n\n", "\n", ".", " ", ""],
    )
    return splitter.split_text(original_content)