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

const terms = [
  {
    title: "Acceptance of Terms",
    body:
      "By downloading, accessing or using Snip It, you agree to comply with these Terms & Conditions. If you do not agree with these terms, please discontinue using the application.",
  },
  {
    title: "Use of the Application",
    body:
      "Snip It is designed to scan business cards, extract contact information using OCR technology and help users organize professional contacts. You agree to use the application only for lawful purposes.",
  },
  {
    title: "User Responsibilities",
    body:
      "You are responsible for the information you upload and store. You must ensure that the business cards and contact information you scan belong to you or that you have permission to process them.",
  },
  {
    title: "OCR Accuracy",
    body:
      "Although Snip It uses advanced OCR technology, extracted information may occasionally contain errors. Users are encouraged to verify important details before using or sharing scanned data.",
  },
  {
    title: "Subscriptions & Payments",
    body:
      "Some features may require a paid subscription. Subscription charges, renewal policies and cancellation terms will be displayed before purchase. All payments are processed securely through supported payment providers.",
  },
  {
    title: "Intellectual Property",
    body:
      "All trademarks, logos, graphics, source code, designs and other content within Snip It remain the property of their respective owners and may not be copied, modified or redistributed without written permission.",
  },
  {
    title: "Limitation of Liability",
    body:
      "Snip It shall not be held responsible for any direct, indirect or consequential damages arising from the use of the application, including inaccurate OCR results, data loss or interruptions in service.",
  },
  {
    title: "Changes to Terms",
    body:
      "We reserve the right to update these Terms & Conditions at any time. Continued use of the application after updates indicates acceptance of the revised terms.",
  },
];

export default function TermsScreen() {
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
            Terms & Conditions
          </Text>

          <View style={{ width: 42 }} />
        </View>

        <Text style={styles.updated}>
          Last Updated • 8 July 2026
        </Text>

        <View style={styles.heroCard}>
          <Ionicons
            name="document-text"
            size={38}
            color="#5B4BFF"
          />

          <Text style={styles.heroTitle}>
            Terms of Service
          </Text>

          <Text style={styles.heroText}>
            Please read these Terms & Conditions carefully before using
            Snip It. These terms explain your rights, responsibilities
            and the conditions governing your use of the application.
          </Text>
        </View>

        {terms.map((item, index) => (
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
            Need Assistance?
          </Text>

          <Text style={styles.contactText}>
            📧 support@snipit.app
          </Text>

          <Text style={styles.contactText}>
            🌐 www.snipit.app
          </Text>

          <Text style={styles.contactText}>
            We are happy to answer any questions regarding these Terms &
            Conditions.
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

  updated: {
    textAlign: "center",
    color: "#6B7280",
    fontSize: 14,
    marginBottom: 20,
  },

  heroCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",

    borderWidth: 1,
    borderColor: "#E5E7EB",

    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },

  heroTitle: {
    marginTop: 14,
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
  },

  heroText: {
    marginTop: 12,
    textAlign: "center",
    lineHeight: 24,
    fontSize: 15,
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
    backgroundColor: "#EEF2FF",
    borderRadius: 22,
    padding: 20,

    borderWidth: 1,
    borderColor: "#C7D2FE",
  },

  contactTitle: {
    fontSize: 19,
    fontWeight: "700",
    color: "#3730A3",
    marginBottom: 14,
  },

  contactText: {
    color: "#4B5563",
    fontSize: 15,
    marginBottom: 10,
    lineHeight: 22,
  },

  version: {
    marginTop: 26,
    marginBottom: 10,
    textAlign: "center",
    color: "#9CA3AF",
    fontWeight: "600",
    fontSize: 13,
  },
});