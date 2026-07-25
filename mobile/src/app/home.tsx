import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  useWindowDimensions,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot, setDoc } from "firebase/firestore";

import BottomNav from "../components/BottomNav";
import { auth, db } from "../services/firebase";
import { User } from "../types/user";

type ActionCardProps = {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBackground: string;
  onPress: () => void;
};

function ActionCard({
  title,
  icon,
  iconColor,
  iconBackground,
  onPress,
}: ActionCardProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.82}
      style={styles.actionCard}
      onPress={onPress}
    >
      <View
        style={[
          styles.actionIconContainer,
          { backgroundColor: iconBackground },
        ]}
      >
        <Ionicons name={icon} size={27} color={iconColor} />
      </View>

      <Text style={styles.actionTitle} numberOfLines={2}>
        {title}
      </Text>
    </TouchableOpacity>
  );
}

export default function HomeScreen() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const horizontalPadding = width < 380 ? 18 : 20;
  const actionGap = 13;

  const actionCardWidth =
    (width - horizontalPadding * 2 - actionGap) / 2;

  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<User | null>(null);

  useEffect(() => {
    let unsubscribeUser: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(
      auth,
      async (firebaseUser) => {
        if (!firebaseUser) {
          setLoading(false);
          router.replace("/login");
          return;
        }

        const userRef = doc(db, "users", firebaseUser.uid);

        unsubscribeUser = onSnapshot(
          userRef,
          async (snapshot) => {
            if (!snapshot.exists()) {
              try {
                await setDoc(userRef, {
                  uid: firebaseUser.uid,
                  name: firebaseUser.displayName || "User",
                  email: firebaseUser.email || "",
                  photoURL: firebaseUser.photoURL || "",

                  planName: "Free Plan",

                  freeScanLimit: 5,
                  freeScansUsed: 0,
                  exportsGenerated: 0,

                  subscriptionActive: false,
                  subscriptionExpiry: null,

                  authProvider: "email",

                  createdAt: Date.now(),
                  updatedAt: Date.now(),
                });
              } catch (error) {
                console.error("Failed to create user document:", error);
                setLoading(false);
              }

              return;
            }

            setUserData(snapshot.data() as User);
            setLoading(false);
          },
          (error) => {
            console.error("Failed to read user document:", error);
            setLoading(false);
          }
        );
      }
    );

    return () => {
      unsubscribeUser?.();
      unsubscribeAuth();
    };
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.loaderPage}>
        <ActivityIndicator size="large" color="#0BAA50" />
      </SafeAreaView>
    );
  }

  const fullName = userData?.name?.trim() || "User";
  const firstName = fullName.split(" ")[0];

  const planName = userData?.planName || "Free Plan";
  const totalScans = userData?.freeScanLimit ?? 0;
  const usedScans = userData?.freeScansUsed ?? 0;
  const exportsGenerated = userData?.exportsGenerated ?? 0;

  const remainingScans = Math.max(totalScans - usedScans, 0);

  const usedPercent =
    totalScans > 0
      ? Math.min(Math.round((usedScans / totalScans) * 100), 100)
      : 0;

  const handleScanPress = () => {
    if (userData?.subscriptionActive) {
      router.push("/scanner");
      return;
    }

    if (usedScans < totalScans) {
      router.push("/scanner");
      return;
    }

    router.push("/plans");
  };

  return (
    <View style={styles.page}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + 8,
            paddingBottom: 118 + insets.bottom,
          },
        ]}
      >
        {/* Header */}
        <View
          style={[
            styles.header,
            { paddingHorizontal: horizontalPadding },
          ]}
        >
          <View style={styles.userDetails}>
            <View style={styles.avatar}>
              {userData?.photoURL ? (
                <Image
                  source={{ uri: userData.photoURL }}
                  style={styles.avatarPhoto}
                />
              ) : (
                <Image
                  source={require("../../assets/images/logo.png")}
                  style={styles.avatarLogo}
                  resizeMode="contain"
                />
              )}
            </View>

            <View style={styles.greetingContainer}>
              <Text style={styles.greetingText} numberOfLines={1}>
                Hello, {firstName}! 👋
              </Text>

              <Text style={styles.greetingSubtitle}>
                Let&apos;s scan some cards
              </Text>
            </View>
          </View>

          <TouchableOpacity
            activeOpacity={0.75}
            style={styles.notificationButton}
            onPress={() => {}}
          >
            <Ionicons
              name="notifications-outline"
              size={26}
              color="#242A30"
            />

            <View style={styles.notificationDot} />
          </TouchableOpacity>
        </View>

        {/* Plan Card */}
        <View
          style={[
            styles.planCard,
            { marginHorizontal: horizontalPadding },
          ]}
        >
          <View style={styles.planHeader}>
            <View style={styles.planInformation}>
              <View style={styles.planLabelRow}>
                <Ionicons name="star" size={16} color="#F2B705" />

                <Text style={styles.planLabel}>Your Plan</Text>
              </View>

              <Text style={styles.planName} numberOfLines={1}>
                {planName}
              </Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.82}
              style={styles.upgradeButton}
              onPress={() => router.push("/plans")}
            >
              <Text style={styles.upgradeButtonText}>Upgrade</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{totalScans}</Text>
              <Text style={styles.statLabel}>Total Cards</Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statItem}>
              <Text style={styles.statValue}>{usedScans}</Text>
              <Text style={styles.statLabel}>Used</Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statItem}>
              <Text style={styles.statValue}>{remainingScans}</Text>
              <Text style={styles.statLabel}>Remaining</Text>
            </View>
          </View>

          <View style={styles.progressSection}>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${usedPercent}%` },
                ]}
              />
            </View>

            <Text style={styles.progressPercentage}>
              {usedPercent}% Used
            </Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View
          style={[
            styles.actionsGrid,
            {
              paddingHorizontal: horizontalPadding,
              gap: actionGap,
            },
          ]}
        >
          <View style={{ width: actionCardWidth }}>
            <ActionCard
              title="Scan Card"
              icon="scan-outline"
              iconColor="#09A84E"
              iconBackground="#EAF8F0"
              onPress={handleScanPress}
            />
          </View>

          <View style={{ width: actionCardWidth }}>
            <ActionCard
              title="My Cards"
              icon="albums-outline"
              iconColor="#ED5447"
              iconBackground="#FFF0EE"
              onPress={() => router.push("/saved-contacts")}
            />
          </View>

          <View style={{ width: actionCardWidth }}>
            <ActionCard
              title="Export"
              icon="download-outline"
              iconColor="#EFA300"
              iconBackground="#FFF5DC"
              onPress={() => router.push("/export")}
            />
          </View>

          <View style={{ width: actionCardWidth }}>
            <ActionCard
              title="History"
              icon="time-outline"
              iconColor="#7056B8"
              iconBackground="#F1EDFF"
              onPress={() => router.push("/usage")}
            />
          </View>
        </View>

        {/* Recent Activity */}
        <View
          style={[
            styles.activitySection,
            { paddingHorizontal: horizontalPadding },
          ]}
        >
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Recent Activity</Text>
              <Text style={styles.sectionSubtitle}>Today</Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => router.push("/usage")}
            >
              <View style={styles.seeAllRow}>
                <Text style={styles.seeAllText}>See all</Text>

                <Ionicons
                  name="chevron-forward"
                  size={17}
                  color="#09A84E"
                />
              </View>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            activeOpacity={0.82}
            style={styles.activityCard}
            onPress={() => router.push("/usage")}
          >
            <View style={styles.activityLeft}>
              <View style={styles.activityIcon}>
                <Ionicons
                  name="card-outline"
                  size={21}
                  color="#09A84E"
                />
              </View>

              <View style={styles.activityInformation}>
                <Text style={styles.activityTitle}>Cards Extracted</Text>

                <Text style={styles.activitySubtitle}>
                  Business cards scanned
                </Text>
              </View>
            </View>

            <View style={styles.activityRight}>
              <Text style={styles.activityValue}>{usedScans}</Text>

              <Ionicons
                name="chevron-forward"
                size={20}
                color="#ABB2B9"
              />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.82}
            style={styles.activityCard}
            onPress={() => router.push("/export")}
          >
            <View style={styles.activityLeft}>
              <View
                style={[
                  styles.activityIcon,
                  styles.exportActivityIcon,
                ]}
              >
                <Ionicons
                  name="download-outline"
                  size={21}
                  color="#EFA300"
                />
              </View>

              <View style={styles.activityInformation}>
                <Text style={styles.activityTitle}>Excel Exports</Text>

                <Text style={styles.activitySubtitle}>
                  Files generated
                </Text>
              </View>
            </View>

            <View style={styles.activityRight}>
              <Text style={styles.activityValue}>
                {exportsGenerated}
              </Text>

              <Ionicons
                name="chevron-forward"
                size={20}
                color="#ABB2B9"
              />
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <BottomNav active="home" />
    </View>
  );
}

const styles = StyleSheet.create({
  loaderPage: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },

  page: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  scrollContent: {
    flexGrow: 1,
  },

  header: {
    minHeight: 80,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  userDetails: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 12,
  },

  avatar: {
    width: 55,
    height: 55,
    borderRadius: 28,
    backgroundColor: "#F1F7F3",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#DFEBE3",
  },

  avatarPhoto: {
    width: "100%",
    height: "100%",
  },

  avatarLogo: {
    width: 41,
    height: 41,
  },

  greetingContainer: {
    flex: 1,
    marginLeft: 14,
  },

  greetingText: {
    color: "#171C21",
    fontSize: 19,
    fontWeight: "800",
  },

  greetingSubtitle: {
    marginTop: 4,
    color: "#858D95",
    fontSize: 13,
    fontWeight: "500",
  },

  notificationButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F7F9F8",
  },

  notificationDot: {
    position: "absolute",
    top: 9,
    right: 9,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#EF4444",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },

  planCard: {
    marginTop: 13,
    minHeight: 205,
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    paddingHorizontal: 21,
    paddingTop: 20,
    paddingBottom: 19,
    borderWidth: 1,
    borderColor: "#E9EEEB",

    shadowColor: "#17261D",
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: {
      width: 0,
      height: 6,
    },
    elevation: 5,
  },

  planHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
    color: "#6F777F",
    fontSize: 13,
    fontWeight: "700",
  },

  planName: {
    marginTop: 7,
    color: "#171C21",
    fontSize: 21,
    fontWeight: "800",
  },

  upgradeButton: {
    minWidth: 88,
    height: 42,
    paddingHorizontal: 17,
    borderRadius: 14,
    backgroundColor: "#09AA4D",
    alignItems: "center",
    justifyContent: "center",

    shadowColor: "#07903E",
    shadowOpacity: 0.18,
    shadowRadius: 7,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    elevation: 3,
  },

  upgradeButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },

  statsRow: {
    marginTop: 24,
    flexDirection: "row",
    alignItems: "center",
  },

  statItem: {
    flex: 1,
    alignItems: "center",
  },

  statValue: {
    color: "#192027",
    fontSize: 24,
    fontWeight: "800",
  },

  statLabel: {
    marginTop: 6,
    color: "#7F8790",
    fontSize: 12,
    fontWeight: "600",
  },

  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: "#E5EAE7",
  },

  progressSection: {
    marginTop: 24,
    flexDirection: "row",
    alignItems: "center",
  },

  progressTrack: {
    flex: 1,
    height: 8,
    borderRadius: 10,
    backgroundColor: "#ECEFEE",
    overflow: "hidden",
  },

  progressFill: {
    height: "100%",
    minWidth: 3,
    borderRadius: 10,
    backgroundColor: "#09AA4D",
  },

  progressPercentage: {
    minWidth: 65,
    marginLeft: 11,
    color: "#656D75",
    fontSize: 12,
    fontWeight: "700",
    textAlign: "right",
  },

  actionsGrid: {
    marginTop: 23,
    flexDirection: "row",
    flexWrap: "wrap",
  },

  actionCard: {
    width: "100%",
    minHeight: 93,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E9EDEA",

    shadowColor: "#17261D",
    shadowOpacity: 0.06,
    shadowRadius: 9,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 3,
  },

  actionIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },

  actionTitle: {
    flex: 1,
    marginLeft: 12,
    color: "#242A30",
    fontSize: 15,
    lineHeight: 19,
    fontWeight: "800",
  },

  activitySection: {
    marginTop: 27,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
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
    fontWeight: "600",
  },

  seeAllRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  seeAllText: {
    marginRight: 2,
    color: "#09A84E",
    fontSize: 13,
    fontWeight: "700",
  },

  activityCard: {
    minHeight: 80,
    marginTop: 12,
    paddingHorizontal: 15,
    paddingVertical: 13,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#E9EDEA",

    shadowColor: "#17261D",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    elevation: 2,
  },

  activityLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },

  activityIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#EAF8EF",
    alignItems: "center",
    justifyContent: "center",
  },

  exportActivityIcon: {
    backgroundColor: "#FFF5DE",
  },

  activityInformation: {
    flex: 1,
    marginLeft: 13,
  },

  activityTitle: {
    color: "#232A30",
    fontSize: 15,
    fontWeight: "800",
  },

  activitySubtitle: {
    marginTop: 3,
    color: "#90979E",
    fontSize: 12,
    fontWeight: "500",
  },

  activityRight: {
    marginLeft: 8,
    flexDirection: "row",
    alignItems: "center",
  },

  activityValue: {
    marginRight: 6,
    color: "#09A84E",
    fontSize: 16,
    fontWeight: "800",
  },
});