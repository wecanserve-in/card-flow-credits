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
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot, setDoc } from "firebase/firestore";

import BottomNav from "../components/BottomNav";
import { auth, db } from "../services/firebase";
import { User } from "../types/user";

export default function HomeScreen() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const isSmallPhone = height < 720;
  const horizontal = width < 380 ? 18 : 22;
  const cardGap = 14;
  const actionCardWidth = (width - horizontal * 2 - cardGap) / 2;

  const [loading, setLoading] = useState(true);
const [userData, setUserData] = useState<User | null>(null);
  useEffect(() => {
    let unsubscribeUser: any = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setLoading(false);
        router.replace("/login");
        return;
      }

      const userRef = doc(db, "users", user.uid);

      unsubscribeUser = onSnapshot(userRef, async (snapshot) => {
        if (!snapshot.exists()) {
       await setDoc(userRef, {
  uid: user.uid,

  name: user.displayName || "User",
  email: user.email || "",
  photoURL: user.photoURL || "",

  planName: "Free",
  cardLimit: 100,

  cardsUsed: 0,
  exportsGenerated: 0,

  subscriptionActive: false,
  authProvider: "email",

  createdAt: new Date(),
});
          return;
        }

        setUserData(snapshot.data());
        setLoading(false);
      });
    });

    return () => {
      if (unsubscribeUser) unsubscribeUser();
      unsubscribeAuth();
    };
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.loaderPage}>
        <ActivityIndicator size="large" color="#5B4BFF" />
      </SafeAreaView>
    );
  }

 const name = userData?.name || "User";
  const planName = userData?.planName || "Free Plan";
  const totalCards = userData?.cardLimit || 0;
  const usedCards = userData?.cardsUsed || 0;
  const exportsGenerated = userData?.exportsGenerated || 0;
 const recentCardsToday = 0;
  const remainingCards = Math.max(totalCards - usedCards, 0);
  const usedPercent =
    totalCards > 0
      ? Math.min(Math.round((usedCards / totalCards) * 100), 100)
      : 0;

  return (
    <View style={styles.page}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingBottom: 120 + insets.bottom,
          },
        ]}
      >
        <View
          style={[
            styles.header,
            {
              paddingTop: insets.top + 14,
              paddingHorizontal: horizontal,
              paddingBottom: isSmallPhone ? 62 : 76,
            },
          ]}
        >
          <View style={styles.userRow}>
            <View style={styles.avatar}>
              <Image
                source={require("../../assets/images/logo.png")}
                style={styles.avatarImage}
                resizeMode="contain"
              />
            </View>

            <View style={styles.greetingBox}>
              <Text style={styles.greeting} numberOfLines={1}>
                Hello, {name} 👋
              </Text>
              <Text style={styles.subGreeting}>Let&apos;s scan some cards!</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.bellBtn}>
            <Ionicons name="notifications-outline" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <View
          style={[
            styles.planCard,
            {
              marginHorizontal: horizontal,
              marginTop: isSmallPhone ? -46 : -56,
            },
          ]}
        >
          <View style={styles.planTop}>
            <View style={styles.planInfo}>
              <Text style={styles.planLabel}> Your Plan</Text>
              <Text style={styles.planName} numberOfLines={1}>
                {planName}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.upgradeBtn}
              onPress={() => router.push("/plans")}
            >
              <Text style={styles.upgradeText}>Upgrade</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{totalCards}</Text>
              <Text style={styles.statLabel}>Total Cards</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{usedCards}</Text>
              <Text style={styles.statLabel}>Used</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{remainingCards}</Text>
              <Text style={styles.statLabel}>Remaining</Text>
            </View>
          </View>

          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${usedPercent}%` }]} />
          </View>

          <View style={styles.progressBottom}>
            <Ionicons name="people" size={16} color="#5B4BFF" />
            <Text style={styles.progressText}>{usedPercent}% Used</Text>
          </View>
        </View>

        <View
          style={[
            styles.actionGrid,
            {
              paddingHorizontal: horizontal,
              gap: cardGap,
            },
          ]}
        >
          <TouchableOpacity
            style={[styles.actionCard, styles.blueCard, { width: actionCardWidth }]}
            onPress={() => router.push("/scanner")}
          >
            <Ionicons name="camera-outline" size={30} color="#FFFFFF" />
            <Text style={styles.actionText}>Scan{"\n"}Cards</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCard, styles.greenCard, { width: actionCardWidth }]}
            onPress={() => router.push("/contacts")}
          >
            <Ionicons name="card-outline" size={30} color="#FFFFFF" />
            <Text style={styles.actionText}>My{"\n"}Cards</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCard, styles.orangeCard, { width: actionCardWidth }]}
            onPress={() => router.push("/export")}
          >
            <Ionicons name="download-outline" size={30} color="#FFFFFF" />
            <Text style={styles.actionText}>Export{"\n"}Excel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCard, styles.pinkCard, { width: actionCardWidth }]}
            onPress={() => router.push("/usage")}
          >
            <Ionicons name="time-outline" size={30} color="#FFFFFF" />
            <Text style={styles.actionText}>Usage{"\n"}History</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.sectionHeader, { paddingHorizontal: horizontal }]}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <Ionicons name="chevron-forward" size={20} color="#A0AEC0" />
        </View>

        <Text style={[styles.todayText, { paddingHorizontal: horizontal }]}>
          Today
        </Text>

        <View style={[styles.activityCard, { marginHorizontal: horizontal }]}>
          <View style={styles.activityLeft}>
            <View style={styles.activityIconGreen}>
              <Ionicons name="person-add-outline" size={18} color="#10B981" />
            </View>
            <Text style={styles.activityText}>Cards Extracted</Text>
          </View>

          <Text style={styles.activityNumber}>{recentCardsToday}</Text>
        </View>

        <View style={[styles.activityCard, { marginHorizontal: horizontal }]}>
          <View style={styles.activityLeft}>
            <View style={styles.activityIconPurple}>
              <Ionicons name="download-outline" size={18} color="#5B4BFF" />
            </View>
            <Text style={styles.activityText}>Exports Generated</Text>
          </View>

          <Text style={styles.activityNumber}>{exportsGenerated}</Text>
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
    backgroundColor: "#F3F6FF",
  },

  scrollContent: {
    flexGrow: 1,
  },

  header: {
    backgroundColor: "#5B4BFF",
    borderBottomLeftRadius: 34,
    borderBottomRightRadius: 34,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },

  userRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 12,
  },

  greetingBox: {
    flex: 1,
  },

  avatar: {
    width: 54,
    height: 54,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },

  avatarImage: {
    width: 38,
    height: 38,
  },

  greeting: {
    fontSize: 21,
    fontWeight: "900",
    color: "#FFFFFF",
  },

  subGreeting: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: "700",
    color: "#EDEBFF",
  },

  bellBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },

  planCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },

  planTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  planInfo: {
    flex: 1,
    paddingRight: 12,
  },

  planLabel: {
    fontSize: 13,
    color: "#7C8798",
    fontWeight: "900",
  },

  planName: {
    marginTop: 8,
    fontSize: 28,
    color: "#101828",
    fontWeight: "900",
  },

  upgradeBtn: {
    backgroundColor: "#5B4BFF",
    paddingHorizontal: 20,
    height: 52,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  upgradeText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
  },

  statsRow: {
    marginTop: 28,
    flexDirection: "row",
    alignItems: "center",
  },

  statBox: {
    flex: 1,
    alignItems: "center",
  },

  statNumber: {
    fontSize: 25,
    fontWeight: "900",
    color: "#101828",
  },

  statLabel: {
    marginTop: 8,
    fontSize: 12,
    color: "#8B94A7",
    fontWeight: "800",
  },

  divider: {
    width: 1,
    height: 44,
    backgroundColor: "#E8ECF5",
  },

  progressTrack: {
    height: 9,
    backgroundColor: "#E8ECF5",
    borderRadius: 999,
    marginTop: 28,
    overflow: "hidden",
  },

  progressFill: {
    height: "100%",
    backgroundColor: "#5B4BFF",
    borderRadius: 999,
  },

  progressBottom: {
    marginTop: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  progressText: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "900",
  },

  actionGrid: {
    marginTop: 34,
    flexDirection: "row",
    flexWrap: "wrap",
  },

  actionCard: {
    height: 126,
    borderRadius: 22,
    paddingHorizontal: 22,
    flexDirection: "row",
    alignItems: "center",
  },

  blueCard: {
    backgroundColor: "#5B4BFF",
  },

  greenCard: {
    backgroundColor: "#16C784",
  },

  orangeCard: {
    backgroundColor: "#FFB020",
  },

  pinkCard: {
    backgroundColor: "#F7578C",
  },

  actionText: {
    marginLeft: 16,
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "900",
    lineHeight: 24,
  },

  sectionHeader: {
    marginTop: 34,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  sectionTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#101828",
  },

  todayText: {
    marginTop: 16,
    fontSize: 14,
    color: "#9CA3AF",
    fontWeight: "900",
  },

  activityCard: {
    marginTop: 14,
    minHeight: 72,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#EEF1F6",
  },

  activityLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },

  activityIconGreen: {
    width: 42,
    height: 42,
    borderRadius: 999,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },

  activityIconPurple: {
    width: 42,
    height: 42,
    borderRadius: 999,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },

  activityText: {
    fontSize: 16,
    color: "#101828",
    fontWeight: "900",
  },

  activityNumber: {
    fontSize: 18,
    color: "#10B981",
    fontWeight: "900",
    marginLeft: 10,
  },
});