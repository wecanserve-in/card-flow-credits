import os
import pandas as pd
from openpyxl import load_workbook
from openpyxl.styles import Font

EXCEL_FILE = "exports/cardsdetails.xlsx"

os.makedirs("exports", exist_ok=True)


def save_cards_to_excel(cards):

    cleaned_cards = []

    for card in cards:
        cleaned_cards.append({
            "Name": card.get("name", ""),
            "Company": card.get("company", ""),
            "Designation": card.get("designation", ""),
            "Phone": card.get("phone", ""),
            "Country": card.get("country", ""),
            "Email": card.get("email", ""),
            "Website": card.get("website", "")
        })

    new_data = pd.DataFrame(cleaned_cards)

    if os.path.exists(EXCEL_FILE):

        existing_data = pd.read_excel(
            EXCEL_FILE,
            dtype=str
        )

        # Latest uploads first
        updated_data = pd.concat(
            [new_data, existing_data],
            ignore_index=True
        )

    else:
        updated_data = new_data

    # Convert everything to string and clean nulls
    updated_data = updated_data.astype(str)
    updated_data = updated_data.replace("nan", "")
    updated_data = updated_data.fillna("")

    # Remove duplicate cards
    updated_data.drop_duplicates(
        subset=["Phone", "Email"],
        keep="first",
        inplace=True
    )

    updated_data.reset_index(drop=True, inplace=True)

    # Remove old SR NO if it exists
    if "SR NO" in updated_data.columns:
        updated_data.drop(columns=["SR NO"], inplace=True)

    # Add fresh Serial Number
    updated_data.insert(
        0,
        "SR NO",
        range(1, len(updated_data) + 1)
    )

    # Save Excel
    updated_data.to_excel(
        EXCEL_FILE,
        index=False
    )

    # Formatting
    workbook = load_workbook(EXCEL_FILE)
    sheet = workbook.active

    # Bold Header
    for cell in sheet[1]:
        cell.font = Font(bold=True)

    # Column Widths
    column_widths = {
        "A": 10,   # SR NO
        "B": 25,   # Name
        "C": 30,   # Company
        "D": 25,   # Designation
        "E": 20,   # Phone
        "F": 20,   # Country
        "G": 35,   # Email
        "H": 30    # Website
    }

    for col, width in column_widths.items():
        sheet.column_dimensions[col].width = width

    workbook.save(EXCEL_FILE)

    return EXCEL_FILE