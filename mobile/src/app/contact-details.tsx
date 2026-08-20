import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
  Modal,
  ActivityIndicator,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

import {
  getFolders,
  setContactFolders,
  FolderItem,
} from "../services/database";

type ContactData = {
  id?: string;
  folderIds?: string[];
  name?: string;
  designation?: string;
  company?: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
  country?: string;
};

type DetailItemProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  value?: string;
  iconColor: string;
  iconBackground: string;
  onPress?: () => void;
};

const isAvailable = (value?: string) => {
  return Boolean(
    value &&
      value.trim() &&
      value.trim().toLowerCase() !== "not available"
  );
};

export default function ContactDetailsScreen() {
  const insets = useSafeAreaInsets();

  const contact: ContactData =
    (globalThis as any).selectedContact || {};

  const [folders, setFolders] = useState<
    FolderItem[]
  >([]);
  const [showMoveModal, setShowMoveModal] =
    useState(false);
  const [selectedFolderIds, setSelectedFolderIds] =
    useState<string[]>([]);
  const [savingFolders, setSavingFolders] =
    useState(false);
  const [loadingFolders, setLoadingFolders] =
    useState(false);

  const canMove = Boolean(contact.id);

  const currentFolders = folders.filter(
    (folder) =>
      (contact.folderIds || []).includes(
        folder.id
      )
  );

  const handleOpenMoveModal = async () => {
    if (!canMove) {
      Alert.alert(
        "Unable to Move",
        "This contact cannot be moved. Please open it from your saved contacts."
      );
      return;
    }

    setSelectedFolderIds([
      ...(contact.folderIds || []),
    ]);

    setShowMoveModal(true);
    setLoadingFolders(true);

    try {
      const data = await getFolders();
      setFolders(data);
    } catch (error) {
      console.error(
        "Failed to load folders:",
        error
      );
      setFolders([]);
    } finally {
      setLoadingFolders(false);
    }
  };

  const toggleFolder = (folderId: string) => {
    setSelectedFolderIds((prev) =>
      prev.includes(folderId)
        ? prev.filter((id) => id !== folderId)
        : [...prev, folderId]
    );
  };

  const handleSaveFolders = async () => {
    if (!contact.id || savingFolders) {
      return;
    }

    setSavingFolders(true);

    try {
      await setContactFolders(
        contact.id,
        selectedFolderIds
      );

      const updatedContact = {
        ...contact,
        folderIds: selectedFolderIds,
      };

      (globalThis as any).selectedContact =
        updatedContact;

      setShowMoveModal(false);

      const addedCount =
        selectedFolderIds.length;

      Alert.alert(
        addedCount > 0
          ? "Contact Added to Folders"
          : "Contact Moved to My Cards",
        addedCount > 0
          ? `"${contact.name ||
              "Contact"}" is now in ${addedCount} ${
              addedCount === 1
                ? "folder"
                : "folders"
            }.`
          : `"${contact.name ||
              "Contact"}" is back in My Cards.`
      );
    } catch (error: any) {
      console.error(
        "Save folder error:",
        error
      );

      Alert.alert(
        "Update Failed",
        error?.message ||
          "Unable to update the contact. Please try again."
      );
    } finally {
      setSavingFolders(false);
    }
  };

  const name = isAvailable(contact.name)
    ? contact.name!.trim()
    : "Unknown Contact";

  const designation = isAvailable(contact.designation)
    ? contact.designation!.trim()
    : "No designation available";

  const company = isAvailable(contact.company)
    ? contact.company!.trim()
    : "";

  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0))
    .join("")
    .toUpperCase();

  const openLink = async (
    url: string,
    unavailableMessage: string
  ) => {
    try {
      const supported = await Linking.canOpenURL(url);

      if (!supported) {
        Alert.alert("Unable to Open", unavailableMessage);
        return;
      }

      await Linking.openURL(url);
    } catch (error) {
      console.error("Contact action error:", error);

      Alert.alert("Unable to Open", unavailableMessage);
    }
  };

  const openPhone = () => {
    if (!isAvailable(contact.phone)) {
      Alert.alert(
        "Phone Unavailable",
        "No phone number is saved for this contact."
      );
      return;
    }

    const phone = contact.phone!.replace(/\s+/g, "");

    openLink(
      `tel:${phone}`,
      "The phone dialer could not be opened."
    );
  };

  const openEmail = () => {
    if (!isAvailable(contact.email)) {
      Alert.alert(
        "Email Unavailable",
        "No email address is saved for this contact."
      );
      return;
    }

    openLink(
      `mailto:${contact.email}`,
      "Your email application could not be opened."
    );
  };

  const openWebsite = () => {
    if (!isAvailable(contact.website)) {
      Alert.alert(
        "Website Unavailable",
        "No website is saved for this contact."
      );
      return;
    }

    let url = contact.website!.trim();

    if (!/^https?:\/\//i.test(url)) {
      url = `https://${url}`;
    }

    openLink(
      url,
      "The website could not be opened."
    );
  };

  const DetailItem = ({
    icon,
    title,
    value,
    iconColor,
    iconBackground,
    onPress,
  }: DetailItemProps) => {
    const available = isAvailable(value);

    const content = (
      <View style={styles.detailRow}>
        <View
          style={[
            styles.detailIcon,
            {
              backgroundColor: iconBackground,
            },
          ]}
        >
          <Ionicons
            name={icon}
            size={20}
            color={iconColor}
          />
        </View>

        <View style={styles.detailContent}>
          <Text style={styles.detailLabel}>
            {title}
          </Text>

          <Text
            selectable
            style={[
              styles.detailValue,
              !available && styles.unavailableValue,
            ]}
          >
            {available
              ? value!.trim()
              : "Not available"}
          </Text>
        </View>

        {available && onPress && (
          <View style={styles.rowAction}>
            <Ionicons
              name="open-outline"
              size={18}
              color="#09A84E"
            />
          </View>
        )}
      </View>
    );

    if (available && onPress) {
      return (
        <TouchableOpacity
          activeOpacity={0.82}
          onPress={onPress}
        >
          {content}
        </TouchableOpacity>
      );
    }

    return content;
  };

  const quickActions = [
    {
      title: "Call",
      subtitle: "Phone",
      icon: "call" as const,
      available: isAvailable(contact.phone),
      onPress: openPhone,
    },
    {
      title: "Email",
      subtitle: "Message",
      icon: "mail" as const,
      available: isAvailable(contact.email),
      onPress: openEmail,
    },
    {
      title: "Website",
      subtitle: "Open link",
      icon: "globe" as const,
      available: isAvailable(contact.website),
      onPress: openWebsite,
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingBottom: 28 + insets.bottom,
            },
          ]}
        >
          <View style={styles.header}>
            <TouchableOpacity
              activeOpacity={0.75}
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Ionicons
                name="arrow-back"
                size={22}
                color="#20262C"
              />
            </TouchableOpacity>

            <View style={styles.headerText}>
              <Text style={styles.headerTitle}>
                Contact Details
              </Text>

              <Text style={styles.headerSubtitle}>
                View saved contact information
              </Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.75}
              style={styles.headerMoveButton}
              onPress={handleOpenMoveModal}
            >
              <View style={styles.folderMoveIcon}>
                <Ionicons
                  name="folder-outline"
                  size={23}
                  color="#09A84E"
                />

                <View style={styles.folderMoveArrow}>
                  <Ionicons
                    name="arrow-up"
                    size={11}
                    color="#FFFFFF"
                  />
                </View>
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.profileCard}>
            <View style={styles.avatarOuter}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {initials || "?"}
                </Text>
              </View>

              <View style={styles.savedBadge}>
                <Ionicons
                  name="checkmark"
                  size={14}
                  color="#FFFFFF"
                />
              </View>
            </View>

            <Text
              numberOfLines={2}
              style={styles.name}
            >
              {name}
            </Text>

            <Text
              numberOfLines={2}
              style={styles.designation}
            >
              {designation}
            </Text>

            {company ? (
              <View style={styles.companyBadge}>
                <Ionicons
                  name="business-outline"
                  size={14}
                  color="#078E42"
                />

                <Text
                  numberOfLines={1}
                  style={styles.company}
                >
                  {company}
                </Text>
              </View>
            ) : null}
          </View>

          <View style={styles.actionRow}>
            {quickActions.map((item) => (
              <TouchableOpacity
                key={item.title}
                activeOpacity={0.82}
                disabled={!item.available}
                style={[
                  styles.actionButton,
                  !item.available &&
                    styles.disabledAction,
                ]}
                onPress={item.onPress}
              >
                <View
                  style={[
                    styles.actionIcon,
                    !item.available &&
                      styles.disabledActionIcon,
                  ]}
                >
                  <Ionicons
                    name={item.icon}
                    size={22}
                    color={
                      item.available
                        ? "#09A84E"
                        : "#A7ADB2"
                    }
                  />
                </View>

                <Text
                  style={[
                    styles.actionTitle,
                    !item.available &&
                      styles.disabledActionText,
                  ]}
                >
                  {item.title}
                </Text>

                <Text
                  style={[
                    styles.actionSubtitle,
                    !item.available &&
                      styles.disabledActionText,
                  ]}
                >
                  {item.available
                    ? item.subtitle
                    : "Unavailable"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Personal Information
            </Text>

            <Text style={styles.sectionSubtitle}>
              Basic information extracted from the business card
            </Text>
          </View>

          <View style={styles.detailsCard}>
            <DetailItem
              icon="person-outline"
              title="Full Name"
              value={contact.name}
              iconColor="#09A84E"
              iconBackground="#EAF8F0"
            />

            <View style={styles.divider} />

            <DetailItem
              icon="ribbon-outline"
              title="Designation"
              value={contact.designation}
              iconColor="#7056B8"
              iconBackground="#F1EDFF"
            />

            <View style={styles.divider} />

            <DetailItem
              icon="briefcase-outline"
              title="Company"
              value={contact.company}
              iconColor="#EFA300"
              iconBackground="#FFF5DE"
            />
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Contact Information
            </Text>

            <Text style={styles.sectionSubtitle}>
              Tap available details to open them
            </Text>
          </View>

          <View style={styles.detailsCard}>
            <DetailItem
              icon="call-outline"
              title="Phone Number"
              value={contact.phone}
              iconColor="#09A84E"
              iconBackground="#EAF8F0"
              onPress={openPhone}
            />

            <View style={styles.divider} />

            <DetailItem
              icon="mail-outline"
              title="Email Address"
              value={contact.email}
              iconColor="#4B7BEC"
              iconBackground="#EEF3FF"
              onPress={openEmail}
            />

            <View style={styles.divider} />

            <DetailItem
              icon="globe-outline"
              title="Website"
              value={contact.website}
              iconColor="#7056B8"
              iconBackground="#F1EDFF"
              onPress={openWebsite}
            />
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Location
            </Text>

            <Text style={styles.sectionSubtitle}>
              Address information saved for this contact
            </Text>
          </View>

          <View style={styles.detailsCard}>
            <DetailItem
              icon="location-outline"
              title="Address"
              value={contact.address}
              iconColor="#ED5447"
              iconBackground="#FFF0EE"
            />

            <View style={styles.divider} />

            <DetailItem
              icon="flag-outline"
              title="Country"
              value={contact.country}
              iconColor="#EFA300"
              iconBackground="#FFF5DE"
            />
          </View>
        </ScrollView>

        {/* Move to Folder Modal */}
        <Modal
          visible={showMoveModal}
          transparent
          animationType="slide"
          onRequestClose={() =>
            setShowMoveModal(false)
          }
        >
          <View style={styles.moveOverlay}>
            <View style={styles.moveModal}>
              <View style={styles.moveModalHeader}>
                <View style={styles.moveModalHeaderText}>
                  <Text style={styles.moveModalTitle}>
                    Add to Folders
                  </Text>

                  <Text
                    numberOfLines={2}
                    style={styles.moveModalSubtitle}
                  >
                    {currentFolders.length > 0
                      ? `Currently in: ${currentFolders
                          .map((f) => f.name)
                          .join(", ")}`
                      : "Currently in My Cards"}
                  </Text>
                </View>

                <TouchableOpacity
                  activeOpacity={0.7}
                  style={styles.moveModalCloseButton}
                  onPress={() =>
                    setShowMoveModal(false)
                  }
                >
                  <Ionicons
                    name="close"
                    size={21}
                    color="#737B82"
                  />
                </TouchableOpacity>
              </View>

              {loadingFolders ? (
                <View style={styles.moveModalLoader}>
                  <ActivityIndicator
                    size="large"
                    color="#09A84E"
                  />
                </View>
              ) : folders.length === 0 ? (
                <View style={styles.moveNoFolders}>
                  <View style={styles.moveNoFoldersIcon}>
                    <Ionicons
                      name="folder-open-outline"
                      size={35}
                      color="#09A84E"
                    />
                  </View>

                  <Text style={styles.moveNoFoldersTitle}>
                    No folders yet
                  </Text>

                  <Text style={styles.moveNoFoldersText}>
                    Create a folder in the
                    "My Cards" screen first.
                  </Text>
                </View>
              ) : (
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  style={styles.moveFolderList}
                  contentContainerStyle={{
                    paddingBottom: 5,
                  }}
                >
                  <TouchableOpacity
                    activeOpacity={0.82}
                    style={[
                      styles.moveFolderItem,
                      selectedFolderIds.length === 0 &&
                        styles.moveFolderItemActive,
                    ]}
                    disabled={savingFolders}
                    onPress={() =>
                      setSelectedFolderIds([])
                    }
                  >
                    <View
                      style={[
                        styles.moveFolderItemIcon,
                        selectedFolderIds.length === 0 &&
                          styles.moveFolderItemIconActive,
                      ]}
                    >
                      <Ionicons
                        name={
                          selectedFolderIds.length === 0
                            ? "checkbox"
                            : "square-outline"
                        }
                        size={22}
                        color={
                          selectedFolderIds.length === 0
                            ? "#FFFFFF"
                            : "#09A84E"
                        }
                      />
                    </View>

                    <View style={styles.moveFolderItemInfo}>
                      <Text
                        numberOfLines={1}
                        style={styles.moveFolderItemName}
                      >
                        General
                      </Text>

                      <Text style={styles.moveFolderItemDate}>
                        {selectedFolderIds.length === 0
                          ? "Saved in My Cards, outside folders"
                          : "Tap to save outside folders"}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {folders.map((folder) => {
                    const isChecked =
                      selectedFolderIds.includes(
                        folder.id
                      );

                    return (
                      <TouchableOpacity
                        key={folder.id}
                        activeOpacity={0.82}
                        style={[
                          styles.moveFolderItem,
                          isChecked && styles.moveFolderItemActive,
                        ]}
                        disabled={savingFolders}
                        onPress={() =>
                          toggleFolder(folder.id)
                        }
                      >
                        <View
                          style={[
                            styles.moveFolderItemIcon,
                            isChecked && styles.moveFolderItemIconActive,
                          ]}
                        >
                          <Ionicons
                            name={
                              isChecked
                                ? "checkbox"
                                : "square-outline"
                            }
                            size={22}
                            color={
                              isChecked
                                ? "#FFFFFF"
                                : "#09A84E"
                            }
                          />
                        </View>

                        <View style={styles.moveFolderItemInfo}>
                          <Text
                            numberOfLines={1}
                            style={styles.moveFolderItemName}
                          >
                            {folder.name}
                          </Text>

                          <Text style={styles.moveFolderItemDate}>
                            {isChecked
                              ? "Added to this folder"
                              : "Tap to add to this folder"}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}

              <View style={styles.moveModalFooter}>
                <TouchableOpacity
                  activeOpacity={0.86}
                  style={[
                    styles.moveModalSaveButton,
                    savingFolders && styles.moveModalSaveDisabled,
                  ]}
                  disabled={savingFolders}
                  onPress={handleSaveFolders}
                >
                  {savingFolders ? (
                    <ActivityIndicator
                      size="small"
                      color="#FFFFFF"
                    />
                  ) : (
                    <>
                      <Ionicons
                        name="checkmark-circle-outline"
                        size={20}
                        color="#FFFFFF"
                      />

                      <Text style={styles.moveModalSaveText}>
                        Save Changes
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
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

  headerTitle: {
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

  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  headerMoveButton: {
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

  folderMoveIcon: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },

  folderMoveArrow: {
    position: "absolute",
    top: -2,
    right: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#09A84E",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },

  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: "#EAF8F0",
    alignItems: "center",
    justifyContent: "center",
  },

  profileCard: {
    marginTop: 10,
    paddingHorizontal: 20,
    paddingVertical: 25,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E7ECE9",
    alignItems: "center",

    shadowColor: "#17261D",
    shadowOpacity: 0.06,
    shadowRadius: 11,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 3,
  },

  avatarOuter: {
    position: "relative",
  },

  avatar: {
    width: 88,
    height: 88,
    borderRadius: 28,
    backgroundColor: "#EAF8F0",
    borderWidth: 1,
    borderColor: "#D8F0E2",
    alignItems: "center",
    justifyContent: "center",
  },

  avatarText: {
    color: "#09A84E",
    fontSize: 31,
    fontWeight: "900",
  },

  savedBadge: {
    position: "absolute",
    right: -4,
    bottom: -2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#09A84E",
    borderWidth: 3,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },

  name: {
    marginTop: 15,
    color: "#20262C",
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
  },

  designation: {
    marginTop: 6,
    color: "#7E878E",
    fontSize: 13.5,
    lineHeight: 19,
    fontWeight: "600",
    textAlign: "center",
  },

  companyBadge: {
    maxWidth: "85%",
    minHeight: 32,
    marginTop: 12,
    paddingHorizontal: 11,
    borderRadius: 11,
    backgroundColor: "#EAF8F0",
    flexDirection: "row",
    alignItems: "center",
  },

  company: {
    flexShrink: 1,
    marginLeft: 6,
    color: "#078E42",
    fontSize: 12,
    fontWeight: "800",
  },

  actionRow: {
    marginTop: 16,
    flexDirection: "row",
    justifyContent: "space-between",
  },

  actionButton: {
    width: "31.5%",
    minHeight: 118,
    paddingHorizontal: 7,
    paddingVertical: 14,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E7ECE9",
    alignItems: "center",
    justifyContent: "center",

    shadowColor: "#17261D",
    shadowOpacity: 0.045,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    elevation: 2,
  },

  disabledAction: {
    backgroundColor: "#F4F6F5",
    borderColor: "#ECEFED",
    shadowOpacity: 0,
    elevation: 0,
  },

  actionIcon: {
    width: 45,
    height: 45,
    borderRadius: 15,
    backgroundColor: "#EAF8F0",
    alignItems: "center",
    justifyContent: "center",
  },

  disabledActionIcon: {
    backgroundColor: "#E9ECEA",
  },

  actionTitle: {
    marginTop: 9,
    color: "#242A30",
    fontSize: 13.5,
    fontWeight: "800",
    textAlign: "center",
  },

  actionSubtitle: {
    marginTop: 3,
    color: "#90989E",
    fontSize: 10.5,
    fontWeight: "500",
    textAlign: "center",
  },

  disabledActionText: {
    color: "#A0A7AC",
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
    lineHeight: 17,
    fontWeight: "500",
  },

  detailsCard: {
    paddingHorizontal: 15,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
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

  detailRow: {
    minHeight: 77,
    paddingVertical: 13,
    flexDirection: "row",
    alignItems: "center",
  },

  detailIcon: {
    width: 43,
    height: 43,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  detailContent: {
    flex: 1,
    marginLeft: 12,
    paddingRight: 8,
  },

  detailLabel: {
    color: "#8A9299",
    fontSize: 11.5,
    fontWeight: "600",
  },

  detailValue: {
    marginTop: 4,
    color: "#252B31",
    fontSize: 13.5,
    lineHeight: 19,
    fontWeight: "800",
  },

  unavailableValue: {
    color: "#A0A7AC",
    fontWeight: "600",
  },

  rowAction: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: "#EAF8F0",
    alignItems: "center",
    justifyContent: "center",
  },

  divider: {
    height: 1,
    marginLeft: 55,
    backgroundColor: "#EDF0EE",
  },

  moveOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.38)",
    justifyContent: "flex-end",
  },

  moveModal: {
    width: "100%",
    maxHeight: "72%",
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 30,
  },

  moveModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  moveModalHeaderText: {
    flex: 1,
    marginRight: 12,
  },

  moveModalTitle: {
    color: "#171C21",
    fontSize: 20,
    fontWeight: "800",
  },

  moveModalSubtitle: {
    marginTop: 4,
    color: "#858D95",
    fontSize: 12.5,
    fontWeight: "500",
  },

  moveModalCloseButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F3F5F4",
    alignItems: "center",
    justifyContent: "center",
  },

  moveModalLoader: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 55,
  },

  moveNoFolders: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 42,
  },

  moveNoFoldersIcon: {
    width: 70,
    height: 70,
    borderRadius: 22,
    backgroundColor: "#EAF8F0",
    alignItems: "center",
    justifyContent: "center",
  },

  moveNoFoldersTitle: {
    marginTop: 14,
    color: "#20262C",
    fontSize: 17,
    fontWeight: "800",
  },

  moveNoFoldersText: {
    marginTop: 6,
    color: "#858D95",
    fontSize: 13,
    textAlign: "center",
  },

  moveFolderList: {
    marginTop: 14,
  },

  moveFolderItem: {
    minHeight: 66,
    paddingHorizontal: 13,
    paddingVertical: 9,
    marginBottom: 10,
    borderRadius: 17,
    backgroundColor: "#F8FAF9",
    borderWidth: 1,
    borderColor: "#E8EDE9",
    flexDirection: "row",
    alignItems: "center",
  },

  moveFolderItemActive: {
    backgroundColor: "#EAF8F0",
    borderColor: "#BFE6CF",
  },

  moveFolderItemIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#EAF8F0",
    alignItems: "center",
    justifyContent: "center",
  },

  moveFolderItemIconActive: {
    backgroundColor: "#09A84E",
  },

  moveFolderItemInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 10,
  },

  moveFolderItemName: {
    color: "#20262C",
    fontSize: 15,
    fontWeight: "800",
  },

  moveFolderItemDate: {
    marginTop: 3,
    color: "#858D95",
    fontSize: 11.5,
    fontWeight: "500",
  },

  moveModalFooter: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#EDF0EE",
  },

  moveModalSaveButton: {
    height: 52,
    borderRadius: 16,
    backgroundColor: "#09AA4D",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",

    shadowColor: "#078A3E",
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    elevation: 3,
  },

  moveModalSaveDisabled: {
    opacity: 0.72,
  },

  moveModalSaveText: {
    marginLeft: 8,
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
});