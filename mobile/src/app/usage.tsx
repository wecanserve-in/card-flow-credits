import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { doc, onSnapshot } from "firebase/firestore";

import BottomNav from "@/components/BottomNav";
import { auth, db } from "../services/firebase";
import { User } from "../types/user";

export default function UsageScreen() {
  const insets = useSafeAreaInsets();

  const [userData, setUserData] =
    useState<User | null>(null);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(
      doc(db, "users", currentUser.uid),
      (snapshot) => {
        if (snapshot.exists()) {
          setUserData(snapshot.data() as User);
        }

        setLoading(false);
      },
      (error) => {
        console.error(
          "Failed to load usage data:",
          error
        );

        setLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  const planName =
  userData?.packName ??
  userData?.planName ??
  "Free Plan";

const totalScans =
  userData?.totalScans ??
  userData?.freeScanLimit ??
  5;

const usedScans =
  userData?.usedScans ??
  userData?.freeScansUsed ??
  0;

const remainingScans =
  userData?.remainingScans ??
  Math.max(totalScans - usedScans, 0);

const exportsGenerated =
  userData?.exportsGenerated ?? 0;

const aiExtractions = usedScans;

const progress = Math.min(
  totalScans > 0
    ? (usedScans / totalScans) * 100
    : 0,
  100
);

const progressPercentage =
  Math.round(progress);

  const renewDate =
    userData?.subscriptionActive &&
    userData.subscriptionExpiry
      ? new Date(
          userData.subscriptionExpiry
        ).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "No Expiry";

  const renewalLabel =
    userData?.subscriptionActive
      ? "Renewal Date"
      : "Plan Validity";

  if (loading) {
    return (
      <SafeAreaView style={styles.loaderPage}>
        <ActivityIndicator
          size="large"
          color="#09A84E"
        />

        <Text style={styles.loadingText}>
          Loading usage...
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingBottom:
                190 + insets.bottom,
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.heading}>
                Usage
              </Text>

              <Text style={styles.subHeading}>
                Monitor your ScanMyCard usage
              </Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.historyButton}
              onPress={() =>
                router.push("/saved-contacts")
              }
            >
              <Ionicons
                name="time-outline"
                size={23}
                color="#09A84E"
              />
            </TouchableOpacity>
          </View>

          {/* Plan Card */}
          <View style={styles.planCard}>
            <View style={styles.planTop}>
              <View style={styles.planInformation}>
                <View style={styles.planLabelRow}>
                  <Ionicons
                    name="star"
                    size={16}
                    color="#F4B800"
                  />

                  <Text style={styles.planLabel}>
                    Current Plan
                  </Text>
                </View>

                <Text
                  numberOfLines={1}
                  style={styles.planName}
                >
                  {planName}
                </Text>
              </View>

              <TouchableOpacity
                activeOpacity={0.84}
                style={styles.smallUpgrade}
                onPress={() =>
                  router.push("/plans")
                }
              >
                <Text
                  style={styles.smallUpgradeText}
                >
                  {userData?.subscriptionActive
                    ? "Manage"
                    : "Upgrade"}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.progressHeader}>
              <View>
                <Text style={styles.progressTitle}>
                  Scan Usage
                </Text>

                <Text
                  style={styles.progressDescription}
                >
                  {remainingScans} scans remaining
                </Text>
              </View>

              <View style={styles.progressValueBox}>
                <Text style={styles.progressValue}>
                  {usedScans}/{totalScans}
                </Text>
              </View>
            </View>

            <View style={styles.progressBackground}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${progress}%`,
                  },
                ]}
              />
            </View>

            <View style={styles.progressFooter}>
              <Text style={styles.progressFooterText}>
                {progressPercentage}% used
              </Text>

              <Text style={styles.progressFooterText}>
                {remainingScans} available
              </Text>
            </View>
          </View>

          {/* Statistics */}
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>
                Usage Overview
              </Text>

              <Text style={styles.sectionSubtitle}>
                Your activity summary
              </Text>
            </View>
          </View>

          <View style={styles.grid}>
            <View style={styles.statCard}>
              <View
                style={[
                  styles.statIcon,
                  styles.scansIcon,
                ]}
              >
                <Ionicons
                  name="scan-outline"
                  size={25}
                  color="#09A84E"
                />
              </View>

              <Text style={styles.statNumber}>
                {usedScans}
              </Text>

              <Text style={styles.statLabel}>
                Cards Scanned
              </Text>
            </View>

            <View style={styles.statCard}>
              <View
                style={[
                  styles.statIcon,
                  styles.aiIcon,
                ]}
              >
                <Ionicons
                  name="sparkles-outline"
                  size={25}
                  color="#7056B8"
                />
              </View>

              <Text style={styles.statNumber}>
                {aiExtractions}
              </Text>

              <Text style={styles.statLabel}>
                AI Extractions
              </Text>
            </View>

            <View style={styles.statCard}>
              <View
                style={[
                  styles.statIcon,
                  styles.exportIcon,
                ]}
              >
                <Ionicons
                  name="download-outline"
                  size={25}
                  color="#EFA300"
                />
              </View>

              <Text style={styles.statNumber}>
                {exportsGenerated}
              </Text>

              <Text style={styles.statLabel}>
                Excel Exports
              </Text>
            </View>

            <View style={styles.statCard}>
              <View
                style={[
                  styles.statIcon,
                  styles.calendarIcon,
                ]}
              >
                <Ionicons
                  name="calendar-outline"
                  size={25}
                  color="#ED5447"
                />
              </View>

              <Text
                numberOfLines={2}
                style={[
                  styles.statNumber,
                  styles.dateNumber,
                ]}
              >
                {renewDate}
              </Text>

              <Text style={styles.statLabel}>
                {renewalLabel}
              </Text>
            </View>
          </View>

          {/* Usage Information */}
          <View style={styles.tipCard}>
            <View style={styles.tipIcon}>
              <Ionicons
                name="bulb-outline"
                size={22}
                color="#09A84E"
              />
            </View>

            <View style={styles.tipInformation}>
              <Text style={styles.tipTitle}>
                Did you know?
              </Text>

              <Text style={styles.tipText}>
                A scan is deducted only when AI
                successfully extracts information
                from a business card.
              </Text>
            </View>
          </View>

          {/* Plan Information */}
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <View style={styles.infoLeft}>
                <View
                  style={[
                    styles.infoIcon,
                    styles.planInfoIcon,
                  ]}
                >
                  <Ionicons
                    name="diamond-outline"
                    size={20}
                    color="#09A84E"
                  />
                </View>

                <View>
                  <Text style={styles.infoTitle}>
                    Plan
                  </Text>

                  <Text style={styles.infoValue}>
                    {planName}
                  </Text>
                </View>
              </View>

              <Ionicons
                name="chevron-forward"
                size={20}
                color="#A8AFB5"
              />
            </View>

            <View style={styles.infoDivider} />

            <View style={styles.infoRow}>
              <View style={styles.infoLeft}>
                <View
                  style={[
                    styles.infoIcon,
                    styles.statusInfoIcon,
                  ]}
                >
                  <Ionicons
                    name={
                      userData?.subscriptionActive
                        ? "checkmark-circle-outline"
                        : "information-circle-outline"
                    }
                    size={21}
                    color={
                      userData?.subscriptionActive
                        ? "#09A84E"
                        : "#EFA300"
                    }
                  />
                </View>

                <View>
                  <Text style={styles.infoTitle}>
                    Subscription Status
                  </Text>

                  <Text style={styles.infoValue}>
                    {userData?.packId === "free"
                      ? "Free Plan"
                      : "Purchased"}
                  </Text>
                </View>
              </View>

              <View
                style={[
                  styles.statusBadge,
                  userData?.subscriptionActive
                    ? styles.activeStatusBadge
                    : styles.freeStatusBadge,
                ]}
              >
                <Text
                  style={[
                    styles.statusBadgeText,
                    userData?.subscriptionActive
                      ? styles.activeStatusText
                      : styles.freeStatusText,
                  ]}
                >
                  {userData?.packId === "free"
                    ? "Free"
                    : "purchased"}
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Bottom CTA */}
        <View
          style={[
            styles.bottomCTA,
            {
              bottom: 76 + insets.bottom,
            },
          ]}
        >
          <TouchableOpacity
            activeOpacity={0.86}
            style={styles.button}
            onPress={() =>
              router.push("/plans")
            }
          >
            <Ionicons
              name="diamond-outline"
              color="#FFFFFF"
              size={22}
            />

            <Text style={styles.buttonText}>
              {userData?.subscriptionActive
                ? "Manage Subscription"
                : "Upgrade Plan"}
            </Text>
          </TouchableOpacity>
        </View>

        <BottomNav active="plans" />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loaderPage: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },

  loadingText: {
    marginTop: 12,
    color: "#858D95",
    fontSize: 13,
    fontWeight: "500",
  },

  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  container: {
    flex: 1,
    backgroundColor: "#F8FAF9",
  },

  scrollContent: {
    paddingTop: 4,
  },

  header: {
    minHeight: 88,
    paddingHorizontal: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  headerText: {
    flex: 1,
    paddingRight: 12,
  },

  heading: {
    color: "#171C21",
    fontSize: 23,
    fontWeight: "800",
  },

  subHeading: {
    marginTop: 5,
    color: "#858D95",
    fontSize: 13,
    fontWeight: "500",
  },

  historyButton: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: "#EAF8F0",
    justifyContent: "center",
    alignItems: "center",
  },

  planCard: {
    marginHorizontal: 20,
    marginTop: 8,
    minHeight: 232,
    paddingHorizontal: 21,
    paddingVertical: 20,
    borderRadius: 23,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E7ECE9",

    shadowColor: "#17261D",
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: {
      width: 0,
      height: 6,
    },
    elevation: 5,
  },

  planTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  planInformation: {
    flex: 1,
    paddingRight: 12,
  },

  planLabelRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  planLabel: {
    marginLeft: 6,
    color: "#717980",
    fontSize: 13,
    fontWeight: "700",
  },

  planName: {
    marginTop: 7,
    color: "#1B2127",
    fontSize: 21,
    fontWeight: "800",
  },

  smallUpgrade: {
    minWidth: 88,
    height: 42,
    paddingHorizontal: 15,
    borderRadius: 14,
    backgroundColor: "#09AA4D",
    alignItems: "center",
    justifyContent: "center",

    shadowColor: "#078A3E",
    shadowOpacity: 0.18,
    shadowRadius: 7,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    elevation: 3,
  },

  smallUpgradeText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },

  progressHeader: {
    marginTop: 27,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  progressTitle: {
    color: "#232A30",
    fontSize: 15,
    fontWeight: "800",
  },

  progressDescription: {
    marginTop: 4,
    color: "#868E96",
    fontSize: 12,
    fontWeight: "500",
  },

  progressValueBox: {
    minWidth: 67,
    height: 36,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: "#EAF8F0",
    alignItems: "center",
    justifyContent: "center",
  },

  progressValue: {
    color: "#09A84E",
    fontSize: 14,
    fontWeight: "800",
  },

  progressBackground: {
    marginTop: 17,
    height: 9,
    backgroundColor: "#E9EEEB",
    borderRadius: 10,
    overflow: "hidden",
  },

  progressFill: {
    height: "100%",
    minWidth: 3,
    backgroundColor: "#09AA4D",
    borderRadius: 10,
  },

  progressFooter: {
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  progressFooterText: {
    color: "#7C848B",
    fontSize: 11.5,
    fontWeight: "600",
  },

  sectionHeader: {
    marginTop: 27,
    paddingHorizontal: 20,
  },

  sectionTitle: {
    color: "#171C21",
    fontSize: 19,
    fontWeight: "800",
  },

  sectionSubtitle: {
    marginTop: 4,
    color: "#899199",
    fontSize: 12,
    fontWeight: "500",
  },

  grid: {
    marginTop: 15,
    paddingHorizontal: 20,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },

  statCard: {
    width: "48%",
    minHeight: 151,
    backgroundColor: "#FFFFFF",
    borderRadius: 19,
    paddingHorizontal: 12,
    paddingVertical: 17,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 13,
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

  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },

  scansIcon: {
    backgroundColor: "#EAF8F0",
  },

  aiIcon: {
    backgroundColor: "#F1EDFF",
  },

  exportIcon: {
    backgroundColor: "#FFF5DE",
  },

  calendarIcon: {
    backgroundColor: "#FFF0EE",
  },

  statNumber: {
    marginTop: 11,
    color: "#20262C",
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
  },

  dateNumber: {
    maxWidth: 125,
    fontSize: 16,
    lineHeight: 20,
  },

  statLabel: {
    marginTop: 5,
    color: "#7B838B",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "600",
    textAlign: "center",
  },

  tipCard: {
    marginHorizontal: 20,
    marginTop: 5,
    backgroundColor: "#FFFFFF",
    borderRadius: 19,
    paddingHorizontal: 16,
    paddingVertical: 17,
    flexDirection: "row",
    alignItems: "flex-start",
    borderWidth: 1,
    borderColor: "#E8EDE9",

    shadowColor: "#17261D",
    shadowOpacity: 0.045,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    elevation: 2,
  },

  tipIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#EAF8F0",
    alignItems: "center",
    justifyContent: "center",
  },

  tipInformation: {
    flex: 1,
    marginLeft: 13,
  },

  tipTitle: {
    color: "#20262C",
    fontSize: 15,
    fontWeight: "800",
  },

  tipText: {
    marginTop: 5,
    color: "#737C84",
    fontSize: 12.5,
    lineHeight: 19,
    fontWeight: "500",
  },

  infoCard: {
    marginHorizontal: 20,
    marginTop: 14,
    backgroundColor: "#FFFFFF",
    borderRadius: 19,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#E8EDE9",

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
    minHeight: 75,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  infoLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 10,
  },

  infoIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  planInfoIcon: {
    backgroundColor: "#EAF8F0",
  },

  statusInfoIcon: {
    backgroundColor: "#FFF5DE",
  },

  infoTitle: {
    marginLeft: 12,
    color: "#7D858C",
    fontSize: 11.5,
    fontWeight: "600",
  },

  infoValue: {
    marginLeft: 12,
    marginTop: 3,
    color: "#242A30",
    fontSize: 14,
    fontWeight: "800",
  },

  infoDivider: {
    height: 1,
    backgroundColor: "#EDF0EE",
  },

  statusBadge: {
    minWidth: 60,
    height: 30,
    paddingHorizontal: 11,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },

  activeStatusBadge: {
    backgroundColor: "#EAF8F0",
  },

  freeStatusBadge: {
    backgroundColor: "#FFF5DE",
  },

  statusBadgeText: {
    fontSize: 11.5,
    fontWeight: "800",
  },

  activeStatusText: {
    color: "#09A84E",
  },

  freeStatusText: {
    color: "#D48A00",
  },

  bottomCTA: {
    position: "absolute",
    left: 20,
    right: 20,
    paddingTop: 10,
  },

  button: {
    height: 58,
    backgroundColor: "#09AA4D",
    borderRadius: 17,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",

    shadowColor: "#078A3E",
    shadowOpacity: 0.22,
    shadowRadius: 9,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 5,
  },

  buttonText: {
    marginLeft: 9,
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
});