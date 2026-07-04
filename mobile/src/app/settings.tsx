import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
} from "react-native";

import { signOut } from "firebase/auth";
import { auth } from "../services/firebase";
import { router } from "expo-router";

import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

const menuItems = [
  {
    title: "Account Settings",
    icon: "person-outline",
  },
  {
    title: "Subscription & Billing",
    icon: "card-outline",
  },
  {
    title: "Refer & Earn",
    icon: "gift-outline",
  },
  {
    title: "Help & Support",
    icon: "help-circle-outline",
  },
  {
    title: "Privacy Policy",
    icon: "lock-closed-outline",
  },
  {
    title: "Terms & Conditions",
    icon: "document-text-outline",
  },
];

export default function SettingsScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.heading}>Settings</Text>

        {/* Profile Card */}

        <TouchableOpacity style={styles.profileCard}>
          <Image
            source={{
              uri: "https://i.pravatar.cc/150?img=12",
            }}
            style={styles.avatar}
          />

          <View style={styles.profileInfo}>
            <Text style={styles.name}>
              Anand Dangi
            </Text>

            <Text style={styles.email}>
              anand@gmail.com
            </Text>
          </View>

          <Ionicons
            name="chevron-forward"
            size={22}
            color="#9CA3AF"
          />
        </TouchableOpacity>

        {/* Menu Items */}

        <View style={styles.menuContainer}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.menuItem}
            >
              <View style={styles.left}>
                <Ionicons
                  name={item.icon as any}
                  size={22}
                  color="#374151"
                />

                <Text style={styles.menuText}>
                  {item.title}
                </Text>
              </View>

              <Ionicons
                name="chevron-forward"
                size={20}
                color="#D1D5DB"
              />
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout */}
<TouchableOpacity
  style={styles.logoutBtn}
  onPress={async () => {
    try {
      console.log("Logout clicked");

      await signOut(auth);

      router.replace("/login"); // change if your login page is elsewhere
    } catch (error) {
      console.log("Logout Error:", error);
    }
  }}
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

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 18,
  },

  heading: {
    fontSize: 30,
    fontWeight: "800",
    color: "#111827",
    marginTop: 10,
    marginBottom: 24,
  },

  profileCard: {
    backgroundColor: "#fff",
    borderRadius: 22,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",

    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },

  avatar: {
    width: 62,
    height: 62,
    borderRadius: 31,
  },

  profileInfo: {
    flex: 1,
    marginLeft: 14,
  },

  name: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },

  email: {
    color: "#6B7280",
    marginTop: 4,
  },

  menuContainer: {
    marginTop: 24,
    backgroundColor: "#fff",
    borderRadius: 22,

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
    paddingVertical: 20,

    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },

  left: {
    flexDirection: "row",
    alignItems: "center",
  },

  menuText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
    marginLeft: 14,
  },

  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 30,
    paddingHorizontal: 18,
    paddingVertical: 20,
    backgroundColor: "#fff",
    borderRadius: 22,
  },

  logoutText: {
    color: "#EF4444",
    fontWeight: "700",
    fontSize: 16,
    marginLeft: 12,
  },
});