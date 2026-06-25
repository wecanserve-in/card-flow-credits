import io
import pandas as pd
from openpyxl import load_workbook
from openpyxl.styles import Font

def generate_excel_in_memory(cards):
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

    df = pd.DataFrame(cleaned_cards)

    # Convert everything to string and clean nulls
    df = df.astype(str)
    df = df.replace("nan", "")
    df = df.fillna("")

    # Remove duplicate cards
    if not df.empty:
        df.drop_duplicates(
            subset=["Phone", "Email"],
            keep="first",
            inplace=True
        )
        df.reset_index(drop=True, inplace=True)

    # Add fresh Serial Number
    df.insert(
        0,
        "SR NO",
        range(1, len(df) + 1)
    )

    # Save to BytesIO
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, index=False)
    
    output.seek(0)

    # Formatting using openpyxl
    workbook = load_workbook(output)
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

    final_output = io.BytesIO()
    workbook.save(final_output)
    final_output.seek(0)

    return final_output