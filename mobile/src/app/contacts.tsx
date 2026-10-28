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
  Modal,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";

import BottomNav from "@/components/BottomNav";
import {
  saveContacts,
  getFolders,
  findDuplicates,
  setContactFolders,
  FolderItem,
} from "../services/database";

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

  const [folders, setFolders] = useState<FolderItem[]>([]);

  // Selection is available directly on the extracted contacts page.
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedContactIndices, setSelectedContactIndices] = useState<number[]>([]);
  const [showFolderPicker, setShowFolderPicker] = useState(false);
  const [pendingFolderId, setPendingFolderId] = useState<string | null>(null);
  // Parallel to `contacts`: true when that card is already in My Cards.
  const [duplicateFlags, setDuplicateFlags] = useState<boolean[]>([]);

  useFocusEffect(
    useCallback(() => {
      const extractedCards = (globalThis as any).extractedCards;
      const cards = Array.isArray(extractedCards) ? [...extractedCards] : [];

      setContacts(cards);

      let active = true;

      findDuplicates(cards)
        .then((matches) => {
          if (active) setDuplicateFlags(matches.map(Boolean));
        })
        .catch(() => {
          // The save step checks again, so a failed check here is harmless.
        });

      return () => {
        active = false;
      };
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

  const loadFolders = async () => {
    try {
      const data = await getFolders();
      setFolders(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Load folders error:", error);
      setFolders([]);
    }
  };

  const toggleContactSelection = (index: number) => {
    setSelectedContactIndices((previous) =>
      previous.includes(index)
        ? previous.filter((item) => item !== index)
        : [...previous, index]
    );
  };

  const selectAllContacts = () => {
    setSelectedContactIndices(
      contacts.map((_, index) => index)
    );
  };

  const clearSelection = () => {
    setSelectedContactIndices([]);
    setSelectionMode(false);
  };

  const handleSaveSelectedContacts = async () => {
    if (selectedContactIndices.length === 0 || saving) return;
    await loadFolders();
    setPendingFolderId(null);
    setShowFolderPicker(true);
  };

  /** Asks what to do when some selected cards are already in My Cards. */
  const askAboutDuplicates = (
    duplicateNames: string[]
  ): Promise<"skip" | "update" | null> =>
    new Promise((resolve) => {
      const count = duplicateNames.length;
      const names = duplicateNames.slice(0, 3).join(", ") + (count > 3 ? ` and ${count - 3} more` : "");

      Alert.alert(
        count === 1 ? "Already Saved" : `${count} Already Saved`,
        `${names} ${count === 1 ? "is" : "are"} already in My Cards (same phone or email).`,
        [
          { text: "Cancel", style: "cancel", onPress: () => resolve(null) },
          { text: "Skip", onPress: () => resolve("skip") },
          { text: "Update", onPress: () => resolve("update") },
        ],
        { cancelable: true, onDismiss: () => resolve(null) }
      );
    });

  const handleSaveSelectedToFolder = async (folderId: string | null) => {
    if (selectedContactIndices.length === 0 || saving) return;

    try {
      setSaving(true);
      const selectedSet = new Set(selectedContactIndices);
      const selectedContacts = contacts.filter((_, index) => selectedSet.has(index));

      const matches = await findDuplicates(selectedContacts);
      const duplicateNames = selectedContacts
        .filter((_, index) => matches[index])
        .map((contact) => contact.name || "Unnamed contact");

      let replaceDuplicates = false;

      if (duplicateNames.length > 0) {
        const choice = await askAboutDuplicates(duplicateNames);

        if (choice === null) {
          return;
        }

        replaceDuplicates = choice === "update";
      }

      const result = await saveContacts(selectedContacts, { replaceDuplicates });

      if (folderId) {
        for (const entry of result.written) {
          await setContactFolders(
            entry.id,
            Array.from(new Set([...entry.folderIds, folderId]))
          );
        }
      }

      const remainingContacts = contacts.filter((_, index) => !selectedSet.has(index));
      setContacts(remainingContacts);
      (globalThis as any).extractedCards = remainingContacts;
      setDuplicateFlags(remainingContacts.map(() => false));
      setSelectedContactIndices([]);
      setSelectionMode(false);
      setShowFolderPicker(false);
      setPendingFolderId(null);
      setSearch("");

      if (result.skipped > 0 || result.updated > 0) {
        const parts = [];
        if (result.saved > 0) parts.push(`${result.saved} saved`);
        if (result.updated > 0) parts.push(`${result.updated} updated`);
        if (result.skipped > 0) parts.push(`${result.skipped} skipped (already saved)`);
        Alert.alert("Contacts Saved", parts.join(", ") + ".");
      }

      if (remainingContacts.length === 0) {
        router.replace("/home");
      }
    } catch (error: any) {
      console.error("Save selected contacts error:", error);
      Alert.alert(
        "Save Failed",
        error?.message || "Unable to save the selected contacts. Please try again."
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
        onPress={() =>
          selectionMode
            ? toggleContactSelection(index)
            : handleEditContact(index)
        }
        onLongPress={() => {
          setSelectionMode(true);
          toggleContactSelection(index);
        }}
      >
        {selectionMode && (
          <View
            style={[
              styles.selectionCheckbox,
              selectedContactIndices.includes(index) &&
                styles.selectionCheckboxActive,
            ]}
          >
            {selectedContactIndices.includes(index) && (
              <Ionicons
                name="checkmark"
                size={15}
                color="#FFFFFF"
              />
            )}
          </View>
        )}

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

          {duplicateFlags[contacts.indexOf(item)] && (
            <View style={styles.duplicateBadge}>
              <Ionicons
                name="copy-outline"
                size={12}
                color="#7A5200"
              />
              <Text style={styles.duplicateBadgeText}>
                Already in My Cards
              </Text>
            </View>
          )}

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

          {selectionMode ? (
            <View style={styles.selectionHeaderActions}>
              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.selectAllButton}
                onPress={() => {
                  if (selectedContactIndices.length === contacts.length) {
                    setSelectedContactIndices([]);
                  } else {
                    selectAllContacts();
                  }
                }}
              >
                <Text style={styles.selectAllText}>
                  {selectedContactIndices.length === contacts.length
                    ? "Deselect All"
                    : "Select All"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.closeSelectionButton}
                onPress={clearSelection}
              >
                <Ionicons
                  name="close"
                  size={21}
                  color="#20262C"
                />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              activeOpacity={0.82}
              style={styles.headerSelectButton}
              onPress={() => setSelectionMode(true)}
            >
              <Ionicons
                name="checkmark-circle-outline"
                size={20}
                color="#09A84E"
              />
              <Text style={styles.headerSelectText}>Select</Text>
            </TouchableOpacity>
          )}
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

        {/* Page-level selection and save actions */}
        {contacts.length > 0 && (
          <View
            style={[styles.bottomAction, { bottom: 76 + insets.bottom }]}
          >
            <TouchableOpacity
              activeOpacity={0.86}
              disabled={saving || (selectionMode && selectedContactIndices.length === 0)}
              style={[
                styles.saveButton,
                (saving || (selectionMode && selectedContactIndices.length === 0)) && styles.disabledButton,
              ]}
              onPress={selectionMode ? handleSaveSelectedContacts : () => setSelectionMode(true)}
            >
              {saving ? (
                <>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text style={styles.saveText}>Saving...</Text>
                </>
              ) : (
                <>
                  <Ionicons name="save-outline" size={22} color="#FFFFFF" />
                  <Text style={styles.saveText}>
                    {selectionMode
                      ? `Save Selected (${selectedContactIndices.length})`
                      : `Select Cards (${contacts.length})`}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Folder picker for selected cards */}
        <Modal
          visible={showFolderPicker}
          transparent
          animationType="slide"
          onRequestClose={() => setShowFolderPicker(false)}
        >
          <View style={styles.saveModalOverlay}>
            <View style={styles.folderPickerModal}>
              <View style={styles.saveModalHeader}>
                <View>
                  <Text style={styles.saveModalTitle}>
                    Save Selected Cards
                  </Text>
                  <Text style={styles.saveModalSubtitle}>
                    {selectedContactIndices.length} selected {selectedContactIndices.length === 1 ? "card" : "cards"}
                  </Text>
                </View>

                <TouchableOpacity
                  activeOpacity={0.7}
                  style={styles.modalCloseButton}
                  onPress={() => setShowFolderPicker(false)}
                >
                  <Ionicons
                    name="close"
                    size={21}
                    color="#737B82"
                  />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                activeOpacity={0.82}
                style={[styles.folderChoice, pendingFolderId === null && styles.folderChoiceActive]}
                onPress={() => setPendingFolderId(null)}
              >
                <Ionicons
                  name="people-outline"
                  size={22}
                  color="#09A84E"
                />
                <Text style={styles.folderChoiceText}>General</Text>
              </TouchableOpacity>

              {folders.map((folder) => (
                <TouchableOpacity
                  key={folder.id}
                  activeOpacity={0.82}
                  style={[styles.folderChoice, pendingFolderId === folder.id && styles.folderChoiceActive]}
                  onPress={() => setPendingFolderId(folder.id)}
                >
                  <Ionicons
                    name="folder-outline"
                    size={22}
                    color="#EFA300"
                  />
                  <Text
                    numberOfLines={1}
                    style={styles.folderChoiceText}
                  >
                    {folder.name}
                  </Text>
                </TouchableOpacity>
              ))}

              {folders.length === 0 && (
                <Text style={styles.noFolderPickerText}>
                  No folders created yet. Create one from Saved Contacts.
                </Text>
              )}

              <TouchableOpacity
                activeOpacity={0.85}
                disabled={saving || (folders.length > 0 && pendingFolderId === undefined)}
                style={[styles.finalSaveButton, saving && styles.disabledButton]}
                onPress={() => handleSaveSelectedToFolder(pendingFolderId)}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={21} color="#FFFFFF" />
                    <Text style={styles.finalSaveText}>
                      Save Selected ({selectedContactIndices.length})
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

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

  duplicateBadge: {
    alignSelf: "flex-start",
    marginTop: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: "#FFF3D1",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },

  duplicateBadgeText: {
    color: "#7A5200",
    fontSize: 11,
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

  headerSelectButton: {
    minHeight: 42,
    paddingHorizontal: 13,
    borderRadius: 14,
    backgroundColor: "#EFFAF3",
    borderWidth: 1,
    borderColor: "#CBEBD8",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  headerSelectText: {
    marginLeft: 6,
    color: "#09A84E",
    fontSize: 13,
    fontWeight: "800",
  },

  selectionHeaderActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  selectAllButton: {
    minHeight: 42,
    paddingHorizontal: 12,
    borderRadius: 13,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DCE4DF",
    alignItems: "center",
    justifyContent: "center",
  },

  selectAllText: {
    color: "#09A84E",
    fontSize: 12,
    fontWeight: "800",
  },

  closeSelectionButton: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: "#F1F4F2",
    alignItems: "center",
    justifyContent: "center",
  },

  selectionCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    marginRight: 11,
    marginTop: 14,
    borderWidth: 2,
    borderColor: "#C7D0CA",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },

  selectionCheckboxActive: {
    backgroundColor: "#09A84E",
    borderColor: "#09A84E",
  },

  selectionActionBar: {
    position: "absolute",
    left: 20,
    right: 20,
    minHeight: 58,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 17,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DCE5DF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 20,
    elevation: 8,
  },

  selectionCountBox: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 7,
  },

  selectionCountNumber: {
    color: "#09A84E",
    fontSize: 16,
    fontWeight: "900",
  },

  selectionCountText: {
    marginLeft: 5,
    color: "#6F7973",
    fontSize: 12,
    fontWeight: "700",
  },

  assignFolderButton: {
    height: 44,
    paddingHorizontal: 15,
    borderRadius: 13,
    backgroundColor: "#09A84E",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  assignFolderText: {
    marginLeft: 7,
    color: "#FFFFFF",
    fontSize: 12.5,
    fontWeight: "800",
  },

  folderPickerModal: {
    width: "100%",
    maxHeight: "70%",
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 25,
  },

  folderChoice: {
    minHeight: 58,
    marginTop: 9,
    paddingHorizontal: 15,
    borderRadius: 15,
    backgroundColor: "#F8FAF9",
    borderWidth: 1,
    borderColor: "#E5EAE7",
    flexDirection: "row",
    alignItems: "center",
  },

  folderChoiceActive: {
    backgroundColor: "#EFF9F3",
    borderColor: "#09A84E",
  },

  folderChoiceText: {
    flex: 1,
    marginLeft: 11,
    color: "#20262C",
    fontSize: 14,
    fontWeight: "800",
  },

  noFolderPickerText: {
    marginTop: 15,
    color: "#858D95",
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "500",
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

  /* ================= SAVE FOLDER MODAL ================= */

  saveModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(10, 16, 13, 0.48)",
    justifyContent: "flex-end",
  },

  saveModal: {
    width: "100%",
    maxHeight: "88%",
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 25,
  },

  saveModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  saveModalIcon: {
    width: 54,
    height: 54,
    borderRadius: 17,
    backgroundColor: "#EAF8F0",
    alignItems: "center",
    justifyContent: "center",
  },

  modalCloseButton: {
    width: 39,
    height: 39,
    borderRadius: 20,
    backgroundColor: "#F2F5F3",
    alignItems: "center",
    justifyContent: "center",
  },

  saveModalTitle: {
    marginTop: 15,
    color: "#171C21",
    fontSize: 22,
    fontWeight: "800",
  },

  saveModalSubtitle: {
    marginTop: 5,
    color: "#858D95",
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "500",
  },

  saveQuestion: {
    marginTop: 22,
    marginBottom: 10,
    color: "#313934",
    fontSize: 14,
    fontWeight: "800",
  },

  saveOption: {
    minHeight: 68,
    marginTop: 9,
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderRadius: 17,
    backgroundColor: "#F8FAF9",
    borderWidth: 1,
    borderColor: "#E5EAE7",
    flexDirection: "row",
    alignItems: "center",
  },

  saveOptionActive: {
    backgroundColor: "#EFF9F3",
    borderColor: "#09A84E",
  },

  saveOptionIcon: {
    width: 45,
    height: 45,
    borderRadius: 14,
    backgroundColor: "#EEF2F0",
    alignItems: "center",
    justifyContent: "center",
  },

  saveOptionIconActive: {
    backgroundColor: "#E0F5E8",
  },

  saveOptionContent: {
    flex: 1,
    marginLeft: 12,
    marginRight: 10,
  },

  saveOptionTitle: {
    color: "#20262C",
    fontSize: 14.5,
    fontWeight: "800",
  },

  saveOptionSubtitle: {
    marginTop: 3,
    color: "#858D95",
    fontSize: 11.5,
    fontWeight: "500",
  },

  radioOuter: {
    width: 23,
    height: 23,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#C9D1CC",
    alignItems: "center",
    justifyContent: "center",
  },

  radioOuterActive: {
    borderColor: "#09A84E",
  },

  radioInner: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: "#09A84E",
  },

  folderSectionTitle: {
    marginTop: 19,
    marginBottom: 2,
    color: "#8A938E",
    fontSize: 10.5,
    fontWeight: "900",
    letterSpacing: 0.8,
  },

  folderList: {
    maxHeight: 220,
  },

  noFolderBox: {
    marginTop: 10,
    padding: 14,
    borderRadius: 16,
    backgroundColor: "#F4F8F5",
    borderWidth: 1,
    borderColor: "#E1EAE4",
    flexDirection: "row",
    alignItems: "center",
  },

  noFolderContent: {
    flex: 1,
    marginLeft: 10,
  },

  noFolderTitle: {
    color: "#303834",
    fontSize: 13,
    fontWeight: "800",
  },

  noFolderText: {
    marginTop: 3,
    color: "#858D95",
    fontSize: 11.5,
    lineHeight: 17,
  },

  finalSaveButton: {
    minHeight: 54,
    marginTop: 17,
    borderRadius: 16,
    backgroundColor: "#09A84E",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",

    shadowColor: "#09A84E",
    shadowOpacity: 0.2,
    shadowRadius: 9,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 4,
  },

  finalSaveText: {
    marginLeft: 8,
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },

});