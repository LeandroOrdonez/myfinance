import pandas as pd
import os
import sys


def split_kbc_by_month(input_file):
    # Read the KBC CSV with semicolon delimiter
    df = pd.read_csv(input_file, sep=';')
    # Parse Date column and extract year-month
    df['Date'] = pd.to_datetime(df['Date'], format='%d/%m/%Y')
    df['YearMonth'] = df['Date'].dt.strftime('%Y%m')
    # Determine output directory
    output_dir = os.path.dirname(input_file)
    # Split and save per month
    for ym, group in df.groupby('YearMonth'):
        output_file = os.path.join(output_dir, f"kbc-{ym}.csv")
        group.to_csv(output_file, sep=';', index=False)
        print(f"Wrote {len(group)} records to {output_file}")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python split_kbc_csv.py path/to/kbc.csv")
        sys.exit(1)
    split_kbc_by_month(sys.argv[1])
