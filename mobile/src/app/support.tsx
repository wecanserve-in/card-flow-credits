import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Linking,
  LayoutAnimation,
  Alert,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

import BottomNav from "../components/BottomNav";

type FAQItem = {
  question: string;
  answer: string;
};

type QuickAction = {
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBackground: string;
  onPress: () => void;
};

const faqs: FAQItem[] = [
  {
    question: "How do I scan multiple business cards?",
    answer:
      "Open the Scanner screen and choose Multi Scan. Capture all cards and the app will extract them automatically.",
  },
  {
    question: "How do I export my contacts?",
    answer:
      "Go to My Cards and tap Export. You can download your saved contacts as an Excel or CSV file.",
  },
  {
    question: "Why is OCR not detecting text?",
    answer:
      "Make sure the card is well lit, clearly visible, not blurry, and occupies most of the camera frame.",
  },
  {
    question: "Can I edit scanned contacts?",
    answer:
      "Yes. Open My Cards, select a saved contact, and tap the edit option to update its information.",
  },
  {
    question: "How do I upgrade my plan?",
    answer:
      "Open Plans from the bottom navigation and select the subscription that suits your requirements.",
  },
];

export default function SupportScreen() {
  const insets = useSafeAreaInsets();

  const [search, setSearch] = useState("");
  const [openQuestion, setOpenQuestion] =
    useState<string | null>(null);

  const filteredFaqs = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) {
      return faqs;
    }

    return faqs.filter((item) =>
      `${item.question} ${item.answer}`
        .toLowerCase()
        .includes(keyword)
    );
  }, [search]);

  const openExternalURL = async (
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
        "Support link error:",
        error
      );

      Alert.alert(
        "Unable to Open",
        errorMessage
      );
    }
  };

  const quickActions: QuickAction[] = [
    {
      title: "WhatsApp",
      subtitle: "Chat with support",
      icon: "logo-whatsapp",
      iconColor: "#09A84E",
      iconBackground: "#EAF8F0",
      onPress: () =>
        openExternalURL(
          "https://wa.me/919999999999",
          "WhatsApp support could not be opened."
        ),
    },
    {
      title: "Email Us",
      subtitle: "Send us a message",
      icon: "mail-outline",
      iconColor: "#EFA300",
      iconBackground: "#FFF5DE",
      onPress: () =>
        openExternalURL(
          "mailto:support@ScanMyCard.app?subject=ScanMyCard Support",
          "Your email application could not be opened."
        ),
    },
    {
      title: "Report Bug",
      subtitle: "Tell us what went wrong",
      icon: "bug-outline",
      iconColor: "#ED5447",
      iconBackground: "#FFF0EE",
      onPress: () =>
        router.push("/report-bug" as any),
    },
    {
      title: "Request Feature",
      subtitle: "Share your suggestion",
      icon: "bulb-outline",
      iconColor: "#7056B8",
      iconBackground: "#F1EDFF",
      onPress: () =>
        router.push(
          "/feature-request" as any
        ),
    },
  ];

  const toggleFAQ = (
    question: string
  ) => {
    LayoutAnimation.configureNext(
      LayoutAnimation.Presets.easeInEaseOut
    );

    setOpenQuestion((current) =>
      current === question
        ? null
        : question
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
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
                Help & Support
              </Text>

              <Text
                style={styles.headerSubtitle}
              >
                How can we help you today?
              </Text>
            </View>

            <View style={styles.headerIcon}>
              <Ionicons
                name="headset-outline"
                size={23}
                color="#09A84E"
              />
            </View>
          </View>

          {/* Support Intro */}
          <View style={styles.heroCard}>
            <View style={styles.heroIcon}>
              <Ionicons
                name="chatbubbles-outline"
                size={27}
                color="#09A84E"
              />
            </View>

            <View style={styles.heroInformation}>
              <Text style={styles.heroTitle}>
                Need help?
              </Text>

              <Text style={styles.heroText}>
                Search common questions or contact
                our support team directly.
              </Text>
            </View>
          </View>

          {/* Search */}
          <View style={styles.searchBox}>
            <Ionicons
              name="search-outline"
              size={21}
              color="#8D959C"
            />

            <TextInput
              placeholder="Search help articles"
              placeholderTextColor="#A0A7AE"
              style={styles.input}
              value={search}
              onChangeText={setSearch}
              returnKeyType="search"
            />

            {search.length > 0 && (
              <TouchableOpacity
                activeOpacity={0.7}
                style={styles.clearButton}
                onPress={() => setSearch("")}
              >
                <Ionicons
                  name="close-circle"
                  size={21}
                  color="#A7ADB3"
                />
              </TouchableOpacity>
            )}
          </View>

          {/* Quick Actions */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Contact Support
            </Text>

            <Text style={styles.sectionSubtitle}>
              Choose the quickest way to reach us
            </Text>
          </View>

          <View style={styles.grid}>
            {quickActions.map((item) => (
              <TouchableOpacity
                key={item.title}
                activeOpacity={0.82}
                style={styles.actionCard}
                onPress={item.onPress}
              >
                <View
                  style={[
                    styles.actionIcon,
                    {
                      backgroundColor:
                        item.iconBackground,
                    },
                  ]}
                >
                  <Ionicons
                    name={item.icon}
                    size={24}
                    color={item.iconColor}
                  />
                </View>

                <Text style={styles.actionTitle}>
                  {item.title}
                </Text>

                <Text
                  numberOfLines={2}
                  style={styles.actionSubtitle}
                >
                  {item.subtitle}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* FAQs */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Frequently Asked Questions
            </Text>

            <Text style={styles.sectionSubtitle}>
              Find answers to common questions
            </Text>
          </View>

          {filteredFaqs.length > 0 ? (
            <View style={styles.faqContainer}>
              {filteredFaqs.map(
                (faq, index) => {
                  const isOpen =
                    openQuestion ===
                    faq.question;

                  return (
                    <TouchableOpacity
                      key={faq.question}
                      activeOpacity={0.82}
                      style={[
                        styles.faqItem,
                        index ===
                          filteredFaqs.length -
                            1 &&
                          styles.lastFaqItem,
                      ]}
                      onPress={() =>
                        toggleFAQ(
                          faq.question
                        )
                      }
                    >
                      <View
                        style={
                          styles.faqHeader
                        }
                      >
                        <View
                          style={
                            styles.questionIcon
                          }
                        >
                          <Ionicons
                            name="help-outline"
                            size={18}
                            color="#09A84E"
                          />
                        </View>

                        <Text
                          style={
                            styles.question
                          }
                        >
                          {faq.question}
                        </Text>

                        <View
                          style={[
                            styles.chevronBox,
                            isOpen &&
                              styles.openChevronBox,
                          ]}
                        >
                          <Ionicons
                            name={
                              isOpen
                                ? "chevron-up"
                                : "chevron-down"
                            }
                            size={18}
                            color={
                              isOpen
                                ? "#09A84E"
                                : "#91989E"
                            }
                          />
                        </View>
                      </View>

                      {isOpen && (
                        <Text
                          style={styles.answer}
                        >
                          {faq.answer}
                        </Text>
                      )}
                    </TouchableOpacity>
                  );
                }
              )}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Ionicons
                  name="search-outline"
                  size={32}
                  color="#09A84E"
                />
              </View>

              <Text style={styles.emptyTitle}>
                No help articles found
              </Text>

              <Text
                style={
                  styles.emptyDescription
                }
              >
                Try searching with a different
                keyword or contact our support team.
              </Text>
            </View>
          )}

          {/* Contact Details */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Contact Information
            </Text>

            <Text style={styles.sectionSubtitle}>
              Our team is available during business hours
            </Text>
          </View>

          <View style={styles.infoCard}>
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.infoRow}
              onPress={() =>
                openExternalURL(
                  "mailto:support@ScanMyCard.app",
                  "Your email application could not be opened."
                )
              }
            >
              <View
                style={[
                  styles.infoIcon,
                  styles.emailIcon,
                ]}
              >
                <Ionicons
                  name="mail-outline"
                  size={20}
                  color="#EFA300"
                />
              </View>

              <View style={styles.infoText}>
                <Text style={styles.infoLabel}>
                  Email
                </Text>

                <Text style={styles.infoValue}>
                  support@ScanMyCard.app
                </Text>
              </View>

              <Ionicons
                name="open-outline"
                size={18}
                color="#A5ACB2"
              />
            </TouchableOpacity>

            <View style={styles.infoDivider} />

            <View style={styles.infoRow}>
              <View
                style={[
                  styles.infoIcon,
                  styles.timeIcon,
                ]}
              >
                <Ionicons
                  name="time-outline"
                  size={20}
                  color="#7056B8"
                />
              </View>

              <View style={styles.infoText}>
                <Text style={styles.infoLabel}>
                  Working Hours
                </Text>

                <Text style={styles.infoValue}>
                  Monday–Saturday, 10:00 AM–7:00 PM
                </Text>
              </View>
            </View>

            <View style={styles.infoDivider} />

            <View style={styles.infoRow}>
              <View
                style={[
                  styles.infoIcon,
                  styles.responseIcon,
                ]}
              >
                <Ionicons
                  name="flash-outline"
                  size={20}
                  color="#09A84E"
                />
              </View>

              <View style={styles.infoText}>
                <Text style={styles.infoLabel}>
                  Typical Response
                </Text>

                <Text style={styles.infoValue}>
                  Within one business day
                </Text>
              </View>
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

  heroCard: {
    minHeight: 101,
    marginTop: 10,
    paddingHorizontal: 17,
    paddingVertical: 17,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E7ECE9",
    flexDirection: "row",
    alignItems: "center",

    shadowColor: "#17261D",
    shadowOpacity: 0.055,
    shadowRadius: 9,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    elevation: 2,
  },

  heroIcon: {
    width: 52,
    height: 52,
    borderRadius: 17,
    backgroundColor: "#EAF8F0",
    alignItems: "center",
    justifyContent: "center",
  },

  heroInformation: {
    flex: 1,
    marginLeft: 14,
  },

  heroTitle: {
    color: "#20262C",
    fontSize: 17,
    fontWeight: "800",
  },

  heroText: {
    marginTop: 5,
    color: "#7E868E",
    fontSize: 12.5,
    lineHeight: 18,
    fontWeight: "500",
  },

  searchBox: {
    height: 52,
    marginTop: 16,
    borderRadius: 17,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 15,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E8EDE9",

    shadowColor: "#17261D",
    shadowOpacity: 0.05,
    shadowRadius: 9,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    elevation: 2,
  },

  input: {
    flex: 1,
    marginHorizontal: 10,
    paddingVertical: 0,
    color: "#252B31",
    fontSize: 15,
    fontWeight: "500",
  },

  clearButton: {
    width: 34,
    height: 34,
    alignItems: "flex-end",
    justifyContent: "center",
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
    fontWeight: "500",
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },

  actionCard: {
    width: "48%",
    minHeight: 137,
    marginBottom: 13,
    paddingHorizontal: 12,
    paddingVertical: 16,
    borderRadius: 19,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E8EDE9",
    alignItems: "center",
    justifyContent: "center",

    shadowColor: "#17261D",
    shadowOpacity: 0.05,
    shadowRadius: 9,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    elevation: 2,
  },

  actionIcon: {
    width: 49,
    height: 49,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },

  actionTitle: {
    marginTop: 11,
    color: "#242A30",
    fontSize: 14,
    fontWeight: "800",
    textAlign: "center",
  },

  actionSubtitle: {
    marginTop: 5,
    color: "#8A9299",
    fontSize: 11.5,
    lineHeight: 16,
    fontWeight: "500",
    textAlign: "center",
  },

  faqContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingHorizontal: 15,
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

  faqItem: {
    paddingVertical: 17,
    borderBottomWidth: 1,
    borderBottomColor: "#EDF0EE",
  },

  lastFaqItem: {
    borderBottomWidth: 0,
  },

  faqHeader: {
    flexDirection: "row",
    alignItems: "center",
  },

  questionIcon: {
    width: 35,
    height: 35,
    borderRadius: 12,
    backgroundColor: "#EAF8F0",
    alignItems: "center",
    justifyContent: "center",
  },

  question: {
    flex: 1,
    marginLeft: 11,
    marginRight: 10,
    color: "#242A30",
    fontSize: 13.5,
    lineHeight: 19,
    fontWeight: "800",
  },

  chevronBox: {
    width: 32,
    height: 32,
    borderRadius: 11,
    backgroundColor: "#F3F5F4",
    alignItems: "center",
    justifyContent: "center",
  },

  openChevronBox: {
    backgroundColor: "#EAF8F0",
  },

  answer: {
    marginTop: 12,
    marginLeft: 46,
    marginRight: 5,
    color: "#717A82",
    fontSize: 12.5,
    lineHeight: 19,
    fontWeight: "500",
  },

  emptyState: {
    minHeight: 223,
    paddingHorizontal: 25,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E7ECE9",
    alignItems: "center",
    justifyContent: "center",
  },

  emptyIcon: {
    width: 66,
    height: 66,
    borderRadius: 21,
    backgroundColor: "#EAF8F0",
    alignItems: "center",
    justifyContent: "center",
  },

  emptyTitle: {
    marginTop: 15,
    color: "#20262C",
    fontSize: 17,
    fontWeight: "800",
    textAlign: "center",
  },

  emptyDescription: {
    marginTop: 7,
    color: "#858D95",
    fontSize: 12.5,
    lineHeight: 19,
    fontWeight: "500",
    textAlign: "center",
  },

  infoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingHorizontal: 15,
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

  infoRow: {
    minHeight: 74,
    flexDirection: "row",
    alignItems: "center",
  },

  infoIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  emailIcon: {
    backgroundColor: "#FFF5DE",
  },

  timeIcon: {
    backgroundColor: "#F1EDFF",
  },

  responseIcon: {
    backgroundColor: "#EAF8F0",
  },

  infoText: {
    flex: 1,
    marginLeft: 12,
    paddingRight: 8,
  },

  infoLabel: {
    color: "#8A9299",
    fontSize: 11.5,
    fontWeight: "600",
  },

  infoValue: {
    marginTop: 3,
    color: "#252B31",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "800",
  },

  infoDivider: {
    height: 1,
    marginLeft: 54,
    backgroundColor: "#EDF0EE",
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