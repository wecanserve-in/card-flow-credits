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

/** Digits for wa.me: Indian 10-digit numbers get the 91 country code. */
export function whatsappDigits(number: string): string {
  let digits = number.replace(/\D/g, "");

  if (digits.startsWith("00")) {
    digits = digits.slice(2);
  }

  if (digits.length === 11 && digits.startsWith("0")) {
    digits = digits.slice(1);
  }

  if (digits.length === 10) {
    digits = `91${digits}`;
  }

  return digits;
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

  const url = `https://wa.me/${whatsappDigits(chosen[0])}?text=${encodeURIComponent(greeting)}`;

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
