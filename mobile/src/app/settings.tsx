import React, {
  useEffect,
  useState,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import {
  doc,
  onSnapshot,
} from "firebase/firestore";

import {
  auth,
  db,
} from "../services/firebase";
import BottomNav from "../components/BottomNav";
import { User } from "../types/user";

type MenuItem = {
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
  iconColor: string;
  iconBackground: string;
};

const menuItems: MenuItem[] = [
  {
    title: "Account Settings",
    subtitle: "Update your personal details",
    icon: "person-outline",
    route: "/profile",
    iconColor: "#09A84E",
    iconBackground: "#EAF8F0",
  },
  {
    title: "Subscription & Billing",
    subtitle: "Manage your plan and payments",
    icon: "card-outline",
    route: "/plans",
    iconColor: "#EFA300",
    iconBackground: "#FFF5DE",
  },
  {
    title: "Help & Support",
    subtitle: "Get assistance with the app",
    icon: "help-circle-outline",
    route: "/support",
    iconColor: "#7056B8",
    iconBackground: "#F1EDFF",
  },
  {
    title: "Privacy Policy",
    subtitle: "Learn how your data is handled",
    icon: "lock-closed-outline",
    route: "/privacy",
    iconColor: "#ED5447",
    iconBackground: "#FFF0EE",
  },
  {
    title: "Terms & Conditions",
    subtitle: "Read the terms for using the app",
    icon: "document-text-outline",
    route: "/terms",
    iconColor: "#4B7BEC",
    iconBackground: "#EEF3FF",
  },
];

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();

  const [userData, setUserData] =
    useState<User | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [loggingOut, setLoggingOut] =
    useState(false);

  useEffect(() => {
    let unsubscribeUser:
      | (() => void)
      | null = null;

    const unsubscribeAuth =
      onAuthStateChanged(
        auth,
        (firebaseUser) => {
          if (!firebaseUser) {
            setLoading(false);
            return;
          }

          unsubscribeUser = onSnapshot(
            doc(
              db,
              "users",
              firebaseUser.uid
            ),
            (snapshot) => {
              if (snapshot.exists()) {
                setUserData(
                  snapshot.data() as User
                );
              }

              setLoading(false);
            },
            (error) => {
              console.error(
                "Failed to load settings profile:",
                error
              );

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

  const user = auth.currentUser;

  const name =
    userData?.name ||
    user?.displayName ||
    "User";

  const email =
    userData?.email ||
    user?.email ||
    "No email available";

  const planName =
  userData?.packName ??
  userData?.planName ??
  "Free Plan";

  const photo =
    userData?.photoURL ||
    user?.photoURL ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(
      name
    )}&background=09A84E&color=fff&bold=true`;

  const handleLogout = () => {
    if (loggingOut) {
      return;
    }

    Alert.alert(
      "Log Out",
      "Are you sure you want to log out of your account?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Log Out",
          style: "destructive",
          onPress: async () => {
            try {
              setLoggingOut(true);

              await signOut(auth);

              router.replace("/login");
            } catch (error) {
              console.error(
                "Logout error:",
                error
              );

              Alert.alert(
                "Logout Failed",
                "Unable to log out. Please try again."
              );
            } finally {
              setLoggingOut(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loaderPage}>
        <ActivityIndicator
          size="large"
          color="#09A84E"
        />

        <Text style={styles.loadingText}>
          Loading settings...
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
                Settings
              </Text>

              <Text style={styles.headerSubtitle}>
                Manage your account and preferences
              </Text>
            </View>

            <View style={styles.headerSpacer} />
          </View>

          {/* Profile Card */}
          <TouchableOpacity
            activeOpacity={0.84}
            style={styles.profileCard}
            onPress={() =>
              router.push("/profile" as any)
            }
          >
            <View style={styles.avatarWrapper}>
              <Image
                source={{ uri: photo }}
                style={styles.avatar}
              />

              <View style={styles.onlineDot} />
            </View>

            <View style={styles.profileInfo}>
              <Text
                numberOfLines={1}
                style={styles.name}
              >
                {name}
              </Text>

              <Text
                numberOfLines={1}
                style={styles.email}
              >
                {email}
              </Text>

              <View style={styles.planBadge}>
                <Ionicons
                  name="star"
                  size={12}
                  color="#D99300"
                />

                <Text style={styles.planBadgeText}>
                  {planName}
                </Text>
              </View>
            </View>

            <View style={styles.editProfileButton}>
              <Ionicons
                name="create-outline"
                size={20}
                color="#09A84E"
              />
            </View>
          </TouchableOpacity>

          {/* Settings Section */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Account & App
            </Text>

            <Text style={styles.sectionSubtitle}>
              Manage your account and legal information
            </Text>
          </View>

          <View style={styles.menuContainer}>
            {menuItems.map(
              (item, index) => (
                <TouchableOpacity
                  key={item.title}
                  activeOpacity={0.8}
                  style={[
                    styles.menuItem,
                    index ===
                      menuItems.length - 1 &&
                      styles.lastMenuItem,
                  ]}
                  onPress={() =>
                    router.push(
                      item.route as any
                    )
                  }
                >
                  <View
                    style={[
                      styles.menuIcon,
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

                  <View
                    style={
                      styles.menuInformation
                    }
                  >
                    <Text
                      style={styles.menuText}
                    >
                      {item.title}
                    </Text>

                    <Text
                      numberOfLines={1}
                      style={
                        styles.menuSubtitle
                      }
                    >
                      {item.subtitle}
                    </Text>
                  </View>

                  <Ionicons
                    name="chevron-forward"
                    size={19}
                    color="#B2B8BD"
                  />
                </TouchableOpacity>
              )
            )}
          </View>

          {/* Logout */}
          <TouchableOpacity
            activeOpacity={0.82}
            disabled={loggingOut}
            style={[
              styles.logoutButton,
              loggingOut &&
                styles.disabledButton,
            ]}
            onPress={handleLogout}
          >
            <View style={styles.logoutIcon}>
              {loggingOut ? (
                <ActivityIndicator
                  size="small"
                  color="#E34E4E"
                />
              ) : (
                <Ionicons
                  name="log-out-outline"
                  size={21}
                  color="#E34E4E"
                />
              )}
            </View>

            <View style={styles.logoutInformation}>
              <Text style={styles.logoutText}>
                {loggingOut
                  ? "Logging Out..."
                  : "Log Out"}
              </Text>

              <Text
                style={
                  styles.logoutDescription
                }
              >
                Sign out from your ScanMyCard account
              </Text>
            </View>

            {!loggingOut && (
              <Ionicons
                name="chevron-forward"
                size={19}
                color="#E7A2A2"
              />
            )}
          </TouchableOpacity>

          {/* Version */}
          <View style={styles.versionContainer}>
            <View style={styles.appIcon}>
              <Ionicons
                name="scan-outline"
                size={20}
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

  headerSpacer: {
    width: 44,
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

  profileCard: {
    minHeight: 116,
    marginTop: 10,
    paddingHorizontal: 17,
    paddingVertical: 17,
    borderRadius: 21,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E7ECE9",

    shadowColor: "#17261D",
    shadowOpacity: 0.065,
    shadowRadius: 11,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 3,
  },

  avatarWrapper: {
    position: "relative",
  },

  avatar: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: "#EAF8F0",
  },

  onlineDot: {
    position: "absolute",
    right: 1,
    bottom: 2,
    width: 15,
    height: 15,
    borderRadius: 8,
    backgroundColor: "#09A84E",
    borderWidth: 3,
    borderColor: "#FFFFFF",
  },

  profileInfo: {
    flex: 1,
    marginLeft: 14,
    paddingRight: 10,
  },

  name: {
    color: "#20262C",
    fontSize: 17,
    fontWeight: "800",
  },

  email: {
    marginTop: 4,
    color: "#858D95",
    fontSize: 12.5,
    fontWeight: "500",
  },

  planBadge: {
    alignSelf: "flex-start",
    minHeight: 25,
    marginTop: 9,
    paddingHorizontal: 9,
    borderRadius: 9,
    backgroundColor: "#FFF5DE",
    flexDirection: "row",
    alignItems: "center",
  },

  planBadgeText: {
    marginLeft: 5,
    color: "#D48A00",
    fontSize: 11,
    fontWeight: "800",
  },

  editProfileButton: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: "#EAF8F0",
    alignItems: "center",
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

  menuContainer: {
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

  menuItem: {
    minHeight: 79,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#EDF0EE",
  },

  lastMenuItem: {
    borderBottomWidth: 0,
  },

  menuIcon: {
    width: 43,
    height: 43,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  menuInformation: {
    flex: 1,
    marginLeft: 13,
    paddingRight: 10,
  },

  menuText: {
    color: "#242A30",
    fontSize: 14,
    fontWeight: "800",
  },

  menuSubtitle: {
    marginTop: 4,
    color: "#90979D",
    fontSize: 11.5,
    fontWeight: "500",
  },

  logoutButton: {
    minHeight: 76,
    marginTop: 17,
    paddingHorizontal: 15,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#F4CDCD",
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
  },

  disabledButton: {
    opacity: 0.7,
  },

  logoutIcon: {
    width: 43,
    height: 43,
    borderRadius: 14,
    backgroundColor: "#FFF0F0",
    alignItems: "center",
    justifyContent: "center",
  },

  logoutInformation: {
    flex: 1,
    marginLeft: 12,
    paddingRight: 10,
  },

  logoutText: {
    color: "#D94444",
    fontSize: 14,
    fontWeight: "800",
  },

  logoutDescription: {
    marginTop: 4,
    color: "#969DA3",
    fontSize: 11.5,
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