import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { signOut } from "firebase/auth";

import { auth } from "../services/firebase";
import BottomNav from "../components/BottomNav";

const menuItems = [
  {
    title: "Account Settings",
    icon: "person-outline",
    route: "/profile",
  },
  {
    title: "Subscription & Billing",
    icon: "card-outline",
    route: "/plans",
  },
  {
    title: "Help & Support",
    icon: "help-circle-outline",
    route: "/support",
  },
  {
    title: "Privacy Policy",
    icon: "lock-closed-outline",
    route: "/privacy",
  },
  {
    title: "Terms & Conditions",
    icon: "document-text-outline",
    route: "/terms",
  },
];

export default function SettingsScreen() {
  const user = auth.currentUser;

  const name = user?.displayName || "User";
  const email = user?.email || "No Email";

  const photo =
    user?.photoURL ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(
      name
    )}&background=5B4BFF&color=fff`;

  const handleLogout = () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            try {
              await signOut(auth);
              router.replace("/login");
            } catch (e) {
              console.log(e);
            }
          },
        },
      ]
    );
  };

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
            Settings
          </Text>

          <View style={{ width: 40 }} />
        </View>

        <TouchableOpacity
          style={styles.profileCard}
          activeOpacity={0.85}
          onPress={() => router.push("/profile" as any)}
        >
          <Image
            source={{ uri: photo }}
            style={styles.avatar}
          />

          <View style={styles.profileInfo}>
            <Text style={styles.name}>
              {name}
            </Text>

            <Text style={styles.email}>
              {email}
            </Text>
          </View>

          <Ionicons
            name="chevron-forward"
            size={20}
            color="#9CA3AF"
          />
        </TouchableOpacity>

        <View style={styles.menuContainer}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={item.title}
              style={[
                styles.menuItem,
                index === menuItems.length - 1 && {
                  borderBottomWidth: 0,
                },
              ]}
              onPress={() =>
                router.push(item.route as any)
              }
            >
              <View style={styles.left}>
                <Ionicons
                  name={item.icon as any}
                  size={22}
                  color="#5B4BFF"
                />

                <Text style={styles.menuText}>
                  {item.title}
                </Text>
              </View>

              <Ionicons
                name="chevron-forward"
                size={18}
                color="#B5B8C5"
              />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={handleLogout}
        >
          <Ionicons
            name="log-out-outline"
            size={22}
            color="#EF4444"
          />

          <Text style={styles.logoutText}>
            Logout
          </Text>
        </TouchableOpacity>

        <Text style={styles.version}>
          Version 1.0.0
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
    marginBottom: 22,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",

    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },

  heading: {
    fontSize: 24,
    fontWeight: "800",
    color: "#111827",
  },

  profileCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",

    borderWidth: 1,
    borderColor: "#E5E7EB",

    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },

  avatar: {
    width: 65,
    height: 65,
    borderRadius: 32.5,
    backgroundColor: "#EEF2FF",
  },

  profileInfo: {
    flex: 1,
    marginLeft: 15,
  },

  name: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },

  email: {
    marginTop: 5,
    color: "#6B7280",
    fontSize: 14,
  },

  menuContainer: {
    marginTop: 25,
    backgroundColor: "#FFFFFF",
    borderRadius: 22,

    borderWidth: 1,
    borderColor: "#E5E7EB",

    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },

  menuItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",

    paddingHorizontal: 18,
    paddingVertical: 19,

    borderBottomWidth: 1,
    borderBottomColor: "#EEF2F7",
  },

  left: {
    flexDirection: "row",
    alignItems: "center",
  },

  menuText: {
    marginLeft: 15,
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },

  logoutBtn: {
    marginTop: 28,

    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",

    backgroundColor: "#FFFFFF",

    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#FECACA",

    paddingVertical: 18,

    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },

  logoutText: {
    color: "#EF4444",
    fontSize: 16,
    fontWeight: "700",
    marginLeft: 10,
  },

  version: {
    marginTop: 22,
    marginBottom: 10,
    textAlign: "center",
    color: "#9CA3AF",
    fontSize: 13,
    fontWeight: "600",
  },
});