#!/usr/bin/env python3
"""
Citizens Import Script
Converts CSV/JSON data to SQL INSERT statements for the citizens table.

Usage:
    python import-citizens.py --input data.csv --output seed.sql
    python import-citizens.py --input data.json --output seed.sql
"""

import argparse
import csv
import json
import sys
from pathlib import Path


def escape_sql(value):
    """Escape SQL string value."""
    if value is None or value == '':
        return 'NULL'
    # Escape single quotes
    escaped = str(value).replace("'", "''")
    return f"'{escaped}'"


def parse_csv(file_path):
    """Parse CSV file and return list of records."""
    records = []
    with open(file_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            records.append(row)
    return records


def parse_json(file_path):
    """Parse JSON file and return list of records."""
    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    if isinstance(data, list):
        return data
    elif isinstance(data, dict) and 'citizens' in data:
        return data['citizens']
    else:
        raise ValueError("JSON must be an array or object with 'citizens' key")


def generate_sql(records, output_path):
    """Generate SQL INSERT statements from records."""
    columns = [
        'civil_id', 'reg_no', 'family_name', 'last_name', 'first_name',
        'birth_date', 'sex', 'nationality', 'current_province',
        'current_district', 'phone_primary', 'email'
    ]

    with open(output_path, 'w', encoding='utf-8') as f:
        f.write("-- Auto-generated citizens seed data\n")
        f.write(f"-- Generated from: {len(records)} records\n\n")

        f.write(f"INSERT INTO citizens ({', '.join(columns)}) VALUES\n")

        values = []
        for record in records:
            row_values = []
            for col in columns:
                value = record.get(col, None)
                row_values.append(escape_sql(value))
            values.append(f"({', '.join(row_values)})")

        f.write(',\n'.join(values))
        f.write("\nON CONFLICT (reg_no) DO NOTHING;\n")

    print(f"Generated SQL with {len(records)} records -> {output_path}")


def main():
    parser = argparse.ArgumentParser(description='Import citizens data to SQL')
    parser.add_argument('--input', '-i', required=True, help='Input CSV or JSON file')
    parser.add_argument('--output', '-o', default='seed.sql', help='Output SQL file')

    args = parser.parse_args()

    input_path = Path(args.input)
    if not input_path.exists():
        print(f"Error: Input file not found: {input_path}")
        sys.exit(1)

    # Determine file type and parse
    suffix = input_path.suffix.lower()
    if suffix == '.csv':
        records = parse_csv(input_path)
    elif suffix == '.json':
        records = parse_json(input_path)
    else:
        print(f"Error: Unsupported file type: {suffix}")
        sys.exit(1)

    if not records:
        print("Error: No records found in input file")
        sys.exit(1)

    # Generate SQL
    generate_sql(records, args.output)


if __name__ == '__main__':
    main()
