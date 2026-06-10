import re
import pycountry


def fix_email(lines):
    for line in lines:
        if "@" not in line:
            continue

        email = line.replace(" ", "")

        email = email.replace("gmailcom", "gmail.com")
        email = email.replace("yahoocom", "yahoo.com")
        email = email.replace("outlookcom", "outlook.com")

        email = re.sub(r"([a-zA-Z0-9])com$", r"\1.com", email)

        match = re.search(
            r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}",
            email
        )

        if match:
            return match.group()

    return ""


def extract_country_from_text(text):
    lower_text = text.lower()

    aliases = {
        "usa": "United States",
        "u.s.a": "United States",
        "uk": "United Kingdom",
        "uae": "United Arab Emirates",
    }

    for alias, country_name in aliases.items():
        if re.search(rf"\b{re.escape(alias)}\b", lower_text):
            return country_name

    for country in pycountry.countries:
        if country.name.lower() in lower_text:
            return country.name

    return ""


def extract_phone(text):
    candidates = re.findall(r"\+?\d[\d\s\-()]{7,}\d", text)

    phones = []

    for item in candidates:
        phone = re.sub(r"[^\d+]", "", item)
        digits = re.sub(r"\D", "", phone)

        if phone.startswith("+") and len(digits) >= 10:
            phones.append(phone)

        elif len(digits) == 10 and digits[0] in "6789":
            phones.append(digits)

    return ", ".join(list(dict.fromkeys(phones)))


def country_from_phone(phone):
    if phone.startswith("+91"):
        return "India"

    if phone.startswith("+992"):
        return "Tajikistan"

    if phone.startswith("+998"):
        return "Uzbekistan"

    if phone.startswith("+1"):
        return "United States / Canada"

    if phone.startswith("+44"):
        return "United Kingdom"

    if phone.startswith("+971"):
        return "United Arab Emirates"

    return ""


def extract_contact_details(text: str):
    lines = [line.strip() for line in text.split("\n") if line.strip()]
    full_text = " ".join(lines)

    email = fix_email(lines)
    phone = extract_phone(full_text)

    country = extract_country_from_text(full_text)

    if not country and phone:
        country = country_from_phone(phone)

    website = ""
    website_match = re.search(
        r"(www\.[^\s]+|[a-zA-Z0-9-]+\.(com|in|org|net|co|io|ai))",
        full_text.lower()
    )

    if website_match and "@" not in website_match.group():
        website = website_match.group()

    designation = ""
    name = ""
    company = ""

    designation_words = [
        "founder", "chairman", "director", "manager", "ceo",
        "realtor", "consultant", "executive", "officer",
        "sales", "marketing", "engineer", "developer"
    ]

    for line in lines:
        lower = line.lower()

        if any(word in lower for word in designation_words):
            designation = line
            break

    if designation and designation in lines:
        index = lines.index(designation)

        if index > 0:
            possible_name = lines[index - 1]

            if not any(char.isdigit() for char in possible_name):
                name = possible_name

        if index + 1 < len(lines):
            possible_company = lines[index + 1]

            if (
                "@" not in possible_company
                and not re.search(r"\d", possible_company)
            ):
                company = possible_company

    if not name:
        for line in lines:
            lower = line.lower()

            if line == company or line == designation:
                continue

            if "@" in line:
                continue

            if any(char.isdigit() for char in line):
                continue

            if any(word in lower for word in ["email", "mail", "phone", "mob", "tel", "www"]):
                continue

            if 2 <= len(line.split()) <= 4:
                name = line
                break

    if not company and name and name in lines:
        name_index = lines.index(name)

        for i in range(name_index + 1, min(name_index + 4, len(lines))):
            possible_company = lines[i]

            if possible_company == designation:
                continue

            if "@" in possible_company:
                continue

            if any(char.isdigit() for char in possible_company):
                continue

            company = possible_company
            break

    address_lines = []

    for line in lines:
        lower = line.lower()
        clean_line = re.sub(r"[^\d+]", "", line)

        if line in [name, company, designation]:
            continue

        if email and email.lower().replace(".", "") in lower.replace(".", ""):
            continue

        if phone and clean_line and clean_line in phone:
            continue

        if any(word in lower for word in ["email", "mail", "phone", "mob", "tel", "www"]):
            continue

        if country and country.lower() in lower:
            address_lines.append(line)
            continue

        if re.search(r"\d", line) or "," in line:
            address_lines.append(line)

    return {
        "name": name or "Not available",
        "company": company or "Not available",
        "designation": designation or "Not available",
        "phone": phone or "Not available",
        "country": country or "Not available",
        "email": email or "Not available",
        "website": website or "Not available",
        "address": ", ".join(address_lines) if address_lines else "Not available",
        "raw_text": text
    }