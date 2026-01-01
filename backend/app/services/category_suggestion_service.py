from sentence_transformers import SentenceTransformer
from qdrant_client import QdrantClient
from qdrant_client.http import models
from typing import List, Tuple
import numpy as np
import re
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

from ..models.transaction import Transaction, TransactionType, ExpenseCategory, IncomeCategory
from sqlalchemy.orm import Session

class CategorySuggestionService:
    def __init__(self):
        # Initialize the sentence transformer model
        self.model = SentenceTransformer('all-MiniLM-L6-v2')
        
        # Initialize Qdrant client (vector database)
        self.client = QdrantClient(":memory:")  # For production, use persistent storage
        
        # Create collections for expense and income categories
        self.client.recreate_collection(
            collection_name="expense_embeddings",
            vectors_config=models.VectorParams(
                size=384,  # Output dimension of the model
                distance=models.Distance.COSINE
            )
        )
        
        self.client.recreate_collection(
            collection_name="income_embeddings",
            vectors_config=models.VectorParams(
                size=384,
                distance=models.Distance.COSINE
            )
        )

    def _preprocess_description(self, description: str) -> str:
        """
        Preprocess transaction description by cleaning and normalizing the text.
        
        Args:
            description: Raw transaction description
            
        Returns:
            Cleaned and normalized description
        """
        # Convert to lowercase
        text = description.lower()
        
        # Remove common transaction prefixes
        prefixes = [
            r'payment via \w+\s+',
            r'european direct debit\s+',
            r'instant credit transfer from\s+',
            r'charge\s+',
            r'payment\s+'
        ]
        for prefix in prefixes:
            text = re.sub(prefix, '', text, flags=re.IGNORECASE)
        
        # Remove dates in various formats
        date_patterns = [
            r'\d{2}[-/]\d{2}[-/]\d{2,4}',  # DD-MM-YYYY or DD/MM/YYYY
            r'\d{2}[-/]\d{2}',              # DD-MM or DD/MM
            r'\d{1,2}[:.]\d{2}\s*(?:am|pm)?',  # HH:MM or HH.MM with optional AM/PM
        ]
        for pattern in date_patterns:
            text = re.sub(pattern, '', text)
        
        # Remove card information
        card_patterns = [
            r'card number \d*x*\s*\d*x*\s*\d*x*\s*\d*',
            r'with \w+ (?:debit|credit) card \d{4}\s*\d*x*\s*\d*x*\s*\d*',
            r'cardholder:\s*[^\n]+',
        ]
        for pattern in card_patterns:
            text = re.sub(pattern, '', text)
        
        # Remove transaction references and IDs
        ref_patterns = [
            r'creditor ref\.\s*:\s*[\w\s]+',
            r'mandate ref\.\s*:\s*[\w\s]+',
            r'reference\s*:\s*[\w\s/]+',
            r'ordering bank\s*:\s*[\w\s]+',
        ]
        for pattern in ref_patterns:
            text = re.sub(pattern, '', text)
        
        # Remove account numbers and BIC codes
        text = re.sub(r'[A-Z]{2}\d{2}\s*[A-Z0-9\s]{10,30}', '', text)  # IBAN
        text = re.sub(r'[A-Z]{6}[A-Z0-9]{2,5}', '', text)  # BIC/SWIFT
        
        # Remove postal codes and addresses
        text = re.sub(r'\d{4,5}\s*[-\s]*[a-z]{2,3}', '', text)
        text = re.sub(r'\d{3,4}\s+\d{4}\s+[a-zA-Z\s]+', '', text)
        
        # Remove multiple spaces and trim
        text = re.sub(r'\s+', ' ', text).strip()
        
        # Extract merchant name (usually in caps or after specific keywords)
        merchant_patterns = [
            r'([A-Z][A-Z &]+)',  # All caps merchant names
            r'creditor\s*:\s*([^\.]+)',  # After "creditor:"
            r'(?:at|to|from)\s+([^\.]+)',  # After "at", "to", or "from"
        ]
        
        merchant_name = None
        for pattern in merchant_patterns:
            match = re.search(pattern, description)
            if match:
                merchant_name = match.group(1).strip()
                break
        
        if merchant_name:
            # Add merchant name to the beginning of the processed text for emphasis
            text = f"{merchant_name.lower()} {text}"
        
        return text
    
    def _create_transaction_text(self, transaction: Transaction) -> str:
        """Create a text representation of the transaction for embedding"""
        description = self._preprocess_description(transaction.description)
        transaction_text = f"{description} {abs(transaction.amount)}"
        logger.info(f"Creating transaction text: {transaction_text}")
        return transaction_text

    def _get_collection_name(self, transaction_type: TransactionType) -> str:
        return "expense_embeddings" if transaction_type == TransactionType.EXPENSE else "income_embeddings"

    def train_on_existing_transactions(self, db: Session):
        """Train the model on existing transactions"""
        transactions = db.query(Transaction).all()
        
        for transaction in transactions:
            if not transaction.expense_category and not transaction.income_category:
                continue
                
            text = self._create_transaction_text(transaction)
            embedding = self.model.encode(text)
            
            collection_name = self._get_collection_name(transaction.transaction_type)
            category = transaction.expense_category if transaction.transaction_type == TransactionType.EXPENSE else transaction.income_category
            
            self.client.upsert(
                collection_name=collection_name,
                points=[
                    models.PointStruct(
                        id=transaction.id,
                        vector=embedding.tolist(),
                        payload={"category": category.value}
                    )
                ]
            )

    def suggest_category(
        self, 
        description: str, 
        amount: float, 
        transaction_type: TransactionType,
        top_k: int = 3
    ) -> List[Tuple[str, float]]:
        """Suggest categories for a new transaction"""
        text = f"{self._preprocess_description(description)} {abs(amount)}"
        logger.info(f"Suggesting category for text: {text}")
        embedding = self.model.encode(text)
        
        collection_name = self._get_collection_name(transaction_type)
        
        # Check if collection has any points
        try:
            collection_info = self.client.get_collection(collection_name)
            if collection_info.points_count == 0:
                logger.warning(f"No points in {collection_name} collection, returning empty suggestions")
                return []
        except Exception as e:
            logger.warning(f"Error checking collection: {e}, returning empty suggestions")
            return []
        
        # Search for similar transactions using search
        try:
            search_result = self.client.search(
                collection_name=collection_name,
                query_vector=embedding.tolist(),
                limit=top_k
            )
            
            # Return categories with confidence scores
            return [(hit.payload["category"], hit.score) for hit in search_result]
        except Exception as e:
            logger.error(f"Error searching for similar transactions: {e}")
            return []

    def add_transaction(self, transaction: Transaction):
        """Add a new transaction to the vector database"""
        if not transaction.expense_category and not transaction.income_category:
            return
            
        text = self._create_transaction_text(transaction)
        embedding = self.model.encode(text)
        
        collection_name = self._get_collection_name(transaction.transaction_type)
        category = transaction.expense_category if transaction.transaction_type == TransactionType.EXPENSE else transaction.income_category
        
        self.client.upsert(
            collection_name=collection_name,
            points=[
                models.PointStruct(
                    id=transaction.id,
                    vector=embedding.tolist(),
                    payload={"category": category.value}
                )
            ]
        ) 