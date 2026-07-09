import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

import BottomNav from "../components/BottomNav";

const sections = [
  {
    title: "Information We Collect",
    body:
      "When you use Snip It, we may collect information such as your name, email address, scanned business cards, contact details extracted using OCR, and basic device information required for improving app performance.",
  },
  {
    title: "How We Use Your Information",
    body:
      "We use your information to scan business cards, organize your contacts, sync your data, improve OCR accuracy, provide customer support, and enhance your overall experience within the application.",
  },
  {
    title: "Business Card Images",
    body:
      "Business card images uploaded by you are processed securely for OCR. We do not sell or share your scanned business cards with third parties for advertising purposes.",
  },
  {
    title: "Data Security",
    body:
      "Your information is protected using industry-standard security measures. While we strive to safeguard your data, no online service can guarantee absolute security.",
  },
  {
    title: "Third-Party Services",
    body:
      "Snip It uses trusted third-party services including Firebase Authentication, Firebase Cloud Services and Google AI APIs for OCR processing where applicable.",
  },
  {
    title: "Your Rights",
    body:
      "You can update or delete your account, request deletion of stored information, and contact us if you have questions regarding your personal data.",
  },
];

export default function PrivacyPolicyScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: 120,
        }}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons
              name="arrow-back"
              size={22}
              color="#111827"
            />
          </TouchableOpacity>

          <Text style={styles.heading}>
            Privacy Policy
          </Text>

          <View style={{ width: 42 }} />
        </View>

        <Text style={styles.lastUpdated}>
          Last Updated • 8 July 2026
        </Text>

        <View style={styles.introCard}>
          <Ionicons
            name="shield-checkmark"
            size={34}
            color="#5B4BFF"
          />

          <Text style={styles.introTitle}>
            Your Privacy Matters
          </Text>

          <Text style={styles.introText}>
            At Snip It, protecting your privacy is our priority.
            This Privacy Policy explains what information we collect,
            why we collect it and how we keep it secure while you use
            our application.
          </Text>
        </View>

        {sections.map((item, index) => (
          <View
            key={index}
            style={styles.card}
          >
            <Text style={styles.cardTitle}>
              {item.title}
            </Text>

            <Text style={styles.cardText}>
              {item.body}
            </Text>
          </View>
        ))}

        <View style={styles.contactCard}>
          <Text style={styles.contactTitle}>
            Contact Us
          </Text>

          <Text style={styles.contactText}>
            📧 support@snipit.app
          </Text>

          <Text style={styles.contactText}>
            🌐 www.snipit.app
          </Text>

          <Text style={styles.contactText}>
            🇮🇳 Mumbai, India
          </Text>
        </View>

        <Text style={styles.version}>
          Snip It Version 1.0.0
        </Text>

      </ScrollView>

      <BottomNav active="settings" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 18,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
    marginBottom: 10,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",

    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },

  heading: {
    fontSize: 24,
    fontWeight: "800",
    color: "#111827",
  },

  lastUpdated: {
    textAlign: "center",
    color: "#6B7280",
    fontSize: 14,
    marginBottom: 20,
  },

  introCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 22,
    alignItems: "center",

    borderWidth: 1,
    borderColor: "#E5E7EB",

    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },

  introTitle: {
    marginTop: 12,
    fontSize: 21,
    fontWeight: "800",
    color: "#111827",
  },

  introText: {
    marginTop: 12,
    textAlign: "center",
    fontSize: 15,
    lineHeight: 24,
    color: "#6B7280",
  },

  card: {
    marginTop: 18,
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 20,

    borderWidth: 1,
    borderColor: "#E5E7EB",

    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },

  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 10,
  },

  cardText: {
    color: "#6B7280",
    fontSize: 15,
    lineHeight: 24,
  },

  contactCard: {
    marginTop: 24,
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 22,

    borderWidth: 1,
    borderColor: "#E5E7EB",

    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },

  contactTitle: {
    fontSize: 19,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 16,
  },

  contactText: {
    fontSize: 15,
    color: "#6B7280",
    marginBottom: 10,
  },

  version: {
    marginTop: 26,
    marginBottom: 12,
    textAlign: "center",
    color: "#9CA3AF",
    fontSize: 13,
    fontWeight: "600",
  },
});