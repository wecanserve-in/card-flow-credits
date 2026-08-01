import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

import BottomNav from "../components/BottomNav";

type TermsSection = {
  title: string;
  body: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBackground: string;
};

const terms: TermsSection[] = [
  {
    title: "Acceptance of Terms",
    body:
      "By downloading, accessing, or using ScanMyCard, you agree to comply with these Terms & Conditions. If you do not agree with these terms, please discontinue using the application.",
    icon: "checkmark-circle-outline",
    iconColor: "#09A84E",
    iconBackground: "#EAF8F0",
  },
  {
    title: "Use of the Application",
    body:
      "ScanMyCard is designed to scan business cards, extract contact information using OCR technology, and help users organize professional contacts. You agree to use the application only for lawful purposes.",
    icon: "phone-portrait-outline",
    iconColor: "#4B7BEC",
    iconBackground: "#EEF3FF",
  },
  {
    title: "User Responsibilities",
    body:
      "You are responsible for the information you upload and store. You must ensure that the business cards and contact information you scan belong to you or that you have permission to process them.",
    icon: "person-circle-outline",
    iconColor: "#7056B8",
    iconBackground: "#F1EDFF",
  },
  {
    title: "OCR Accuracy",
    body:
      "Although ScanMyCard uses advanced OCR technology, extracted information may occasionally contain errors. Users are encouraged to verify important details before using or sharing scanned data.",
    icon: "scan-outline",
    iconColor: "#EFA300",
    iconBackground: "#FFF5DE",
  },
  {
    title: "Subscriptions & Payments",
    body:
      "Some features may require a paid subscription. Subscription charges, renewal policies, and cancellation terms will be displayed before purchase. All payments are processed securely through supported payment providers.",
    icon: "card-outline",
    iconColor: "#09A84E",
    iconBackground: "#EAF8F0",
  },
  {
    title: "Intellectual Property",
    body:
      "All trademarks, logos, graphics, source code, designs, and other content within ScanMyCard remain the property of their respective owners and may not be copied, modified, or redistributed without written permission.",
    icon: "ribbon-outline",
    iconColor: "#ED5447",
    iconBackground: "#FFF0EE",
  },
  {
    title: "Limitation of Liability",
    body:
      "ScanMyCard shall not be held responsible for any direct, indirect, or consequential damages arising from the use of the application, including inaccurate OCR results, data loss, or interruptions in service.",
    icon: "warning-outline",
    iconColor: "#D98A00",
    iconBackground: "#FFF5DE",
  },
  {
    title: "Changes to Terms",
    body:
      "We reserve the right to update these Terms & Conditions at any time. Continued use of the application after updates indicates acceptance of the revised terms.",
    icon: "refresh-outline",
    iconColor: "#4B7BEC",
    iconBackground: "#EEF3FF",
  },
];

export default function TermsScreen() {
  const insets = useSafeAreaInsets();

  const openLink = async (
    url: string,
    errorMessage: string
  ) => {
    try {
      const supported =
        await Linking.canOpenURL(url);

      if (!supported) {
        Alert.alert(
          "Unable to Open",
          errorMessage
        );
        return;
      }

      await Linking.openURL(url);
    } catch (error) {
      console.error(
        "Terms link error:",
        error
      );

      Alert.alert(
        "Unable to Open",
        errorMessage
      );
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingBottom:
                120 + insets.bottom,
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              activeOpacity={0.75}
              style={styles.backButton}
              onPress={() =>
                router.back()
              }
            >
              <Ionicons
                name="arrow-back"
                size={22}
                color="#20262C"
              />
            </TouchableOpacity>

            <View style={styles.headerText}>
              <Text style={styles.heading}>
                Terms & Conditions
              </Text>

              <Text style={styles.headerSubtitle}>
                Review the rules for using ScanMyCard
              </Text>
            </View>

            <View style={styles.headerIcon}>
              <Ionicons
                name="document-text-outline"
                size={23}
                color="#09A84E"
              />
            </View>
          </View>

          {/* Updated Date */}
          <View style={styles.updatedBadge}>
            <Ionicons
              name="calendar-outline"
              size={15}
              color="#09A84E"
            />

            <Text style={styles.updated}>
              Last updated: 8 July 2026
            </Text>
          </View>

          {/* Hero */}
          <View style={styles.heroCard}>
            <View style={styles.heroIcon}>
              <Ionicons
                name="document-text"
                size={31}
                color="#09A84E"
              />
            </View>

            <Text style={styles.heroTitle}>
              Terms of Service
            </Text>

            <Text style={styles.heroText}>
              Please read these Terms & Conditions
              carefully before using ScanMyCard. They
              explain your rights, responsibilities,
              and the conditions governing your use
              of the application.
            </Text>

            <View style={styles.heroNote}>
              <Ionicons
                name="information-circle-outline"
                size={18}
                color="#09A84E"
              />

              <Text style={styles.heroNoteText}>
                Using the app means you accept these
                terms.
              </Text>
            </View>
          </View>

          {/* Terms Sections */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Terms Details
            </Text>

            <Text style={styles.sectionSubtitle}>
              Important conditions related to your use
              of the application
            </Text>
          </View>

          <View style={styles.termsContainer}>
            {terms.map(
              (item, index) => (
                <View
                  key={item.title}
                  style={[
                    styles.termItem,
                    index ===
                      terms.length - 1 &&
                      styles.lastTermItem,
                  ]}
                >
                  <View style={styles.termHeader}>
                    <View
                      style={[
                        styles.termIcon,
                        {
                          backgroundColor:
                            item.iconBackground,
                        },
                      ]}
                    >
                      <Ionicons
                        name={item.icon}
                        size={21}
                        color={item.iconColor}
                      />
                    </View>

                    <Text style={styles.termTitle}>
                      {item.title}
                    </Text>
                  </View>

                  <Text style={styles.termText}>
                    {item.body}
                  </Text>
                </View>
              )
            )}
          </View>

          {/* Assistance */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Need Assistance?
            </Text>

            <Text style={styles.sectionSubtitle}>
              Contact us if you have questions about
              these terms
            </Text>
          </View>

          <View style={styles.contactCard}>
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.contactRow}
              onPress={() =>
                openLink(
                  "mailto:support@ScanMyCard.app?subject=Terms and Conditions Question",
                  "Your email application could not be opened."
                )
              }
            >
              <View
                style={[
                  styles.contactIcon,
                  styles.emailIcon,
                ]}
              >
                <Ionicons
                  name="mail-outline"
                  size={20}
                  color="#EFA300"
                />
              </View>

              <View style={styles.contactInfo}>
                <Text style={styles.contactLabel}>
                  Email
                </Text>

                <Text style={styles.contactValue}>
                  support@ScanMyCard.app
                </Text>
              </View>

              <Ionicons
                name="open-outline"
                size={18}
                color="#A5ACB2"
              />
            </TouchableOpacity>

            <View style={styles.contactDivider} />

            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.contactRow}
              onPress={() =>
                openLink(
                  "https://www.ScanMyCard.app",
                  "The ScanMyCard website could not be opened."
                )
              }
            >
              <View
                style={[
                  styles.contactIcon,
                  styles.websiteIcon,
                ]}
              >
                <Ionicons
                  name="globe-outline"
                  size={20}
                  color="#4B7BEC"
                />
              </View>

              <View style={styles.contactInfo}>
                <Text style={styles.contactLabel}>
                  Website
                </Text>

                <Text style={styles.contactValue}>
                  www.ScanMyCard.app
                </Text>
              </View>

              <Ionicons
                name="open-outline"
                size={18}
                color="#A5ACB2"
              />
            </TouchableOpacity>

            <View style={styles.contactDivider} />

            <View style={styles.contactMessageRow}>
              <View
                style={[
                  styles.contactIcon,
                  styles.supportIcon,
                ]}
              >
                <Ionicons
                  name="chatbubble-ellipses-outline"
                  size={20}
                  color="#7056B8"
                />
              </View>

              <Text style={styles.contactMessage}>
                We are happy to answer any questions
                regarding these Terms & Conditions.
              </Text>
            </View>
          </View>

          {/* Legal Note */}
          <View style={styles.noteCard}>
            <View style={styles.noteIcon}>
              <Ionicons
                name="alert-circle-outline"
                size={22}
                color="#09A84E"
              />
            </View>

            <View style={styles.noteInformation}>
              <Text style={styles.noteTitle}>
                Terms Updates
              </Text>

              <Text style={styles.noteText}>
                We may revise these terms when our
                services, features, or legal
                requirements change. The latest
                revision date will appear at the top
                of this page.
              </Text>
            </View>
          </View>

          {/* Version */}
          <View style={styles.versionContainer}>
            <View style={styles.appIcon}>
              <Ionicons
                name="scan-outline"
                size={19}
                color="#09A84E"
              />
            </View>

            <View>
              <Text style={styles.appName}>
                ScanMyCard
              </Text>

              <Text style={styles.version}>
                Version 1.0.0
              </Text>
            </View>
          </View>
        </ScrollView>

        <BottomNav active="settings" />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  container: {
    flex: 1,
    backgroundColor: "#F8FAF9",
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 5,
  },

  header: {
    minHeight: 80,
    flexDirection: "row",
    alignItems: "center",
  },

  backButton: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5EAE7",
    alignItems: "center",
    justifyContent: "center",

    shadowColor: "#17261D",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    elevation: 2,
  },

  headerText: {
    flex: 1,
    marginLeft: 13,
  },

  heading: {
    color: "#171C21",
    fontSize: 22,
    fontWeight: "800",
  },

  headerSubtitle: {
    marginTop: 4,
    color: "#858D95",
    fontSize: 12.5,
    fontWeight: "500",
  },

  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: "#EAF8F0",
    alignItems: "center",
    justifyContent: "center",
  },

  updatedBadge: {
    alignSelf: "flex-start",
    minHeight: 34,
    marginTop: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: "#EAF8F0",
    flexDirection: "row",
    alignItems: "center",
  },

  updated: {
    marginLeft: 7,
    color: "#078E42",
    fontSize: 12,
    fontWeight: "700",
  },

  heroCard: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 22,
    borderRadius: 21,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E7ECE9",
    alignItems: "center",

    shadowColor: "#17261D",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 3,
  },

  heroIcon: {
    width: 62,
    height: 62,
    borderRadius: 20,
    backgroundColor: "#EAF8F0",
    alignItems: "center",
    justifyContent: "center",
  },

  heroTitle: {
    marginTop: 14,
    color: "#20262C",
    fontSize: 19,
    fontWeight: "800",
    textAlign: "center",
  },

  heroText: {
    marginTop: 9,
    color: "#737C84",
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "500",
    textAlign: "center",
  },

  heroNote: {
    minHeight: 36,
    marginTop: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: "#EAF8F0",
    flexDirection: "row",
    alignItems: "center",
  },

  heroNoteText: {
    marginLeft: 7,
    color: "#078E42",
    fontSize: 11.5,
    fontWeight: "700",
  },

  sectionHeader: {
    marginTop: 25,
    marginBottom: 12,
  },

  sectionTitle: {
    color: "#171C21",
    fontSize: 17,
    fontWeight: "800",
  },

  sectionSubtitle: {
    marginTop: 4,
    color: "#858D95",
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "500",
  },

  termsContainer: {
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E7ECE9",

    shadowColor: "#17261D",
    shadowOpacity: 0.045,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    elevation: 2,
  },

  termItem: {
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#EDF0EE",
  },

  lastTermItem: {
    borderBottomWidth: 0,
  },

  termHeader: {
    flexDirection: "row",
    alignItems: "center",
  },

  termIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  termTitle: {
    flex: 1,
    marginLeft: 12,
    color: "#242A30",
    fontSize: 14.5,
    fontWeight: "800",
  },

  termText: {
    marginTop: 11,
    marginLeft: 54,
    color: "#717A82",
    fontSize: 12.5,
    lineHeight: 20,
    fontWeight: "500",
  },

  contactCard: {
    paddingHorizontal: 15,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E7ECE9",

    shadowColor: "#17261D",
    shadowOpacity: 0.045,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    elevation: 2,
  },

  contactRow: {
    minHeight: 74,
    flexDirection: "row",
    alignItems: "center",
  },

  contactMessageRow: {
    minHeight: 86,
    flexDirection: "row",
    alignItems: "center",
  },

  contactIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  emailIcon: {
    backgroundColor: "#FFF5DE",
  },

  websiteIcon: {
    backgroundColor: "#EEF3FF",
  },

  supportIcon: {
    backgroundColor: "#F1EDFF",
  },

  contactInfo: {
    flex: 1,
    marginLeft: 12,
    paddingRight: 8,
  },

  contactLabel: {
    color: "#8A9299",
    fontSize: 11.5,
    fontWeight: "600",
  },

  contactValue: {
    marginTop: 3,
    color: "#252B31",
    fontSize: 13,
    fontWeight: "800",
  },

  contactMessage: {
    flex: 1,
    marginLeft: 12,
    color: "#717A82",
    fontSize: 12.5,
    lineHeight: 19,
    fontWeight: "500",
  },

  contactDivider: {
    height: 1,
    marginLeft: 54,
    backgroundColor: "#EDF0EE",
  },

  noteCard: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 17,
    borderRadius: 19,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E7ECE9",
    flexDirection: "row",
    alignItems: "flex-start",
  },

  noteIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#EAF8F0",
    alignItems: "center",
    justifyContent: "center",
  },

  noteInformation: {
    flex: 1,
    marginLeft: 13,
  },

  noteTitle: {
    color: "#242A30",
    fontSize: 14,
    fontWeight: "800",
  },

  noteText: {
    marginTop: 5,
    color: "#737C84",
    fontSize: 12.5,
    lineHeight: 19,
    fontWeight: "500",
  },

  versionContainer: {
    marginTop: 22,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  appIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: "#EAF8F0",
    alignItems: "center",
    justifyContent: "center",
  },

  appName: {
    marginLeft: 10,
    color: "#667078",
    fontSize: 12.5,
    fontWeight: "800",
  },

  version: {
    marginLeft: 10,
    marginTop: 2,
    color: "#A0A7AD",
    fontSize: 11.5,
    fontWeight: "500",
  },
});