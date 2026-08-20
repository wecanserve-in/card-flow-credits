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
  getContacts,
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

  const [showSaveFolderModal, setShowSaveFolderModal] =
    useState(false);

  const [folders, setFolders] = useState<FolderItem[]>([]);

  const [selectedFolderId, setSelectedFolderId] =
    useState<string | null>(null);

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

  const loadFolders = async () => {
    try {
      const data = await getFolders();
      setFolders(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Load folders error:", error);
      setFolders([]);
    }
  };

  const normalizeEmail = (email?: string) =>
    email?.trim().toLowerCase() || "";

  const normalizePhone = (phone?: string) =>
    (phone || "").replace(/\D/g, "").slice(-10);

  const handleSaveContacts = async () => {
    if (contacts.length === 0 || saving) {
      return;
    }

    await loadFolders();
    setSelectedFolderId(null);
    setShowSaveFolderModal(true);
  };

  const handleConfirmSaveContacts = async () => {
    if (contacts.length === 0 || saving) {
      return;
    }

    try {
      setSaving(true);

      // Save the exact edited contacts currently shown on the preview screen.
      await saveContacts(contacts);

      // General = no folder assignment.
      if (selectedFolderId) {
        const savedContacts = await getContacts();

        for (const contact of contacts) {
          const email = normalizeEmail(contact.email);
          const phone = normalizePhone(contact.phone);

          const matchedContact = savedContacts.find((saved: any) => {
            const savedEmail = normalizeEmail(saved.email);
            const savedPhone = normalizePhone(saved.phone);

            if (email && savedEmail) {
              return email === savedEmail;
            }

            if (phone && savedPhone) {
              return phone === savedPhone;
            }

            return false;
          });

          if (matchedContact?.id) {
            await setContactFolders(
              matchedContact.id,
              [selectedFolderId]
            );
          }
        }
      }

      const savedCount = contacts.length;
      const selectedFolder = folders.find(
        (folder) => folder.id === selectedFolderId
      );

      (globalThis as any).extractedCards = [];

      setContacts([]);
      setSearch("");
      setShowSaveFolderModal(false);

      Alert.alert(
        "Contacts Saved",
        selectedFolder
          ? `${savedCount} ${
              savedCount === 1 ? "contact was" : "contacts were"
            } saved in "${selectedFolder.name}".`
          : `${savedCount} ${
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

        {/* Save All -> Folder selection modal */}
        <Modal
          visible={showSaveFolderModal}
          transparent
          animationType="slide"
          onRequestClose={() => {
            if (!saving) {
              setShowSaveFolderModal(false);
            }
          }}
        >
          <View style={styles.saveModalOverlay}>
            <View style={styles.saveModal}>
              <View style={styles.saveModalHeader}>
                <View style={styles.saveModalIcon}>
                  <Ionicons
                    name="save-outline"
                    size={25}
                    color="#09A84E"
                  />
                </View>

                <TouchableOpacity
                  activeOpacity={0.7}
                  disabled={saving}
                  style={styles.modalCloseButton}
                  onPress={() => setShowSaveFolderModal(false)}
                >
                  <Ionicons
                    name="close"
                    size={21}
                    color="#737B82"
                  />
                </TouchableOpacity>
              </View>

              <Text style={styles.saveModalTitle}>
                Save Contacts
              </Text>

              <Text style={styles.saveModalSubtitle}>
                {contacts.length}{" "}
                {contacts.length === 1 ? "contact" : "contacts"} are ready
                to be saved.
              </Text>

              <Text style={styles.saveQuestion}>
                Where do you want to save them?
              </Text>

              {/* General */}
              <TouchableOpacity
                activeOpacity={0.82}
                disabled={saving}
                style={[
                  styles.saveOption,
                  selectedFolderId === null &&
                    styles.saveOptionActive,
                ]}
                onPress={() => setSelectedFolderId(null)}
              >
                <View
                  style={[
                    styles.saveOptionIcon,
                    selectedFolderId === null &&
                      styles.saveOptionIconActive,
                  ]}
                >
                  <Ionicons
                    name="people-outline"
                    size={22}
                    color={
                      selectedFolderId === null
                        ? "#09A84E"
                        : "#727B76"
                    }
                  />
                </View>

                <View style={styles.saveOptionContent}>
                  <Text style={styles.saveOptionTitle}>
                    General
                  </Text>

                  <Text style={styles.saveOptionSubtitle}>
                    Save without a folder
                  </Text>
                </View>

                <View
                  style={[
                    styles.radioOuter,
                    selectedFolderId === null &&
                      styles.radioOuterActive,
                  ]}
                >
                  {selectedFolderId === null && (
                    <View style={styles.radioInner} />
                  )}
                </View>
              </TouchableOpacity>

              {/* Folder heading */}
              <Text style={styles.folderSectionTitle}>
                SAVE IN FOLDER
              </Text>

              {folders.length > 0 ? (
                <FlatList
                  data={folders}
                  keyExtractor={(item) => item.id}
                  showsVerticalScrollIndicator={false}
                  style={styles.folderList}
                  contentContainerStyle={{
                    paddingBottom: 4,
                  }}
                  renderItem={({ item }) => {
                    const active =
                      selectedFolderId === item.id;

                    return (
                      <TouchableOpacity
                        activeOpacity={0.82}
                        disabled={saving}
                        style={[
                          styles.saveOption,
                          active && styles.saveOptionActive,
                        ]}
                        onPress={() =>
                          setSelectedFolderId(item.id)
                        }
                      >
                        <View
                          style={[
                            styles.saveOptionIcon,
                            active &&
                              styles.saveOptionIconActive,
                          ]}
                        >
                          <Ionicons
                            name="folder-outline"
                            size={22}
                            color={
                              active
                                ? "#09A84E"
                                : "#727B76"
                            }
                          />
                        </View>

                        <View
                          style={styles.saveOptionContent}
                        >
                          <Text
                            style={styles.saveOptionTitle}
                            numberOfLines={1}
                          >
                            {item.name}
                          </Text>

                          <Text
                            style={styles.saveOptionSubtitle}
                          >
                            Save all contacts here
                          </Text>
                        </View>

                        <View
                          style={[
                            styles.radioOuter,
                            active &&
                              styles.radioOuterActive,
                          ]}
                        >
                          {active && (
                            <View
                              style={styles.radioInner}
                            />
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  }}
                />
              ) : (
                <View style={styles.noFolderBox}>
                  <Ionicons
                    name="folder-open-outline"
                    size={23}
                    color="#09A84E"
                  />

                  <View style={styles.noFolderContent}>
                    <Text style={styles.noFolderTitle}>
                      No folders created
                    </Text>

                    <Text style={styles.noFolderText}>
                      Create a folder from Saved Contacts first.
                    </Text>
                  </View>
                </View>
              )}

              <TouchableOpacity
                activeOpacity={0.85}
                disabled={saving}
                style={[
                  styles.finalSaveButton,
                  saving && styles.disabledButton,
                ]}
                onPress={handleConfirmSaveContacts}
              >
                {saving ? (
                  <ActivityIndicator
                    size="small"
                    color="#FFFFFF"
                  />
                ) : (
                  <>
                    <Ionicons
                      name="checkmark-circle-outline"
                      size={21}
                      color="#FFFFFF"
                    />

                    <Text style={styles.finalSaveText}>
                      Save All ({contacts.length})
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