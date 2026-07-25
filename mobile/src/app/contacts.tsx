import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";

import BottomNav from "@/components/BottomNav";
import { saveContacts } from "../services/database";

type ContactItem = {
  name?: string;
  designation?: string;
  company?: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
  country?: string;
  filename?: string;
  card_no?: string | number;
};

export default function ContactsScreen() {
  const insets = useSafeAreaInsets();

  const [search, setSearch] = useState("");
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const extractedCards = (globalThis as any).extractedCards;

      setContacts(
        Array.isArray(extractedCards)
          ? [...extractedCards]
          : []
      );
    }, [])
  );

  const filteredContacts = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {
      return contacts;
    }

    return contacts.filter((contact) => {
      const searchableText = [
        contact.name,
        contact.designation,
        contact.company,
        contact.phone,
        contact.email,
        contact.website,
        contact.address,
        contact.country,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(normalizedSearch);
    });
  }, [contacts, search]);

  const handleEditContact = (index: number) => {
    const originalIndex = contacts.findIndex(
      (contact) => contact === filteredContacts[index]
    );

    router.push({
      pathname: "/edit-contact",
      params: {
        index: String(originalIndex >= 0 ? originalIndex : index),
      },
    });
  };

  const handleSaveContacts = async () => {
    if (contacts.length === 0 || saving) {
      return;
    }

    try {
      setSaving(true);

      await saveContacts(contacts);

      const savedCount = contacts.length;

      (globalThis as any).extractedCards = [];
      setContacts([]);
      setSearch("");

      Alert.alert(
        "Contacts Saved",
        `${savedCount} ${
          savedCount === 1 ? "contact was" : "contacts were"
        } saved successfully.`,
        [
          {
            text: "Done",
            onPress: () => router.replace("/home"),
          },
        ]
      );
    } catch (error: any) {
      console.error("Save contacts error:", error);

      Alert.alert(
        "Save Failed",
        error?.message ||
          "Unable to save your contacts. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  const renderContact = ({
    item,
    index,
  }: {
    item: ContactItem;
    index: number;
  }) => {
    const initial =
      item.name?.trim()?.charAt(0)?.toUpperCase() || "?";

    const subtitle = [
      item.designation,
      item.company,
    ]
      .filter(Boolean)
      .join(" • ");

    return (
      <TouchableOpacity
        activeOpacity={0.84}
        style={styles.card}
        onPress={() => handleEditContact(index)}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {initial}
          </Text>
        </View>

        <View style={styles.info}>
          <Text
            numberOfLines={1}
            style={styles.name}
          >
            {item.name || "Unknown Contact"}
          </Text>

          <Text
            numberOfLines={1}
            style={styles.designation}
          >
            {subtitle || "No designation available"}
          </Text>

          <View style={styles.contactDetails}>
            {item.phone ? (
              <View style={styles.detailRow}>
                <View
                  style={[
                    styles.detailIcon,
                    styles.phoneIcon,
                  ]}
                >
                  <Ionicons
                    name="call-outline"
                    size={15}
                    color="#09A84E"
                  />
                </View>

                <Text
                  numberOfLines={1}
                  style={styles.detailText}
                >
                  {item.phone}
                </Text>
              </View>
            ) : null}

            {item.email ? (
              <View style={styles.detailRow}>
                <View
                  style={[
                    styles.detailIcon,
                    styles.emailIcon,
                  ]}
                >
                  <Ionicons
                    name="mail-outline"
                    size={15}
                    color="#EFA300"
                  />
                </View>

                <Text
                  numberOfLines={1}
                  style={styles.detailText}
                >
                  {item.email}
                </Text>
              </View>
            ) : null}

            {item.website ? (
              <View style={styles.detailRow}>
                <View
                  style={[
                    styles.detailIcon,
                    styles.websiteIcon,
                  ]}
                >
                  <Ionicons
                    name="globe-outline"
                    size={15}
                    color="#7056B8"
                  />
                </View>

                <Text
                  numberOfLines={1}
                  style={styles.detailText}
                >
                  {item.website}
                </Text>
              </View>
            ) : null}

            {item.address ? (
              <View
                style={[
                  styles.detailRow,
                  styles.addressRow,
                ]}
              >
                <View
                  style={[
                    styles.detailIcon,
                    styles.addressIcon,
                  ]}
                >
                  <Ionicons
                    name="location-outline"
                    size={15}
                    color="#ED5447"
                  />
                </View>

                <Text
                  numberOfLines={2}
                  style={[
                    styles.detailText,
                    styles.addressText,
                  ]}
                >
                  {item.address}
                  {item.country
                    ? `, ${item.country}`
                    : ""}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.editButton}>
          <Ionicons
            name="create-outline"
            size={21}
            color="#09A84E"
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
              Extracted Contacts
            </Text>

            <Text style={styles.subtitle}>
              {contacts.length}{" "}
              {contacts.length === 1
                ? "contact found"
                : "contacts found"}
            </Text>
          </View>

          <View style={styles.headerIcon}>
            <Ionicons
              name="people-outline"
              size={24}
              color="#09A84E"
            />
          </View>
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <Ionicons
            name="search-outline"
            size={21}
            color="#8E969D"
          />

          <TextInput
            placeholder="Search contacts"
            placeholderTextColor="#A0A7AE"
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
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
                color="#A6ADB3"
              />
            </TouchableOpacity>
          ) : (
            <View style={styles.filterButton}>
              <Ionicons
                name="options-outline"
                size={21}
                color="#09A84E"
              />
            </View>
          )}
        </View>

        {/* Contact List */}
        <FlatList
          data={filteredContacts}
          keyExtractor={(item, index) =>
            `${
              item.filename ||
              item.card_no ||
              item.email ||
              item.phone ||
              "contact"
            }-${index}`
          }
          renderItem={renderContact}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.listContent,
            {
              paddingBottom:
                175 + insets.bottom,
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
                      : "people-outline"
                  }
                  size={38}
                  color="#09A84E"
                />
              </View>

              <Text style={styles.emptyTitle}>
                {search
                  ? "No contacts found"
                  : "No extracted contacts"}
              </Text>

              <Text style={styles.emptyDescription}>
                {search
                  ? "Try searching with a different name, company, phone number, or email."
                  : "Scan a business card to extract and review its contact information."}
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

                  <Text style={styles.scanButtonText}>
                    Scan a Card
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />

        {/* Save Button */}
        {contacts.length > 0 && (
          <View
            style={[
              styles.bottomAction,
              {
                bottom: 76 + insets.bottom,
              },
            ]}
          >
            <TouchableOpacity
              activeOpacity={0.86}
              disabled={saving}
              style={[
                styles.saveButton,
                saving && styles.disabledButton,
              ]}
              onPress={handleSaveContacts}
            >
              {saving ? (
                <>
                  <ActivityIndicator
                    size="small"
                    color="#FFFFFF"
                  />

                  <Text style={styles.saveText}>
                    Saving Contacts...
                  </Text>
                </>
              ) : (
                <>
                  <Ionicons
                    name="save-outline"
                    size={22}
                    color="#FFFFFF"
                  />

                  <Text style={styles.saveText}>
                    Save All ({contacts.length})
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
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

  searchContainer: {
    minHeight: 52,
    borderRadius: 17,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    marginBottom: 17,
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

  filterButton: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: "#EFFAF3",
    alignItems: "center",
    justifyContent: "center",
  },

  listContent: {
    paddingTop: 1,
  },

  emptyListContent: {
    flexGrow: 1,
  },

  card: {
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
    paddingRight: 8,
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

  contactDetails: {
    marginTop: 11,
    gap: 7,
  },

  detailRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  addressRow: {
    alignItems: "flex-start",
  },

  detailIcon: {
    width: 27,
    height: 27,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },

  phoneIcon: {
    backgroundColor: "#EAF8F0",
  },

  emailIcon: {
    backgroundColor: "#FFF5DE",
  },

  websiteIcon: {
    backgroundColor: "#F1EDFF",
  },

  addressIcon: {
    backgroundColor: "#FFF0EE",
  },

  detailText: {
    flex: 1,
    marginLeft: 8,
    color: "#535C64",
    fontSize: 12.5,
    lineHeight: 17,
    fontWeight: "500",
  },

  addressText: {
    paddingTop: 4,
  },

  editButton: {
    width: 39,
    height: 39,
    borderRadius: 13,
    backgroundColor: "#EFFAF3",
    alignItems: "center",
    justifyContent: "center",
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

  bottomAction: {
    position: "absolute",
    left: 20,
    right: 20,
    paddingTop: 10,
  },

  saveButton: {
    height: 58,
    borderRadius: 17,
    backgroundColor: "#09AA4D",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",

    shadowColor: "#078A3E",
    shadowOpacity: 0.22,
    shadowRadius: 9,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 5,
  },

  disabledButton: {
    opacity: 0.72,
  },

  saveText: {
    marginLeft: 9,
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
});