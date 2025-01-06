from langchain_core.embeddings import Embeddings
from langchain_core.language_models import BaseLanguageModel
from langchain_core.output_parsers import StrOutputParser, JsonOutputParser
from langchain_core.prompts import PromptTemplate
from langchain_core.runnables import Runnable


class ContentChains:
    """LangChain processing chains for content analysis"""
    def __init__(self, llm: BaseLanguageModel):
        self.llm = llm
        self._setup_chains()

    def _setup_chains(self):
        """Initialize all processing chains"""
        self.title_chain = self._create_title_chain()
        self.summary_chain = self._create_summary_chain()
        self.tags_chain = self._create_tags_chain()
        self.entities_chain = self._create_entities_chain()

    def _create_title_chain(self) -> Runnable:
        parser = StrOutputParser()
        prompt = PromptTemplate(
            template="""
            Generate a concise title (5-7 words) for this content that would be suitable for note organization and search.
            The title should be descriptive and capture the main topic or theme.
            
            Content: {content}
            
            Title:""",
            input_variables=["content"]
        )
        return prompt | self.llm | parser

    def _create_summary_chain(self) -> Runnable:
        parser = StrOutputParser()
        prompt = PromptTemplate(
            template="""
            Generate a concise summary of the following content.
            The summary should capture key points and be suitable for embedding and semantic search.
            Include main topics, key facts, and important details.
            
            Content: {content}
            
            Summary:""",
            input_variables=["content"]
        )
        return prompt | self.llm | parser

    def _create_tags_chain(self) -> Runnable:
        parser = JsonOutputParser()
        prompt = PromptTemplate(
            template="""
            Generate relevant tags for the following content.
            Tags should help with content organization and discovery.
            Return as a JSON array of strings.
            
            Content: {content}
            
            Tags:""",
            input_variables=["content"]
        )
        return prompt | self.llm | parser

    def _create_entities_chain(self) -> Runnable:
        parser = JsonOutputParser()
        prompt = PromptTemplate(
            template="""
            Extract key entities and their types from the content.
            Focus on people, organizations, locations, and key concepts.
            Return as a JSON object where keys are entity names and values are entity types.
            
            Content: {content}
            
            Entities:""",
            input_variables=["content"]
        )
        return prompt | self.llm | parser
