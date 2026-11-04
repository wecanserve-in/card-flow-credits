import { Alert, Linking, Platform } from "react-native";
import * as IntentLauncher from "expo-intent-launcher";

type ContactLike = {
  name?: string;
  company?: string;
  designation?: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
  country?: string;
  notes?: string;
};

const EMPTY = new Set(["", "not available", "n/a", "na", "none", "null", "-", "unknown"]);

export function hasValue(value?: string): value is string {
  return Boolean(value && !EMPTY.has(value.trim().toLowerCase()));
}

/**
 * A card's phone field can hold several numbers ("+91 98200 12345 / 022 2834 5678").
 * Returns each number once, in the order printed.
 */
export function splitPhones(phone?: string): string[] {
  if (!hasValue(phone)) {
    return [];
  }

  const parts = phone
    .split(/[,;/|\n]|\s{2,}|\s+(?:or|and|&)\s+|(?:^|\s)(?:mob|mobile|tel|ph|phone|off|office|m|t)[:.]\s*/i)
    .map((part) => part.trim())
    .filter((part) => part.replace(/\D/g, "").length >= 6);

  const seen = new Set<string>();
  const numbers: string[] = [];

  for (const part of parts) {
    const key = part.replace(/\D/g, "").slice(-10);

    if (!seen.has(key)) {
      seen.add(key);
      numbers.push(part);
    }
  }

  return numbers.length > 0 ? numbers : [phone.trim()];
}

/** Calling codes for the countries ScanMyCard users most often meet at trade fairs. */
const CALLING_CODES: Record<string, string> = {
  india: "91", "united states": "1", usa: "1", us: "1", america: "1", canada: "1",
  "united kingdom": "44", uk: "44", england: "44", "great britain": "44",
  "united arab emirates": "971", uae: "971", dubai: "971", "saudi arabia": "966",
  qatar: "974", oman: "968", kuwait: "965", bahrain: "973",
  germany: "49", france: "33", italy: "39", spain: "34", netherlands: "31",
  belgium: "32", switzerland: "41", sweden: "46", poland: "48", turkey: "90",
  australia: "61", "new zealand": "64", singapore: "65", malaysia: "60",
  china: "86", "hong kong": "852", japan: "81", "south korea": "82", korea: "82",
  bangladesh: "880", "sri lanka": "94", nepal: "977", pakistan: "92",
  "south africa": "27", kenya: "254", nigeria: "234", russia: "7", brazil: "55",
  mexico: "52", indonesia: "62", thailand: "66", vietnam: "84",
};

const isIndia = (country?: string) => {
  const c = (country || "").trim().toLowerCase();
  return !hasValue(country) || c === "india" || c === "bharat" || c === "in";
};

/**
 * Digits for wa.me (country code + number), or null when the country code
 * can't be worked out. Numbers written with + or 00 are used as they are;
 * otherwise the card's country decides (India when unknown).
 */
export function whatsappDigits(number: string, country?: string): string | null {
  const written = number.trim();
  let digits = written.replace(/\D/g, "");

  if (written.startsWith("+")) {
    return digits;
  }

  if (digits.startsWith("00")) {
    return digits.slice(2);
  }

  if (isIndia(country)) {
    if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
    if (digits.length === 12 && digits.startsWith("91")) return digits;
    return digits.length === 10 ? `91${digits}` : digits;
  }

  const code = CALLING_CODES[(country || "").trim().toLowerCase()];
  if (!code) {
    return null;
  }

  if (digits.startsWith(code) && digits.length > code.length + 6) {
    return digits;
  }

  // Drop the local trunk "0" (e.g. UK 07..., Germany 0151...).
  return code + digits.replace(/^0+/, "");
}

/**
 * Asks which number to use when the card has more than one.
 * Resolves to the chosen numbers (all of them for "Both"), or null if cancelled.
 */
export function chooseNumbers(
  numbers: string[],
  title: string,
  allowAll: boolean
): Promise<string[] | null> {
  if (numbers.length <= 1) {
    return Promise.resolve(numbers);
  }

  return new Promise((resolve) => {
    // Android shows at most 3 buttons; tapping outside cancels.
    const buttons = numbers.slice(0, allowAll ? 2 : 3).map((number) => ({
      text: number,
      onPress: () => resolve([number]),
    }));

    if (allowAll) {
      buttons.push({
        text: numbers.length === 2 ? "Save both" : "Save all",
        onPress: () => resolve(numbers),
      });
    }

    Alert.alert(
      title,
      "This card has more than one phone number.",
      buttons,
      { cancelable: true, onDismiss: () => resolve(null) }
    );
  });
}

export async function openWhatsApp(contact: ContactLike, senderName?: string) {
  const numbers = splitPhones(contact.phone);

  if (numbers.length === 0) {
    Alert.alert("Phone Unavailable", "No phone number is saved for this contact.");
    return;
  }

  const chosen = await chooseNumbers(numbers, "Which number is on WhatsApp?", false);

  if (!chosen || chosen.length === 0) {
    return;
  }

  const firstName = hasValue(contact.name) ? contact.name.trim().split(" ")[0] : "";
  const greeting =
    `Hi${firstName ? ` ${firstName}` : ""}, it was great meeting you!` +
    (senderName ? ` - ${senderName}` : "");

  const digits = whatsappDigits(chosen[0], contact.country);

  if (!digits) {
    Alert.alert(
      "Country Code Needed",
      `This number has no country code and ScanMyCard doesn't know the code for "${contact.country}". Edit the contact and write the number with + and the country code, for example +44 7700 900123.`
    );
    return;
  }

  const url = `https://wa.me/${digits}?text=${encodeURIComponent(greeting)}`;

  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert("Unable to Open", "WhatsApp could not be opened.");
  }
}

/**
 * Opens the phone's own "Add contact" screen, pre-filled. Needs no contacts
 * permission: the user reviews the details and taps Save there.
 */
export async function saveToPhoneContacts(contact: ContactLike) {
  if (Platform.OS !== "android") {
    Alert.alert("Not Available", "Saving to phone contacts is available on Android.");
    return;
  }

  const numbers = splitPhones(contact.phone);
  const chosen = await chooseNumbers(numbers, "Which number to save?", true);

  if (chosen === null) {
    return;
  }

  const extra: Record<string, string> = {};
  const put = (key: string, value?: string) => {
    if (hasValue(value)) {
      extra[key] = value.trim();
    }
  };

  put("name", contact.name);
  put("company", contact.company);
  put("job_title", contact.designation);
  put("email", contact.email);
  put("phone", chosen[0]);
  put("secondary_phone", chosen[1]);
  put("tertiary_phone", chosen[2]);
  put(
    "postal",
    [contact.address, contact.country].filter(hasValue).join(", ")
  );
  put(
    "notes",
    [
      hasValue(contact.website) ? `Website: ${contact.website}` : "",
      contact.notes || "",
      "Saved with ScanMyCard",
    ]
      .filter(Boolean)
      .join("\n")
  );

  try {
    await IntentLauncher.startActivityAsync("android.intent.action.INSERT", {
      type: "vnd.android.cursor.dir/contact",
      extra,
    });
  } catch {
    Alert.alert("Unable to Open", "Your phone's contacts app could not be opened.");
  }
}
