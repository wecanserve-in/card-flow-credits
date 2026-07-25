import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type ActiveTab =
  | "home"
  | "contacts"
  | "scan"
  | "history"
  | "settings";

type NavItem = {
  key: ActiveTab;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon: keyof typeof Ionicons.glyphMap;
  route: string;
};

const COLORS = {
  green: "#13AF55",
  greenDark: "#079243",
  inactive: "#7D8792",
  white: "#FFFFFF",
  border: "#ECEFF1",
};

const navItems: NavItem[] = [
  {
    key: "home",
    label: "Home",
    icon: "home-outline",
    activeIcon: "home",
    route: "/home",
  },
  {
    key: "contacts",
    label: "My Cards",
    icon: "card-outline",
    activeIcon: "card",
    route: "/saved-contacts",
  },
  {
    key: "scan",
    label: "",
    icon: "add",
    activeIcon: "add",
    route: "/scanner",
  },
  {
    key: "history",
    label: "History",
    icon: "time-outline",
    activeIcon: "time",
    route: "/usage",
  },
  {
    key: "settings",
    label: "Profile",
    icon: "person-outline",
    activeIcon: "person",
    route: "/settings",
  },
];

export default function BottomNav({
  active,
}: {
  active: ActiveTab;
}) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.navWrapper,
        {
          paddingBottom: Math.max(insets.bottom, 6),
        },
      ]}
    >
      <View style={styles.nav}>
        {navItems.map((item) => {
          const isActive = active === item.key;
          const isScan = item.key === "scan";

          if (isScan) {
            return (
              <View key={item.key} style={styles.scanSlot}>
                <TouchableOpacity
                  style={styles.scanCircle}
                  activeOpacity={0.85}
                  onPress={() => router.push(item.route as any)}
                >
                  <Ionicons
                    name="add"
                    size={34}
                    color={COLORS.white}
                  />
                </TouchableOpacity>
              </View>
            );
          }

          return (
            <TouchableOpacity
              key={item.key}
              style={styles.navItem}
              activeOpacity={0.75}
              onPress={() => router.push(item.route as any)}
            >
              <Ionicons
                name={isActive ? item.activeIcon : item.icon}
                size={21}
                color={
                  isActive
                    ? COLORS.greenDark
                    : COLORS.inactive
                }
              />

              <Text
                numberOfLines={1}
                style={[
                  styles.navText,
                  isActive && styles.navTextActive,
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
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,

    shadowColor: "#000000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: -3,
    },

    elevation: 14,
  },

  nav: {
    height: 60,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 3,
  },

  navItem: {
    width: "20%",
    height: 58,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 4,
  },

  navText: {
    marginTop: 3,
    fontSize: 9.5,
    lineHeight: 12,
    fontWeight: "600",
    color: COLORS.inactive,
  },

  navTextActive: {
    color: COLORS.greenDark,
    fontWeight: "800",
  },

  scanSlot: {
    width: "20%",
    height: 60,
    alignItems: "center",
    justifyContent: "flex-start",
  },

  scanCircle: {
    position: "absolute",
    top: -21,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.green,
    alignItems: "center",
    justifyContent: "center",

    borderWidth: 5,
    borderColor: COLORS.white,

    shadowColor: COLORS.green,
    shadowOpacity: Platform.OS === "ios" ? 0.24 : 0.32,
    shadowRadius: 9,
    shadowOffset: {
      width: 0,
      height: 5,
    },

    elevation: 10,
  },
});