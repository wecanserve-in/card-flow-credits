import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Linking,
  LayoutAnimation,
  Platform,
  UIManager,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

import BottomNav from "../components/BottomNav";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const faqs = [
  {
    question: "How do I scan multiple business cards?",
    answer:
      "Open the Scanner screen and choose Multi Scan. Capture all cards and we'll extract them automatically.",
  },
  {
    question: "How do I export my contacts?",
    answer:
      "Go to My Cards and tap Export. You can download Excel or CSV files.",
  },
  {
    question: "Why is OCR not detecting text?",
    answer:
      "Ensure the card is well lit, not blurry and occupies most of the camera frame.",
  },
  {
    question: "Can I edit scanned contacts?",
    answer:
      "Yes. Open My Cards, select any contact and tap Edit.",
  },
  {
    question: "How do I upgrade my plan?",
    answer:
      "Open Plans from the bottom navigation and choose the plan that suits you.",
  },
];

export default function SupportScreen() {
  const [search, setSearch] = useState("");
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const filteredFaqs = faqs.filter((item) =>
    item.question.toLowerCase().includes(search.toLowerCase())
  );

  const toggleFAQ = (index: number) => {
    LayoutAnimation.configureNext(
      LayoutAnimation.Presets.easeInEaseOut
    );

    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* Header */}

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
            Help & Support
          </Text>

          <View style={{ width: 42 }} />
        </View>

        <Text style={styles.subtitle}>
          How can we help you today?
        </Text>

        {/* Search */}

        <View style={styles.searchBox}>
          <Ionicons
            name="search"
            size={20}
            color="#9CA3AF"
          />

          <TextInput
            placeholder="Search help articles..."
            placeholderTextColor="#9CA3AF"
            style={styles.input}
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {/* Quick Actions */}

        <View style={styles.grid}>

          <TouchableOpacity
            style={styles.card}
            onPress={() =>
              Linking.openURL(
                "https://wa.me/919999999999"
              )
            }
          >
            <View
              style={[
                styles.iconCircle,
                { backgroundColor: "#DCFCE7" },
              ]}
            >
              <Ionicons
                name="logo-whatsapp"
                size={26}
                color="#16A34A"
              />
            </View>

            <Text style={styles.cardTitle}>
              Contact Support
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.card}
            onPress={() =>
              Linking.openURL(
                "mailto:support@snipit.app"
              )
            }
          >
            <View
              style={[
                styles.iconCircle,
                { backgroundColor: "#DBEAFE" },
              ]}
            >
              <Ionicons
                name="mail-outline"
                size={26}
                color="#2563EB"
              />
            </View>

            <Text style={styles.cardTitle}>
              Email Us
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.card}
            onPress={() =>
              router.push("/report-bug" as any)
            }
          >
            <View
              style={[
                styles.iconCircle,
                { backgroundColor: "#FEE2E2" },
              ]}
            >
              <Ionicons
                name="bug-outline"
                size={26}
                color="#DC2626"
              />
            </View>

            <Text style={styles.cardTitle}>
              Report Bug
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.card}
            onPress={() =>
              router.push("/feature-request" as any)
            }
          >
            <View
              style={[
                styles.iconCircle,
                { backgroundColor: "#FEF3C7" },
              ]}
            >
              <Ionicons
                name="bulb-outline"
                size={26}
                color="#D97706"
              />
            </View>

            <Text style={styles.cardTitle}>
              Feature Request
            </Text>
          </TouchableOpacity>

        </View>

        {/* FAQ */}

        <Text style={styles.sectionTitle}>
          Frequently Asked Questions
        </Text>

        <View style={styles.faqContainer}>
          {filteredFaqs.map((faq, index) => (
            <TouchableOpacity
              key={index}
              style={styles.faqItem}
              activeOpacity={0.8}
              onPress={() => toggleFAQ(index)}
            >
              <View style={styles.faqHeader}>
                <Text style={styles.question}>
                  {faq.question}
                </Text>

                <Ionicons
                  name={
                    openIndex === index
                      ? "chevron-up"
                      : "chevron-down"
                  }
                  size={20}
                  color="#6B7280"
                />
              </View>

              {openIndex === index && (
                <Text style={styles.answer}>
                  {faq.answer}
                </Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Contact */}

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>
            Contact Information
          </Text>

          <Text style={styles.infoText}>
            📧 support@snipit.app
          </Text>

          <Text style={styles.infoText}>
            🕒 Mon - Sat | 10:00 AM - 7:00 PM
          </Text>
        </View>

        <Text style={styles.version}>
          Snip It v1.0.0
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
    marginBottom: 8,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",

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

  subtitle: {
    fontSize: 15,
    color: "#6B7280",
    marginBottom: 20,
  },

  searchBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingHorizontal: 16,
    height: 56,
    flexDirection: "row",
    alignItems: "center",

    borderWidth: 1,
    borderColor: "#E5E7EB",

    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },

  input: {
    flex: 1,
    marginLeft: 12,
    fontSize: 15,
    color: "#111827",
  },

  grid: {
    marginTop: 24,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },

  card: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    paddingVertical: 22,
    paddingHorizontal: 16,
    alignItems: "center",
    marginBottom: 16,

    borderWidth: 1,
    borderColor: "#E5E7EB",

    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },

  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },

  cardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
  },

  sectionTitle: {
    marginTop: 18,
    marginBottom: 14,
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
  },

  faqContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,

    borderWidth: 1,
    borderColor: "#E5E7EB",

    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },

  faqItem: {
    paddingHorizontal: 18,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF2F7",
  },

  faqHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  question: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    marginRight: 12,
  },

  answer: {
    marginTop: 12,
    fontSize: 14,
    lineHeight: 22,
    color: "#6B7280",
  },

  infoCard: {
    marginTop: 24,
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

  infoTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 14,
  },

  infoText: {
    fontSize: 15,
    color: "#6B7280",
    marginBottom: 10,
  },

  version: {
    textAlign: "center",
    marginTop: 26,
    marginBottom: 12,
    color: "#9CA3AF",
    fontWeight: "600",
    fontSize: 13,
  },
});