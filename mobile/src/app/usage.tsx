import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import BottomNav from "@/components/BottomNav";
import { router } from "expo-router";

import { useEffect, useState } from "react";
import { auth, db } from "../services/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { User } from "../types/user";
export default function UsageScreen() {
const [userData, setUserData] = useState<User | null>(null);

useEffect(() => {
  if (!auth.currentUser) return;

  const unsubscribe = onSnapshot(
    doc(db, "users", auth.currentUser.uid),
    (snapshot) => {
      if (snapshot.exists()) {
        setUserData(snapshot.data() as User);
      }
    }
  );

  return unsubscribe;
}, []);


  // Replace these with Firestore values later
 const planName = userData?.planName ?? "Free Plan";

const totalScans = userData?.freeScanLimit ?? 5;

const usedScans = userData?.freeScansUsed ?? 0;

const remainingScans = Math.max(
  totalScans - usedScans,
  0
);

const exportsGenerated =
  userData?.exportsGenerated ?? 0;

const aiExtractions = usedScans;

const renewDate =
  userData?.subscriptionActive &&
  userData.subscriptionExpiry
    ? new Date(
        userData.subscriptionExpiry
      ).toLocaleDateString()
    : "Lifetime Free";


const progress = Math.min(
  totalScans > 0
    ? (usedScans / totalScans) * 100
    : 0,
  100
);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 190 }}
      >
        {/* Header */}

        <View style={styles.header}>
          <View>
            <Text style={styles.heading}>Usage</Text>
            <Text style={styles.subHeading}>
              Monitor your Scan2Sheet usage
            </Text>
          </View>

          <TouchableOpacity
            style={styles.historyBtn}
          >
            <Ionicons
              name="time-outline"
              size={22}
              color="#5B4BFF"
            />
          </TouchableOpacity>
        </View>

        {/* Plan Card */}

        <View style={styles.planCard}>

          <View style={styles.planTop}>

            <View>

              <Text style={styles.planLabel}>
                Current Plan
              </Text>

              <Text style={styles.planName}>
                ⭐ {planName}
              </Text>

            </View>

            <TouchableOpacity
              style={styles.smallUpgrade}
              onPress={() => router.push("/plans")}
            >
              <Text style={styles.smallUpgradeText}>
                Upgrade
              </Text>
            </TouchableOpacity>

          </View>

          {/* Progress */}

          <View style={styles.progressHeader}>
            <Text style={styles.progressTitle}>
              Scan Usage
            </Text>

            <Text style={styles.progressValue}>
              {usedScans}/{totalScans}
            </Text>
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

          <Text style={styles.remaining}>
            {remainingScans} scans remaining
          </Text>

        </View>

        {/* Stats */}

        <View style={styles.grid}>

          <View style={styles.statCard}>
            <Ionicons
              name="scan-outline"
              size={28}
              color="#5B4BFF"
            />

            <Text style={styles.statNumber}>
              {usedScans}
            </Text>

            <Text style={styles.statLabel}>
              Cards Scanned
            </Text>
          </View>

          <View style={styles.statCard}>
            <Ionicons
              name="sparkles-outline"
              size={28}
              color="#22C55E"
            />

            <Text style={styles.statNumber}>
              {aiExtractions}
            </Text>

            <Text style={styles.statLabel}>
              AI Extractions
            </Text>
          </View>

          <View style={styles.statCard}>
            <Ionicons
              name="download-outline"
              size={28}
              color="#F59E0B"
            />

            <Text style={styles.statNumber}>
              {exportsGenerated}
            </Text>

            <Text style={styles.statLabel}>
              Excel Exports
            </Text>
          </View>

          <View style={styles.statCard}>
            <Ionicons
              name="calendar-outline"
              size={28}
              color="#EF4444"
            />

            <Text style={styles.statNumber}>
              {renewDate}
            </Text>

            <Text style={styles.statLabel}>
              Renewal
            </Text>
          </View>

        </View>

        {/* Tip */}

        <View style={styles.tipCard}>
          <Ionicons
            name="bulb-outline"
            size={22}
            color="#5B4BFF"
          />

          <View
            style={{
              marginLeft: 12,
              flex: 1,
            }}
          >
            <Text style={styles.tipTitle}>
              Did you know?
            </Text>

            <Text style={styles.tipText}>
              A scan is only deducted when AI successfully
              extracts a business card.
            </Text>
          </View>

        </View>

      </ScrollView>

      {/* Fixed Button */}

      <View style={styles.bottomCTA}>
        <TouchableOpacity
          style={styles.button}
          onPress={() => router.push("/plans")}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F6F7FB",
  },

  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  heading: {
    fontSize: 30,
    fontWeight: "900",
    color: "#111827",
  },

  subHeading: {
    marginTop: 5,
    fontSize: 15,
    color: "#6B7280",
  },

  historyBtn: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",

    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 4,
    },

    elevation: 4,
  },

  planCard: {
    marginHorizontal: 20,
    marginTop: 24,

    backgroundColor: "#5B4BFF",

    borderRadius: 24,

    padding: 22,
  },

  planTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  planLabel: {
    color: "#E7E5FF",
    fontSize: 13,
  },

  planName: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "800",
    marginTop: 4,
  },

  smallUpgrade: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 14,
  },

  smallUpgradeText: {
    color: "#5B4BFF",
    fontWeight: "800",
  },

  progressHeader: {
    marginTop: 30,

    flexDirection: "row",

    justifyContent: "space-between",

    alignItems: "center",
  },

  progressTitle: {
    color: "#FFFFFF",
    fontWeight: "700",
  },

  progressValue: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 15,
  },

  progressBackground: {
    marginTop: 14,

    height: 12,

    backgroundColor: "rgba(255,255,255,0.25)",

    borderRadius: 999,
    overflow: "hidden",
  },

  progressFill: {
    height: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
  },

  remaining: {
    color: "#F3F4F6",
    marginTop: 10,
    fontWeight: "600",
  },

  grid: {
    marginTop: 24,

    paddingHorizontal: 20,

    flexDirection: "row",
    flexWrap: "wrap",

    justifyContent: "space-between",
  },

  statCard: {
    width: "48%",

    backgroundColor: "#FFFFFF",

    borderRadius: 20,

    paddingVertical: 24,

    alignItems: "center",

    marginBottom: 16,

    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 4,
    },

    elevation: 3,
  },

  statNumber: {
    marginTop: 12,

    fontSize: 24,

    fontWeight: "900",

    color: "#111827",

    textAlign: "center",
  },

  statLabel: {
    marginTop: 6,

    color: "#6B7280",

    fontWeight: "600",

    textAlign: "center",

    paddingHorizontal: 8,
  },

  tipCard: {
    marginHorizontal: 20,

    marginTop: 10,

    backgroundColor: "#FFFFFF",

    borderRadius: 20,

    padding: 18,

    flexDirection: "row",

    alignItems: "flex-start",

    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 4,
    },

    elevation: 3,
  },

  tipTitle: {
    fontSize: 16,

    fontWeight: "800",

    color: "#111827",
  },

  tipText: {
    marginTop: 4,

    color: "#6B7280",

    lineHeight: 21,
  },

  bottomCTA: {
    position: "absolute",

    left: 20,

    right: 20,

    bottom: 90,
  },

  button: {
    height: 60,

    backgroundColor: "#5B4BFF",

    borderRadius: 18,

    flexDirection: "row",

    justifyContent: "center",

    alignItems: "center",

    shadowColor: "#5B4BFF",
    shadowOpacity: 0.25,
    shadowRadius: 14,
    shadowOffset: {
      width: 0,
      height: 6,
    },

    elevation: 10,
  },

  buttonText: {
    color: "#FFFFFF",

    marginLeft: 10,

    fontWeight: "800",

    fontSize: 17,
  },
});