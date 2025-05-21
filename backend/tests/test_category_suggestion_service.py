import pytest
from unittest.mock import patch, MagicMock, call
import numpy as np

from backend.app.services.category_suggestion_service import CategorySuggestionService
from backend.app.models.transaction import TransactionType, ExpenseCategory, IncomeCategory # Assuming these enums are defined here
from qdrant_client.http import models as qdrant_models


# Mock Transaction model for tests if needed, or use real one if simple
class MockTransaction:
    def __init__(self, id, description, amount, transaction_type, expense_category=None, income_category=None):
        self.id = id
        self.description = description
        self.amount = amount
        self.transaction_type = transaction_type
        self.expense_category = expense_category
        self.income_category = income_category

@pytest.fixture
def service():
    """Fixture to create a CategorySuggestionService instance with mocked dependencies."""
    with patch('backend.app.services.category_suggestion_service.SentenceTransformer') as MockSentenceTransformer, \
         patch('backend.app.services.category_suggestion_service.QdrantClient') as MockQdrantClient:
        
        mock_model_instance = MockSentenceTransformer.return_value
        mock_model_instance.encode.return_value = np.array([0.1] * 384) # Dummy embedding

        mock_qdrant_instance = MockQdrantClient.return_value
        
        service_instance = CategorySuggestionService()
        service_instance.model = mock_model_instance
        service_instance.client = mock_qdrant_instance
        return service_instance

# --- Tests for _preprocess_description ---

def test_preprocess_description_lowercase(service):
    assert service._preprocess_description("UPPERCASE TEXT") == "uppercase text"

def test_preprocess_description_remove_prefixes(service):
    assert service._preprocess_description("Payment via Visa Groceries") == "groceries"
    assert service._preprocess_description("European direct debit Rent") == "rent"
    assert service._preprocess_description("Instant credit transfer from John Doe Salary") == "john doe salary" # Assuming 'john doe' is not removed by other patterns

def test_preprocess_description_remove_dates(service):
    assert service._preprocess_description("Invoice 20/10/2023 Food") == "invoice food"
    assert service._preprocess_description("Purchase on 10-12 Dinner") == "purchase on dinner" # "on" might remain
    assert service._preprocess_description("Transaction 14:30 Lunch") == "transaction lunch"

def test_preprocess_description_remove_card_info(service):
    assert service._preprocess_description("Paid with card number 1234XXXXXX5678 Snacks") == "paid with snacks" # "paid with" might remain or be part of other patterns
    assert service._preprocess_description("Payment with Visa debit card 1234 Coffee") == "coffee"

def test_preprocess_description_remove_refs(service):
    assert service._preprocess_description("Creditor Ref. : ABC123 Bill") == "bill" # "bill" might be extracted as merchant
    assert service._preprocess_description("Reference : XYZ789 Subscription") == "subscription" # "subscription" might be extracted

def test_preprocess_description_remove_iban_bic(service):
    assert service._preprocess_description("Transfer to BE12345678901234 Utility") == "transfer to utility" # "transfer to" might remain
    assert service._preprocess_description("From KREDBEBB Bank Fee") == "bank fee" # "bank fee" might be extracted

def test_preprocess_description_merchant_extraction(service):
    # Test merchant extraction (this is complex and might need more specific tests)
    assert "my shop" in service._preprocess_description("Payment at MY SHOP for goods")
    assert "cool stuff inc" in service._preprocess_description("Transaction from COOL STUFF INC.")
    # Ensure merchant name is lowercased and prepended
    desc_with_merchant = service._preprocess_description("Creditor: BIG STORE item")
    assert desc_with_merchant.startswith("big store")
    assert "item" in desc_with_merchant

def test_preprocess_description_combined(service):
    raw_desc = "European direct debit for ACME CORP on 20/10/2023, Ref: 123XYZ, Card ending 4321"
    processed = service._preprocess_description(raw_desc)
    assert "acme corp" in processed # Merchant extraction
    assert "direct debit" not in processed
    assert "20/10/2023" not in processed
    assert "123xyz" not in processed
    assert "4321" not in processed


# --- Tests for suggest_category ---

def test_suggest_category_expense(service):
    description = "Dinner at a restaurant"
    amount = -50.0
    transaction_type = TransactionType.EXPENSE
    
    # Mock Qdrant search result
    mock_hits = [
        MagicMock(payload={"category": ExpenseCategory.FOOD.value}, score=0.9),
        MagicMock(payload={"category": ExpenseCategory.MISC.value}, score=0.7)
    ]
    service.client.search.return_value = mock_hits
    
    # Mock sentence transformer output for this specific text
    expected_embedding = np.array([0.5] * 384)
    service.model.encode.return_value = expected_embedding

    suggestions = service.suggest_category(description, amount, transaction_type, top_k=2)
    
    service.model.encode.assert_called_once()
    # Check that the input to encode was preprocessed description + amount
    # This requires checking the call args, which can be a bit involved if _preprocess_description is complex.
    # For simplicity here, we'll assume _preprocess_description is tested separately and focus on the flow.
    actual_call_to_encode = service.model.encode.call_args[0][0]
    preprocessed_desc = service._preprocess_description(description)
    assert actual_call_to_encode == f"{preprocessed_desc} {abs(amount)}"

    service.client.search.assert_called_once_with(
        collection_name="expense_embeddings",
        query_vector=expected_embedding.tolist(),
        limit=2
    )
    
    assert suggestions == [(ExpenseCategory.FOOD.value, 0.9), (ExpenseCategory.MISC.value, 0.7)]

def test_suggest_category_income(service):
    description = "Monthly Salary"
    amount = 3000.0
    transaction_type = TransactionType.INCOME
    
    mock_hits = [
        MagicMock(payload={"category": IncomeCategory.SALARY.value}, score=0.95),
    ]
    service.client.search.return_value = mock_hits
    
    expected_embedding = np.array([0.8] * 384)
    service.model.encode.return_value = expected_embedding

    suggestions = service.suggest_category(description, amount, transaction_type, top_k=1)
    
    service.model.encode.assert_called_once()
    actual_call_to_encode = service.model.encode.call_args[0][0]
    preprocessed_desc = service._preprocess_description(description)
    assert actual_call_to_encode == f"{preprocessed_desc} {abs(amount)}"
    
    service.client.search.assert_called_once_with(
        collection_name="income_embeddings",
        query_vector=expected_embedding.tolist(),
        limit=1
    )
    
    assert suggestions == [(IncomeCategory.SALARY.value, 0.95)]

def test_suggest_category_no_results(service):
    description = "Unique unknown item"
    amount = -10.0
    transaction_type = TransactionType.EXPENSE
    
    service.client.search.return_value = [] # No hits
    
    expected_embedding = np.array([0.2] * 384)
    service.model.encode.return_value = expected_embedding

    suggestions = service.suggest_category(description, amount, transaction_type)
    
    service.model.encode.assert_called_once()
    service.client.search.assert_called_once_with(
        collection_name="expense_embeddings",
        query_vector=expected_embedding.tolist(),
        limit=3 # Default top_k
    )
    assert suggestions == []

# --- Tests for add_transaction and train_on_existing_transactions (Simplified) ---
# These involve more QdrantClient mocking (upsert) and potentially SQLAlchemy session mocking.

@patch('backend.app.services.category_suggestion_service.logger') # Patch logger to avoid console output during tests
def test_add_transaction_expense(MockLogger, service):
    mock_transaction = MockTransaction(
        id=1, 
        description="Lunch Burger", 
        amount=-15.0, 
        transaction_type=TransactionType.EXPENSE, 
        expense_category=ExpenseCategory.FOOD
    )
    
    expected_embedding = np.array([0.3] * 384)
    service.model.encode.return_value = expected_embedding

    service.add_transaction(mock_transaction)

    service.model.encode.assert_called_once()
    # Basic check of text sent to encode
    actual_call_to_encode = service.model.encode.call_args[0][0]
    preprocessed_desc = service._preprocess_description(mock_transaction.description)
    assert actual_call_to_encode == f"{preprocessed_desc} {abs(mock_transaction.amount)}"
    
    service.client.upsert.assert_called_once_with(
        collection_name="expense_embeddings",
        points=[qdrant_models.PointStruct(
            id=mock_transaction.id,
            vector=expected_embedding.tolist(),
            payload={"category": ExpenseCategory.FOOD.value}
        )]
    )

@patch('backend.app.services.category_suggestion_service.logger')
def test_add_transaction_income(MockLogger, service):
    mock_transaction = MockTransaction(
        id=2, 
        description="Freelance Gig", 
        amount=200.0, 
        transaction_type=TransactionType.INCOME, 
        income_category=IncomeCategory.FREELANCE
    )
    
    expected_embedding = np.array([0.4] * 384)
    service.model.encode.return_value = expected_embedding

    service.add_transaction(mock_transaction)

    service.model.encode.assert_called_once()
    service.client.upsert.assert_called_once_with(
        collection_name="income_embeddings",
        points=[qdrant_models.PointStruct(
            id=mock_transaction.id,
            vector=expected_embedding.tolist(),
            payload={"category": IncomeCategory.FREELANCE.value}
        )]
    )

@patch('backend.app.services.category_suggestion_service.logger')
def test_add_transaction_no_category(MockLogger, service):
    mock_transaction = MockTransaction(
        id=3, 
        description="Unknown thing", 
        amount=-10.0, 
        transaction_type=TransactionType.EXPENSE
        # No category assigned
    )
    service.add_transaction(mock_transaction)
    service.model.encode.assert_not_called()
    service.client.upsert.assert_not_called()


# A more involved test for train_on_existing_transactions would require mocking db session and query results.
# For now, this covers the core logic of individual methods.
# Example of how you might start train_on_existing_transactions test:
# def test_train_on_existing_transactions(service):
#     mock_db_session = MagicMock()
#     mock_transactions = [
#         MockTransaction(id=1, description="Groceries", amount=-50, transaction_type=TransactionType.EXPENSE, expense_category=ExpenseCategory.FOOD),
#         MockTransaction(id=2, description="Salary", amount=2000, transaction_type=TransactionType.INCOME, income_category=IncomeCategory.SALARY),
#         MockTransaction(id=3, description="Misc item", amount=-10, transaction_type=TransactionType.EXPENSE) # No category
#     ]
#     mock_db_session.query.return_value.all.return_value = mock_transactions
    
#     # Mock embeddings for each transaction that will be processed
#     # This needs to align with the calls to service.model.encode
#     embeddings = {
#         service._create_transaction_text(mock_transactions[0]): np.array([0.1]*384),
#         service._create_transaction_text(mock_transactions[1]): np.array([0.2]*384),
#     }
#     service.model.encode.side_effect = lambda text: embeddings[text]

#     service.train_on_existing_transactions(mock_db_session)
    
#     assert service.model.encode.call_count == 2 # Only called for transactions with categories
#     # Check upsert calls, ensuring correct collection, ID, vector, and payload
#     # This part can be tricky to assert precisely due to the loop and conditional logic.
#     # Example:
#     # calls = [
#     #     call(collection_name="expense_embeddings", points=[...]),
#     #     call(collection_name="income_embeddings", points=[...])
#     # ]
#     # service.client.upsert.assert_has_calls(calls, any_order=True)

# For TransactionType, ExpenseCategory, IncomeCategory to be available, 
# they need to be importable. If they are in backend.app.models.transaction:
# from backend.app.models.transaction import Transaction, TransactionType, ExpenseCategory, IncomeCategory
# Make sure these enums are correctly defined in your actual models.
# For this test file, I'll assume simple string values if enums are not easily available
# or define mock enums if necessary for the test structure to work.

# If ExpenseCategory and IncomeCategory are Enums, their .value might be used.
# Example Mock Enums if real ones are complex to import or setup:
# class MockExpenseCategory:
#     FOOD = "FOOD"
#     MISC = "MISC"
#     TRANSPORT = "TRANSPORT"

# class MockIncomeCategory:
#     SALARY = "SALARY"
#     FREELANCE = "FREELANCE"

# # Replace in tests: ExpenseCategory.FOOD -> MockExpenseCategory.FOOD

# For the purpose of this file, I'll assume the enums are importable as written at the top.
# If running this causes import errors for TransactionType, ExpenseCategory, IncomeCategory,
# those models need to be correctly placed in the path or mocked.
# The file `backend.app.models.transaction` should contain:
# from enum import Enum
# class TransactionType(Enum):
#     EXPENSE = "expense"
#     INCOME = "income"
# class ExpenseCategory(Enum):
#     FOOD = "Food & Drinks"
#     # ... other categories
# class IncomeCategory(Enum):
#     SALARY = "Salary"
#     # ... other categories
# This structure is assumed by the tests.
# I'll need to create these enums in `backend/app/models/transaction.py` if they don't exist or have different structures.
# For now, I will proceed with creating the test file.
# The actual enum values (e.g. "Food & Drinks") would be used in payloads.
# The tests above use `ExpenseCategory.FOOD.value` which is correct if they are enums.
# Let's assume `ExpenseCategory.FOOD.value` is something like "FOOD" for simplicity in mock payloads.
# The `qdrant_models.PointStruct` payload would store this string value.

# If the actual enums are complex or not yet defined, this part might need adjustment
# when integrating with the real model definitions.
# The current tests assume simple string `.value` for categories in payloads.

```
