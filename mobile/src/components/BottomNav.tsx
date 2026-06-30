import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

type ActiveTab = "home" | "contacts" | "scan" | "plans" | "profile";

export default function BottomNav({ active }: { active: ActiveTab }) {
  const navItems = [
    { key: "home", label: "Home", icon: "home", route: "/home" },
    { key: "contacts", label: "My Cards", icon: "card-outline", route: "/contacts" },
    { key: "scan", label: "Scan", icon: "camera", route: "/scanner" },
    { key: "plans", label: "Plans", icon: "pricetag-outline", route: "/plans" },
    { key: "profile", label: "Profile", icon: "person-outline", route: "/profile" },
  ];

  return (
    <View style={styles.navWrapper}>
      <View style={styles.nav}>
        {navItems.map((item) => {
          const isActive = active === item.key;
          const isScan = item.key === "scan";

          return (
            <TouchableOpacity
              key={item.key}
              style={styles.navItem}
              activeOpacity={0.8}
              onPress={() => router.push(item.route as any)}
            >
              <View style={isScan ? styles.scanCircle : styles.iconBox}>
                <Ionicons
                  name={item.icon as any}
                  size={isScan ? 26 : 21}
                  color={isScan ? "#FFFFFF" : isActive ? "#5B4BFF" : "#8B94A7"}
                />
              </View>

              <Text
                style={[
                  styles.navText,
                  isActive && styles.navTextActive,
                  isScan && styles.scanText,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  navWrapper: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 14,
    paddingBottom: 10,
    backgroundColor: "transparent",
  },
  nav: {
    height: 72,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  navItem: {
    width: "20%",
    alignItems: "center",
    justifyContent: "center",
  },
  iconBox: {
    height: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  scanCircle: {
    width: 58,
    height: 58,
    borderRadius: 999,
    backgroundColor: "#5B4BFF",
    alignItems: "center",
    justifyContent: "center",
    marginTop: -34,
    borderWidth: 5,
    borderColor: "#FFFFFF",
  },
  navText: {
    marginTop: 3,
    fontSize: 10,
    color: "#8B94A7",
    fontWeight: "700",
  },
  navTextActive: {
    color: "#5B4BFF",
  },
  scanText: {
    color: "#5B4BFF",
    marginTop: 1,
  },
});