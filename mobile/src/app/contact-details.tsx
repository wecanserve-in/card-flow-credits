import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

export default function ContactDetailsScreen() {
  const contact =
    (globalThis as any).selectedContact || {};

  const openPhone = () => {
    if (
      contact.phone &&
      contact.phone !== "Not available"
    ) {
      Linking.openURL(`tel:${contact.phone}`);
    }
  };

  const openEmail = () => {
    if (
      contact.email &&
      contact.email !== "Not available"
    ) {
      Linking.openURL(`mailto:${contact.email}`);
    }
  };

  const openWebsite = () => {
    if (
      contact.website &&
      contact.website !== "Not available"
    ) {
      let url = contact.website;

      if (!url.startsWith("http")) {
        url = `https://${url}`;
      }

      Linking.openURL(url);
    }
  };

  const DetailCard = ({
    icon,
    title,
    value,
  }: {
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    value?: string;
  }) => (
    <View style={styles.detailCard}>
      <View style={styles.iconContainer}>
        <Ionicons
          name={icon}
          size={22}
          color="#2563EB"
        />
      </View>

      <View style={{ flex: 1 }}>
        <Text style={styles.label}>
          {title}
        </Text>

        <Text style={styles.value}>
          {value &&
          value !== "Not available"
            ? value
            : "Not available"}
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}

        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
          >
            <Ionicons
              name="arrow-back"
              size={28}
              color="#111827"
            />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>
            Contact Details
          </Text>

          <View style={{ width: 28 }} />
        </View>

        {/* Profile */}

        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(contact.name?.charAt(0) || "?")
                .toUpperCase()}
            </Text>
          </View>

          <Text style={styles.name}>
            {contact.name ||
              "Unknown Contact"}
          </Text>

          <Text style={styles.designation}>
            {contact.designation ||
              "No Designation"}
          </Text>

          {contact.company &&
            contact.company !==
              "Not available" && (
              <Text style={styles.company}>
                {contact.company}
              </Text>
            )}
        </View>

        {/* Quick Actions */}

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={openPhone}
          >
            <Ionicons
              name="call"
              size={24}
              color="#2563EB"
            />

            <Text style={styles.actionText}>
              Call
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={openEmail}
          >
            <Ionicons
              name="mail"
              size={24}
              color="#2563EB"
            />

            <Text style={styles.actionText}>
              Email
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={openWebsite}
          >
            <Ionicons
              name="globe"
              size={24}
              color="#2563EB"
            />

            <Text style={styles.actionText}>
              Website
            </Text>
          </TouchableOpacity>
        </View>

        {/* Details */}

        <DetailCard
          icon="person-outline"
          title="Full Name"
          value={contact.name}
        />

        <DetailCard
          icon="briefcase-outline"
          title="Company"
          value={contact.company}
        />

        <DetailCard
          icon="ribbon-outline"
          title="Designation"
          value={contact.designation}
        />

        <DetailCard
          icon="call-outline"
          title="Phone Number"
          value={contact.phone}
        />

        <DetailCard
          icon="mail-outline"
          title="Email Address"
          value={contact.email}
        />

        <DetailCard
          icon="globe-outline"
          title="Website"
          value={contact.website}
        />

        <DetailCard
          icon="location-outline"
          title="Address"
          value={contact.address}
        />

        <DetailCard
          icon="flag-outline"
          title="Country"
          value={contact.country}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 16,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    marginBottom: 20,
  },

  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
  },

  profileCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    paddingVertical: 30,
    alignItems: "center",
    marginBottom: 20,

    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },

  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#EEF4FF",
    justifyContent: "center",
    alignItems: "center",
  },

  avatarText: {
    fontSize: 36,
    fontWeight: "800",
    color: "#2563EB",
  },

  name: {
    marginTop: 16,
    fontSize: 26,
    fontWeight: "800",
    color: "#111827",
  },

  designation: {
    marginTop: 6,
    fontSize: 16,
    color: "#6B7280",
  },

  company: {
    marginTop: 4,
    color: "#2563EB",
    fontWeight: "700",
    fontSize: 15,
  },

  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },

  actionButton: {
    width: "31%",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingVertical: 18,
    alignItems: "center",

    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },

  actionText: {
    marginTop: 8,
    color: "#111827",
    fontWeight: "600",
  },

  detailCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,

    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },

  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#EEF4FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },

  label: {
    color: "#6B7280",
    fontSize: 13,
    marginBottom: 4,
  },

  value: {
    color: "#111827",
    fontSize: 16,
    fontWeight: "600",
  },
});