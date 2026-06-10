import os
import pandas as pd

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
            "Website": card.get("website", ""),
           
        })

    new_data = pd.DataFrame(cleaned_cards)

    if os.path.exists(EXCEL_FILE):

        existing_data = pd.read_excel(EXCEL_FILE)

        updated_data = pd.concat(
            [existing_data, new_data],
            ignore_index=True
        )

    else:
        updated_data = new_data

    updated_data.to_excel(
        EXCEL_FILE,
        index=False
    )

    return EXCEL_FILE