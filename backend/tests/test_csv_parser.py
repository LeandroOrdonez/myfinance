import pytest
import pandas as pd
from typing import List
import os
from io import StringIO

from backend.app.services.csv_parser import CSVParser
from backend.app.schemas.transaction import TransactionCreate
from backend.app.models.transaction import TransactionType

# Define paths to mock data
MOCK_DATA_DIR = os.path.join(os.path.dirname(__file__), "mock_data")
ING_MOCK_CSV_MONTHLY = os.path.join(MOCK_DATA_DIR, "ing", "ing-202303.csv")
KBC_MOCK_CSV_MONTHLY = os.path.join(MOCK_DATA_DIR, "kbc", "kbc-202303.csv")
ING_ALL_CSV = os.path.join(MOCK_DATA_DIR, "ing", "ing-all.csv") # Assuming this exists
KBC_ALL_CSV = os.path.join(MOCK_DATA_DIR, "kbc", "kbc-all.csv") # Assuming this exists


@pytest.fixture(scope="session", autouse=True)
def register_parsers():
    """Ensure parsers are registered. This should happen on import, but good for explicit test setup."""
    # The CSVParser module already registers these on import.
    # This fixture is more of a conceptual placeholder if dynamic registration was part of tests.
    # For this structure, it's not strictly needed as registration is static.
    pass

# --- Test Helper Functions ---
def create_csv_file_like_object(content: str) -> str:
    """Creates a temporary CSV file and returns its path. For simplicity, using string content."""
    # In a real scenario with complex file interactions, you might write to a temp file.
    # For these tests, we'll often mock read_csv or pass file paths to actual small mock CSVs.
    # This helper is more for dynamic content generation if needed.
    # For now, we will use actual file paths to the mock_data files.
    # If we need to test with specific string content, we can mock pd.read_csv.
    # Let's make this return the content for use with StringIO if we mock read_csv
    return content


# --- Tests for `detect_bank_format` ---
def test_detect_bank_format_ing():
    ing_headers = ["Account Number", "Account Name", "Counterparty account", "Booking date", "Amount", "Currency", "Description"]
    assert CSVParser.detect_bank_format(ing_headers) == "ING"

def test_detect_bank_format_kbc():
    kbc_headers = ["Account number", "Heading", "Name", "Currency", "Date", "Amount", "Description", "Counterparty name", "counterparty's account number"]
    assert CSVParser.detect_bank_format(kbc_headers) == "KBC"

def test_detect_bank_format_unknown():
    unknown_headers = ["ColA", "ColB", "ColC"]
    with pytest.raises(ValueError, match="Unsupported CSV format"):
        CSVParser.detect_bank_format(unknown_headers)

def test_detect_bank_format_partial_match_fail():
    # Only some ING headers, should not be enough if required set is larger
    partial_ing_headers = ["Account Number", "Booking date"]
    # This test depends on the exact "required" headers defined in register_bank_parser
    # For ING, it's {"Account Number", "Account Name", "Counterparty account", "Booking date"}
    with pytest.raises(ValueError, match="Unsupported CSV format"):
        CSVParser.detect_bank_format(partial_ing_headers)

def test_detect_bank_format_superset_ok():
    ing_superset_headers = ["Account Number", "Account Name", "Counterparty account", "Booking date", "Extra Column"]
    assert CSVParser.detect_bank_format(ing_superset_headers) == "ING"


# --- Tests for `convert_amount` and `convert_date` ---
def test_convert_amount():
    assert CSVParser.convert_amount("1.234,56") == 1234.56
    assert CSVParser.convert_amount("-10,00") == -10.00
    assert CSVParser.convert_amount("50") == 50.0
    assert CSVParser.convert_amount(" 100.50 ") == 100.50 # With spaces

def test_convert_date():
    assert CSVParser.convert_date("30/03/2023") == "2023-03-30"
    assert CSVParser.convert_date("01/12/2024") == "2024-12-01"
    # Already in correct format or unparseable
    assert CSVParser.convert_date("2023-03-30") == "2023-03-30"
    assert CSVParser.convert_date("invalid-date") == "invalid-date"


# --- Tests for `parse_ing_csv` ---
def test_parse_ing_csv_monthly_valid():
    # This test relies on the actual mock data file.
    # Ensure ING_MOCK_CSV_MONTHLY path is correct and file exists.
    if not os.path.exists(ING_MOCK_CSV_MONTHLY):
        pytest.skip(f"Mock ING CSV not found: {ING_MOCK_CSV_MONTHLY}")

    transactions = CSVParser.parse_ing_csv(ING_MOCK_CSV_MONTHLY)
    assert isinstance(transactions, list)
    assert len(transactions) > 0  # Assuming the mock file has transactions
    
    # Check the first transaction (example from provided mock data)
    # NL55667788990011;My Personal Account;BE72138092603194;30/03/2023;-43,60;EUR;Gas Bill Mar
    first_t = transactions[0]
    assert isinstance(first_t, TransactionCreate)
    assert first_t.account_number == "NL55667788990011"
    assert first_t.transaction_date == "2023-03-30" # Date converted
    assert first_t.amount == -43.60
    assert first_t.currency == "EUR"
    assert first_t.description == "Gas Bill Mar"
    assert first_t.counterparty_account == "BE72138092603194"
    assert first_t.transaction_type == TransactionType.EXPENSE
    assert first_t.source_bank == "ING"

    # Check a transaction with income
    # NL12345678901234;My Personal Account;BE72889555265505;28/03/2023;3050,00;EUR;Salary March 2023
    income_t = next(t for t in transactions if t.amount > 0)
    assert income_t.amount == 3050.00
    assert income_t.transaction_type == TransactionType.INCOME
    
    # Check a transaction where counterparty account might be null/NaN
    # NL88776655443322;My Personal Account;;27/03/2023;-40,00;EUR;ATM Withdrawal
    atm_t = next(t for t in transactions if "ATM Withdrawal" in t.description)
    assert atm_t.counterparty_account is None


# --- Tests for `parse_kbc_csv` ---
def test_parse_kbc_csv_monthly_valid():
    if not os.path.exists(KBC_MOCK_CSV_MONTHLY):
        pytest.skip(f"Mock KBC CSV not found: {KBC_MOCK_CSV_MONTHLY}")

    transactions = CSVParser.parse_kbc_csv(KBC_MOCK_CSV_MONTHLY)
    assert isinstance(transactions, list)
    assert len(transactions) > 0

    # Check the first transaction (example from provided mock data)
    # NL76767676767677;Transaction;My KBC Account;EUR;30/03/2023;-48,20;Gas Bill Feb;GasSupply Co;BE78978978978978
    first_t = transactions[0]
    assert isinstance(first_t, TransactionCreate)
    assert first_t.account_number == "NL76767676767677"
    assert first_t.transaction_date == "2023-03-30"
    assert first_t.amount == -48.20
    assert first_t.currency == "EUR"
    assert first_t.description == "Gas Bill Feb"
    assert first_t.counterparty_name == "GasSupply Co"
    assert first_t.counterparty_account == "BE78978978978978"
    assert first_t.transaction_type == TransactionType.EXPENSE
    assert first_t.source_bank == "KBC"

    # Check an income transaction
    # NL87878787878788;Transaction;My KBC Account;EUR;28/03/2023;2900,00;Salary March 2023;My Employer Inc.;BE05177199667427
    income_t = next(t for t in transactions if t.amount > 0)
    assert income_t.amount == 2900.00
    assert income_t.transaction_type == TransactionType.INCOME
    assert income_t.counterparty_name == "My Employer Inc."


# --- Tests for generic `parse_csv` entry point ---
def test_parse_csv_ing_delegation():
    if not os.path.exists(ING_MOCK_CSV_MONTHLY):
        pytest.skip(f"Mock ING CSV not found: {ING_MOCK_CSV_MONTHLY}")
    
    transactions = CSVParser.parse_csv(ING_MOCK_CSV_MONTHLY)
    assert len(transactions) > 0
    assert transactions[0].source_bank == "ING"
    assert transactions[0].description == "Gas Bill Mar" # From ING mock

def test_parse_csv_kbc_delegation():
    if not os.path.exists(KBC_MOCK_CSV_MONTHLY):
        pytest.skip(f"Mock KBC CSV not found: {KBC_MOCK_CSV_MONTHLY}")

    transactions = CSVParser.parse_csv(KBC_MOCK_CSV_MONTHLY)
    assert len(transactions) > 0
    assert transactions[0].source_bank == "KBC"
    assert transactions[0].description == "Gas Bill Feb" # From KBC mock

def test_parse_csv_unknown_format_from_file(tmp_path):
    # Create a dummy CSV file with unknown headers
    d = tmp_path / "sub"
    d.mkdir()
    p = d / "unknown.csv"
    p.write_text("Header1;Header2;Value1;Value2\nRow1Col1;Row1Col2;10;20")
    
    with pytest.raises(ValueError, match="Unsupported CSV format"):
        CSVParser.parse_csv(str(p))

# --- Tests for edge cases and error handling ---

def test_parse_empty_csv_file(tmp_path):
    p = tmp_path / "empty.csv"
    p.write_text("") # Empty file

    # pandas read_csv on empty file might raise EmptyDataError or return empty DataFrame
    # depending on version and parameters. The current read_csv_with_fallback
    # would likely let pandas handle this. If pandas returns an empty df,
    # detect_bank_format would get an empty list of columns.
    with pytest.raises(ValueError, match="Unsupported CSV format"): # Or could be different pandas error
        CSVParser.parse_csv(str(p))
    # If the goal is to return an empty list of transactions for an empty file:
    # This would require changes in parse_csv or the specific parsers.
    # For now, expecting it to fail detection due to no headers.

def test_parse_csv_headers_only(tmp_path):
    p = tmp_path / "headers_only.csv"
    # Using ING headers as an example
    p.write_text("Account Number;Account Name;Counterparty account;Booking date;Amount;Currency;Description\n")
    
    # Specific bank parser (e.g., parse_ing_csv) will get an empty DataFrame from df.iterrows()
    # and should return an empty list of transactions.
    transactions = CSVParser.parse_csv(str(p))
    assert transactions == []

def test_parse_csv_missing_required_column_for_detection(tmp_path, monkeypatch):
    # Create a CSV that *almost* looks like ING but misses a *key* header for detection
    # ING required for detection: {"Account Number", "Account Name", "Counterparty account", "Booking date"}
    # Let's miss "Account Name"
    content = "Account Number;Counterparty account;Booking date;Amount;Currency;Description\nNL123;;30/03/2023;10,0;EUR;Test"
    p = tmp_path / "missing_detection_header.csv"
    p.write_text(content)

    with pytest.raises(ValueError, match="Unsupported CSV format"):
        CSVParser.parse_csv(str(p))

def test_read_csv_with_fallback_encodings(tmp_path, monkeypatch):
    # Test UTF-8 (should work by default)
    p_utf8 = tmp_path / "utf8.csv"
    p_utf8.write_text("Header;Value\nData;€10") # Euro sign for utf-8
    df_utf8 = CSVParser.read_csv_with_fallback(str(p_utf8))
    assert df_utf8.iloc[0]["Value"] == "€10"

    # Test Latin1
    p_latin1 = tmp_path / "latin1.csv"
    content_latin1 = "Header;Value\nData;Hällö" # Swedish "ä" often in latin1
    p_latin1.write_bytes(content_latin1.encode('latin1')) # Write as latin1 bytes

    # Mock pandas read_csv to simulate UnicodeDecodeError for utf-8, then succeed for latin1
    original_read_csv = pd.read_csv
    call_count = 0
    def mock_read_csv_latin1_fallback(*args, **kwargs):
        nonlocal call_count
        call_count += 1
        if kwargs.get('encoding') == 'utf-8':
            raise UnicodeDecodeError("utf-8", b"", 0, 1, "mock error")
        return original_read_csv(*args, **kwargs)

    monkeypatch.setattr(pd, 'read_csv', mock_read_csv_latin1_fallback)
    df_latin1 = CSVParser.read_csv_with_fallback(str(p_latin1))
    assert df_latin1.iloc[0]["Value"] == "Hällö"
    assert call_count > 1 # Ensure fallback was triggered

    # Test failure for all encodings
    p_fail = tmp_path / "fail.csv"
    p_fail.write_text("Header;Value\nData;Test") # Normal content, but we'll force errors

    call_count_fail = 0
    def mock_read_csv_all_fail(*args, **kwargs):
        nonlocal call_count_fail
        call_count_fail +=1
        raise UnicodeDecodeError(kwargs.get('encoding', 'unknown'), b"", 0, 1, "mock error")

    monkeypatch.setattr(pd, 'read_csv', mock_read_csv_all_fail)
    with pytest.raises(ValueError, match="Failed to read CSV with all attempted encodings"):
        CSVParser.read_csv_with_fallback(str(p_fail))
    assert call_count_fail == 3 # utf-8, latin1, iso-8859-1

# It might be useful to also test the CSV files from the 'all' folder if their structure
# is consistent with monthly files and they are used as inputs for the splitter scripts.
# Assuming ing-all.csv and kbc-all.csv are just larger versions of the monthly files.
@pytest.mark.skipif(not os.path.exists(ING_ALL_CSV), reason="ING all mock CSV not found")
def test_parse_ing_csv_all_data_valid():
    transactions = CSVParser.parse_ing_csv(ING_ALL_CSV)
    assert isinstance(transactions, list)
    assert len(transactions) > 0  # Assuming the mock file has transactions
    # Basic check on the first transaction
    first_t = transactions[0]
    assert isinstance(first_t, TransactionCreate)
    assert first_t.source_bank == "ING"

@pytest.mark.skipif(not os.path.exists(KBC_ALL_CSV), reason="KBC all mock CSV not found")
def test_parse_kbc_csv_all_data_valid():
    transactions = CSVParser.parse_kbc_csv(KBC_ALL_CSV)
    assert isinstance(transactions, list)
    assert len(transactions) > 0
    first_t = transactions[0]
    assert isinstance(first_t, TransactionCreate)
    assert first_t.source_bank == "KBC"

```
