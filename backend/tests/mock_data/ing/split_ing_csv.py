import pandas as pd
import os
import sys

def split_ing_by_month(input_file):
    # Read the ING CSV with semicolon delimiter
    df = pd.read_csv(input_file, sep=';')
    # Parse booking date and extract year-month
    df['Booking date'] = pd.to_datetime(df['Booking date'], format='%d/%m/%Y')
    df['YearMonth'] = df['Booking date'].dt.strftime('%Y%m')
    # Determine output directory
    output_dir = os.path.dirname(input_file)
    # Split and save per month
    for ym, group in df.groupby('YearMonth'):
        output_file = os.path.join(output_dir, f"ing-{ym}.csv")
        group.to_csv(output_file, sep=';', index=False)
        print(f"Wrote {len(group)} records to {output_file}")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python split_ing_csv.py path/to/ing.csv")
        sys.exit(1)
    split_ing_by_month(sys.argv[1])
