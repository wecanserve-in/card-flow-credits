import { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";

import BottomNav from "@/components/BottomNav";
import { getContacts } from "../services/database";

type ContactItem = {
  id?: string;
  name?: string;
  designation?: string;
  company?: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
  country?: string;
  updatedAt?: number;
  createdAt?: number;
};

type SortType = "latest" | "oldest";

export default function SavedContactsScreen() {
  const insets = useSafeAreaInsets();

  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [search, setSearch] = useState("");
  const [sortType, setSortType] =
    useState<SortType>("latest");
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      loadContacts();
    }, [])
  );

  const loadContacts = async () => {
    try {
      setLoading(true);

      const data = await getContacts();

      const normalizedData = Array.isArray(data)
        ? [...data]
        : [];

      setContacts(normalizedData);
    } catch (error) {
      console.error("Failed to load contacts:", error);
      setContacts([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredContacts = useMemo(() => {
    let data = [...contacts];

    data.sort((a, b) => {
      const firstDate =
        a.updatedAt || a.createdAt || 0;

      const secondDate =
        b.updatedAt || b.createdAt || 0;

      return sortType === "latest"
        ? secondDate - firstDate
        : firstDate - secondDate;
    });

    const keyword = search
      .trim()
      .toLowerCase();

    if (!keyword) {
      return data;
    }

    return data.filter((item) => {
      const searchableText = [
        item.name,
        item.designation,
        item.company,
        item.phone,
        item.email,
        item.website,
        item.address,
        item.country,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(keyword);
    });
  }, [contacts, search, sortType]);

  const handleOpenContact = (
    contact: ContactItem
  ) => {
    (globalThis as any).selectedContact =
      contact;

    router.push("/contact-details");
  };

  const renderContact = ({
    item,
  }: {
    item: ContactItem;
  }) => {
    const initial =
      item.name
        ?.trim()
        ?.charAt(0)
        ?.toUpperCase() || "?";

    const subtitle = [
      item.designation,
      item.company,
    ]
      .filter(Boolean)
      .join(" • ");

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.84}
        onPress={() =>
          handleOpenContact(item)
        }
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {initial}
          </Text>
        </View>

        <View style={styles.info}>
          <Text
            style={styles.name}
            numberOfLines={1}
          >
            {item.name || "Unknown Contact"}
          </Text>

          <Text
            style={styles.designation}
            numberOfLines={1}
          >
            {subtitle ||
              "No designation available"}
          </Text>

          <View style={styles.metaContainer}>
            {!!item.phone && (
              <View style={styles.metaRow}>
                <View
                  style={[
                    styles.metaIcon,
                    styles.phoneIcon,
                  ]}
                >
                  <Ionicons
                    name="call-outline"
                    size={14}
                    color="#09A84E"
                  />
                </View>

                <Text
                  style={styles.metaText}
                  numberOfLines={1}
                >
                  {item.phone}
                </Text>
              </View>
            )}

            {!!item.email && (
              <View style={styles.metaRow}>
                <View
                  style={[
                    styles.metaIcon,
                    styles.emailIcon,
                  ]}
                >
                  <Ionicons
                    name="mail-outline"
                    size={14}
                    color="#EFA300"
                  />
                </View>

                <Text
                  style={styles.metaText}
                  numberOfLines={1}
                >
                  {item.email}
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.chevronButton}>
          <Ionicons
            name="chevron-forward"
            size={20}
            color="#AAB1B7"
          />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.title}>
              Saved Contacts
            </Text>

            <Text style={styles.subtitle}>
              {filteredContacts.length}{" "}
              {filteredContacts.length === 1
                ? "contact"
                : "contacts"}
            </Text>
          </View>

          <View style={styles.headerIcon}>
            <Ionicons
              name="card-outline"
              size={24}
              color="#09A84E"
            />
          </View>
        </View>

        {/* Search */}
        <View style={styles.searchBox}>
          <Ionicons
            name="search-outline"
            size={21}
            color="#8D959C"
          />

          <TextInput
            placeholder="Search contacts"
            placeholderTextColor="#A0A7AE"
            value={search}
            onChangeText={setSearch}
            style={styles.searchInput}
            returnKeyType="search"
          />

          {search.length > 0 ? (
            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.clearButton}
              onPress={() => setSearch("")}
            >
              <Ionicons
                name="close-circle"
                size={21}
                color="#A7ADB3"
              />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Sort */}
        <View style={styles.filterRow}>
          <TouchableOpacity
            activeOpacity={0.82}
            style={[
              styles.filterBtn,
              sortType === "latest" &&
                styles.activeFilter,
            ]}
            onPress={() =>
              setSortType("latest")
            }
          >
            <Ionicons
              name="arrow-down-outline"
              size={16}
              color={
                sortType === "latest"
                  ? "#FFFFFF"
                  : "#687078"
              }
            />

            <Text
              style={[
                styles.filterText,
                sortType === "latest" &&
                  styles.activeFilterText,
              ]}
            >
              Latest
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.82}
            style={[
              styles.filterBtn,
              sortType === "oldest" &&
                styles.activeFilter,
            ]}
            onPress={() =>
              setSortType("oldest")
            }
          >
            <Ionicons
              name="arrow-up-outline"
              size={16}
              color={
                sortType === "oldest"
                  ? "#FFFFFF"
                  : "#687078"
              }
            />

            <Text
              style={[
                styles.filterText,
                sortType === "oldest" &&
                  styles.activeFilterText,
              ]}
            >
              Oldest
            </Text>
          </TouchableOpacity>
        </View>

        {/* List */}
        {loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator
              size="large"
              color="#09A84E"
            />

            <Text style={styles.loadingText}>
              Loading contacts...
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredContacts}
            keyExtractor={(item, index) =>
              item.id ||
              `${item.email || item.phone || "contact"}-${index}`
            }
            renderItem={renderContact}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={[
              styles.listContent,
              {
                paddingBottom:
                  115 + insets.bottom,
              },
              filteredContacts.length === 0 &&
                styles.emptyListContent,
            ]}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <View style={styles.emptyIcon}>
                  <Ionicons
                    name={
                      search
                        ? "search-outline"
                        : "card-outline"
                    }
                    size={38}
                    color="#09A84E"
                  />
                </View>

                <Text style={styles.emptyTitle}>
                  {search
                    ? "No contacts found"
                    : "No saved contacts"}
                </Text>

                <Text
                  style={
                    styles.emptyDescription
                  }
                >
                  {search
                    ? "Try searching with a different name, company, phone number, or email."
                    : "Your saved business card contacts will appear here."}
                </Text>

                {!search && (
                  <TouchableOpacity
                    activeOpacity={0.84}
                    style={styles.scanButton}
                    onPress={() =>
                      router.push("/scanner")
                    }
                  >
                    <Ionicons
                      name="scan-outline"
                      size={20}
                      color="#FFFFFF"
                    />

                    <Text
                      style={
                        styles.scanButtonText
                      }
                    >
                      Scan a Card
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            }
          />
        )}

        <BottomNav active="contacts" />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  container: {
    flex: 1,
    backgroundColor: "#F8FAF9",
    paddingHorizontal: 20,
  },

  header: {
    minHeight: 88,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  headerText: {
    flex: 1,
    paddingRight: 12,
  },

  title: {
    color: "#171C21",
    fontSize: 23,
    fontWeight: "800",
  },

  subtitle: {
    marginTop: 5,
    color: "#858D95",
    fontSize: 13,
    fontWeight: "500",
  },

  headerIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: "#EAF8F0",
    alignItems: "center",
    justifyContent: "center",
  },

  searchBox: {
    height: 52,
    borderRadius: 17,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 15,
    flexDirection: "row",
    alignItems: "center",
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

  searchInput: {
    flex: 1,
    marginHorizontal: 10,
    paddingVertical: 0,
    color: "#252B31",
    fontSize: 15,
    fontWeight: "500",
  },

  clearButton: {
    width: 34,
    height: 34,
    alignItems: "flex-end",
    justifyContent: "center",
  },

  filterRow: {
    marginTop: 15,
    marginBottom: 17,
    flexDirection: "row",
    alignItems: "center",
  },

  filterBtn: {
    minHeight: 41,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    marginRight: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E5EAE7",
  },

  activeFilter: {
    backgroundColor: "#09A84E",
    borderColor: "#09A84E",

    shadowColor: "#078A3E",
    shadowOpacity: 0.16,
    shadowRadius: 6,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    elevation: 2,
  },

  filterText: {
    marginLeft: 6,
    color: "#687078",
    fontSize: 13,
    fontWeight: "700",
  },

  activeFilterText: {
    color: "#FFFFFF",
  },

  listContent: {
    paddingTop: 1,
  },

  emptyListContent: {
    flexGrow: 1,
  },

  card: {
    minHeight: 106,
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 13,
    borderWidth: 1,
    borderColor: "#E8EDE9",

    shadowColor: "#17261D",
    shadowOpacity: 0.055,
    shadowRadius: 9,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    elevation: 2,
  },

  avatar: {
    width: 52,
    height: 52,
    borderRadius: 17,
    backgroundColor: "#EAF8F0",
    alignItems: "center",
    justifyContent: "center",
  },

  avatarText: {
    color: "#09A84E",
    fontSize: 21,
    fontWeight: "800",
  },

  info: {
    flex: 1,
    marginLeft: 13,
    paddingRight: 7,
  },

  name: {
    color: "#20262C",
    fontSize: 16,
    fontWeight: "800",
  },

  designation: {
    marginTop: 4,
    color: "#7E868E",
    fontSize: 12.5,
    lineHeight: 17,
    fontWeight: "500",
  },

  metaContainer: {
    marginTop: 10,
    gap: 7,
  },

  metaRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  metaIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },

  phoneIcon: {
    backgroundColor: "#EAF8F0",
  },

  emailIcon: {
    backgroundColor: "#FFF5DE",
  },

  metaText: {
    flex: 1,
    marginLeft: 8,
    color: "#545D65",
    fontSize: 12.5,
    fontWeight: "500",
  },

  chevronButton: {
    width: 34,
    height: 42,
    alignItems: "flex-end",
    justifyContent: "center",
  },

  loaderContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 90,
  },

  loadingText: {
    marginTop: 12,
    color: "#858D95",
    fontSize: 13,
    fontWeight: "500",
  },

  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    paddingBottom: 90,
  },

  emptyIcon: {
    width: 76,
    height: 76,
    borderRadius: 24,
    backgroundColor: "#EAF8F0",
    alignItems: "center",
    justifyContent: "center",
  },

  emptyTitle: {
    marginTop: 18,
    color: "#1D2329",
    fontSize: 19,
    fontWeight: "800",
    textAlign: "center",
  },

  emptyDescription: {
    marginTop: 8,
    color: "#858D95",
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "500",
    textAlign: "center",
  },

  scanButton: {
    minWidth: 155,
    height: 49,
    marginTop: 20,
    paddingHorizontal: 20,
    borderRadius: 15,
    backgroundColor: "#09AA4D",
    flexDirection: "row",
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

  scanButtonText: {
    marginLeft: 8,
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
});