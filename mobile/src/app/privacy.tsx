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

type PrivacySection = {
  title: string;
  body: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBackground: string;
};

const sections: PrivacySection[] = [
  {
    title: "Information We Collect",
    body:
      "When you use Snip It, we may collect information such as your name, email address, scanned business cards, contact details extracted using OCR, and basic device information required for improving app performance.",
    icon: "document-text-outline",
    iconColor: "#09A84E",
    iconBackground: "#EAF8F0",
  },
  {
    title: "How We Use Your Information",
    body:
      "We use your information to scan business cards, organize your contacts, sync your data, improve OCR accuracy, provide customer support, and enhance your overall experience within the application.",
    icon: "analytics-outline",
    iconColor: "#7056B8",
    iconBackground: "#F1EDFF",
  },
  {
    title: "Business Card Images",
    body:
      "Business card images uploaded by you are processed securely for OCR. We do not sell or share your scanned business cards with third parties for advertising purposes.",
    icon: "images-outline",
    iconColor: "#EFA300",
    iconBackground: "#FFF5DE",
  },
  {
    title: "Data Security",
    body:
      "Your information is protected using industry-standard security measures. While we strive to safeguard your data, no online service can guarantee absolute security.",
    icon: "shield-checkmark-outline",
    iconColor: "#09A84E",
    iconBackground: "#EAF8F0",
  },
  {
    title: "Third-Party Services",
    body:
      "Snip It uses trusted third-party services including Firebase Authentication, Firebase Cloud Services, and Google AI APIs for OCR processing where applicable.",
    icon: "cloud-outline",
    iconColor: "#4B7BEC",
    iconBackground: "#EEF3FF",
  },
  {
    title: "Your Rights",
    body:
      "You can update or delete your account, request deletion of stored information, and contact us if you have questions regarding your personal data.",
    icon: "person-circle-outline",
    iconColor: "#ED5447",
    iconBackground: "#FFF0EE",
  },
];

export default function PrivacyPolicyScreen() {
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
        "Privacy link error:",
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
                Privacy Policy
              </Text>

              <Text style={styles.headerSubtitle}>
                Learn how your data is protected
              </Text>
            </View>

            <View style={styles.headerIcon}>
              <Ionicons
                name="shield-checkmark-outline"
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

            <Text style={styles.lastUpdated}>
              Last updated: 8 July 2026
            </Text>
          </View>

          {/* Intro */}
          <View style={styles.introCard}>
            <View style={styles.introIcon}>
              <Ionicons
                name="shield-checkmark"
                size={30}
                color="#09A84E"
              />
            </View>

            <Text style={styles.introTitle}>
              Your Privacy Matters
            </Text>

            <Text style={styles.introText}>
              At Snip It, protecting your privacy is
              our priority. This policy explains what
              information we collect, why we collect
              it, and how we protect it while you use
              the application.
            </Text>

            <View style={styles.privacyHighlights}>
              <View style={styles.highlightItem}>
                <Ionicons
                  name="checkmark-circle"
                  size={17}
                  color="#09A84E"
                />

                <Text style={styles.highlightText}>
                  Secure processing
                </Text>
              </View>

              <View style={styles.highlightItem}>
                <Ionicons
                  name="checkmark-circle"
                  size={17}
                  color="#09A84E"
                />

                <Text style={styles.highlightText}>
                  No advertising resale
                </Text>
              </View>
            </View>
          </View>

          {/* Policy Sections */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Policy Details
            </Text>

            <Text style={styles.sectionSubtitle}>
              How we collect, process, and protect your
              information
            </Text>
          </View>

          <View style={styles.sectionsContainer}>
            {sections.map(
              (item, index) => (
                <View
                  key={item.title}
                  style={[
                    styles.policyItem,
                    index ===
                      sections.length - 1 &&
                      styles.lastPolicyItem,
                  ]}
                >
                  <View style={styles.policyHeader}>
                    <View
                      style={[
                        styles.policyIcon,
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

                    <Text
                      style={
                        styles.policyTitle
                      }
                    >
                      {item.title}
                    </Text>
                  </View>

                  <Text style={styles.policyText}>
                    {item.body}
                  </Text>
                </View>
              )
            )}
          </View>

          {/* Contact Section */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Contact Us
            </Text>

            <Text style={styles.sectionSubtitle}>
              Reach out if you have questions about
              your privacy
            </Text>
          </View>

          <View style={styles.contactCard}>
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.contactRow}
              onPress={() =>
                openLink(
                  "mailto:support@snipit.app?subject=Privacy Policy Question",
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
                  support@snipit.app
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
                  "https://www.snipit.app",
                  "The Snip It website could not be opened."
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
                  www.snipit.app
                </Text>
              </View>

              <Ionicons
                name="open-outline"
                size={18}
                color="#A5ACB2"
              />
            </TouchableOpacity>

            <View style={styles.contactDivider} />

            <View style={styles.contactRow}>
              <View
                style={[
                  styles.contactIcon,
                  styles.locationIcon,
                ]}
              >
                <Ionicons
                  name="location-outline"
                  size={20}
                  color="#ED5447"
                />
              </View>

              <View style={styles.contactInfo}>
                <Text style={styles.contactLabel}>
                  Location
                </Text>

                <Text style={styles.contactValue}>
                  Mumbai, India
                </Text>
              </View>
            </View>
          </View>

          {/* Important Note */}
          <View style={styles.noteCard}>
            <View style={styles.noteIcon}>
              <Ionicons
                name="information-circle-outline"
                size={22}
                color="#09A84E"
              />
            </View>

            <View style={styles.noteInformation}>
              <Text style={styles.noteTitle}>
                Policy Updates
              </Text>

              <Text style={styles.noteText}>
                We may update this Privacy Policy when
                our services or legal requirements
                change. The latest revision date will
                always appear at the top of this page.
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
                Snip It
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

  lastUpdated: {
    marginLeft: 7,
    color: "#078E42",
    fontSize: 12,
    fontWeight: "700",
  },

  introCard: {
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

  introIcon: {
    width: 62,
    height: 62,
    borderRadius: 20,
    backgroundColor: "#EAF8F0",
    alignItems: "center",
    justifyContent: "center",
  },

  introTitle: {
    marginTop: 14,
    color: "#20262C",
    fontSize: 19,
    fontWeight: "800",
    textAlign: "center",
  },

  introText: {
    marginTop: 9,
    color: "#737C84",
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "500",
    textAlign: "center",
  },

  privacyHighlights: {
    width: "100%",
    marginTop: 17,
    flexDirection: "row",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: 13,
  },

  highlightItem: {
    flexDirection: "row",
    alignItems: "center",
  },

  highlightText: {
    marginLeft: 6,
    color: "#626B72",
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

  sectionsContainer: {
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

  policyItem: {
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#EDF0EE",
  },

  lastPolicyItem: {
    borderBottomWidth: 0,
  },

  policyHeader: {
    flexDirection: "row",
    alignItems: "center",
  },

  policyIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  policyTitle: {
    flex: 1,
    marginLeft: 12,
    color: "#242A30",
    fontSize: 14.5,
    fontWeight: "800",
  },

  policyText: {
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

  locationIcon: {
    backgroundColor: "#FFF0EE",
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