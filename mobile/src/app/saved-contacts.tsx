import {
  useCallback,
  useMemo,
  useState,
} from "react";

import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Alert,
} from "react-native";

import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { Ionicons } from "@expo/vector-icons";
import * as Sharing from "expo-sharing";

import {
  router,
  useFocusEffect,
} from "expo-router";

import { exportContactsToExcel } from "../services/excelService";

import BottomNav from "@/components/BottomNav";

import {
  getContacts,
  getFolders,
  createFolder,
  setContactFolders,
  deleteContacts,
  FolderItem,
} from "../services/database";


/* =====================================================
   TYPES
===================================================== */

type ContactItem = {
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
  notes?: string;
  tags?: string[];
  updatedAt?: number;
  createdAt?: number;
};

/* =====================================================
   SCREEN
===================================================== */

export default function SavedContactsScreen() {
  const insets =
    useSafeAreaInsets();


  /* =====================================================
     CONTACTS
  ===================================================== */

  const [contacts, setContacts] =
    useState<ContactItem[]>([]);

  const [search, setSearch] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [selectionMode, setSelectionMode] =
    useState(false);

  const [selectedContactIds, setSelectedContactIds] =
    useState<string[]>([]);

  const [showBulkMoveModal, setShowBulkMoveModal] =
    useState(false);

  const [bulkMoving, setBulkMoving] =
    useState(false);

  const [showMenu, setShowMenu] =
    useState(false);


  /* =====================================================
     FOLDERS
  ===================================================== */

  const [folders, setFolders] =
    useState<FolderItem[]>([]);

  const [
    selectedFolderId,
    setSelectedFolderId,
  ] = useState<string | null>(
    null
  );

  const [
    longPressContact,
    setLongPressContact,
  ] = useState<ContactItem | null>(
    null
  );

  const [
    showMoveContactModal,
    setShowMoveContactModal,
  ] = useState(false);

  const [
    selectedFolderIds,
    setSelectedFolderIds,
  ] = useState<string[]>(
    []
  );

  const [
    savingFolders,
    setSavingFolders,
  ] = useState(false);

  const [
    loadingMoveFolders,
    setLoadingMoveFolders,
  ] = useState(false);

  const [
    showCreateFolder,
    setShowCreateFolder,
  ] = useState(false);

  const [
    folderName,
    setFolderName,
  ] = useState("");


  /* =====================================================
     LOAD DATA
  ===================================================== */

  useFocusEffect(
    useCallback(() => {
      loadContacts();
      loadFolders();
    }, [])
  );


  const loadContacts =
    async () => {
      try {
        setLoading(true);

        const data =
          await getContacts();

        const normalizedData =
          Array.isArray(data)
            ? [...data]
            : [];

        setContacts(
          normalizedData
        );
      } catch (error) {
        console.error(
          "Failed to load contacts:",
          error
        );

        setContacts([]);
      } finally {
        setLoading(false);
      }
    };


  const loadFolders =
    async () => {
      try {
        const data =
          await getFolders();

        setFolders(data);
      } catch (error) {
        console.error(
          "Failed to load folders:",
          error
        );

        setFolders([]);
      }
    };


  /* =====================================================
     FILTER
  ===================================================== */

  const activeExportContacts = useMemo(() => {
    if (!selectedFolderId) {
      return contacts;
    }

    return contacts.filter((contact) =>
      (contact.folderIds || []).includes(selectedFolderId)
    );
  }, [contacts, selectedFolderId]);

  const filteredContacts =
    useMemo(() => {
      let data = [...contacts];

      if (selectedFolderId) {
        data = data.filter((item) =>
          (item.folderIds || []).includes(selectedFolderId)
        );
      }

      const keyword = search.trim().toLowerCase();

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
          item.notes,
          ...(Array.isArray(item.tags) ? item.tags : []),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return searchableText.includes(keyword);
      });
    }, [contacts, search, selectedFolderId]);


  /* =====================================================
     MULTI SELECT
  ===================================================== */

  const exitSelectionMode = () => {
    setSelectionMode(false);
    setSelectedContactIds([]);
  };

  const toggleContactSelection = (contact: ContactItem) => {
    if (!contact.id) {
      return;
    }

    setSelectedContactIds((prev) =>
      prev.includes(contact.id!)
        ? prev.filter((id) => id !== contact.id)
        : [...prev, contact.id!]
    );
  };

  const selectAllVisibleContacts = () => {
    const visibleIds = filteredContacts
      .map((contact) => contact.id)
      .filter(Boolean) as string[];

    setSelectedContactIds(visibleIds);
  };

  const handleStartSelection = (contact?: ContactItem) => {
    setSelectionMode(true);

    if (contact?.id) {
      setSelectedContactIds((prev) =>
        prev.includes(contact.id!)
          ? prev
          : [...prev, contact.id!]
      );
    }
  };


  /* =====================================================
     OPEN CONTACT
  ===================================================== */

  const handleOpenContact = (
    contact: ContactItem
  ) => {
    if (selectionMode) {
      toggleContactSelection(contact);
      return;
    }

    (
      globalThis as any
    ).selectedContact =
      contact;

    router.push(
      "/contact-details"
    );
  };


  /* =====================================================
     BULK MOVE + DELETE
  ===================================================== */

  const handleOpenBulkMove = async () => {
    if (selectedContactIds.length === 0 || bulkMoving) {
      return;
    }

    setShowBulkMoveModal(true);
    setSelectedFolderIds([]);
    setLoadingMoveFolders(true);

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
      setLoadingMoveFolders(false);
    }
  };

  const handleSaveBulkFolders = async () => {
    if (
      selectedContactIds.length === 0 ||
      bulkMoving
    ) {
      return;
    }

    setBulkMoving(true);

    try {
      await Promise.all(
        selectedContactIds.map((contactId) =>
          setContactFolders(
            contactId,
            selectedFolderIds
          )
        )
      );

      setShowBulkMoveModal(false);

      const movedCount =
        selectedContactIds.length;

      setSelectionMode(false);
      setSelectedContactIds([]);

      await loadContacts();

      Alert.alert(
        "Contacts Updated",
        `${movedCount} ${
          movedCount === 1
            ? "contact was"
            : "contacts were"
        } moved ${
          selectedFolderIds.length > 0
            ? "to the selected folder(s)."
            : "back to My Cards."
        }`
      );
    } catch (error: any) {
      console.error(
        "Bulk move error:",
        error
      );

      Alert.alert(
        "Update Failed",
        error?.message ||
          "Unable to move the selected contacts. Please try again."
      );
    } finally {
      setBulkMoving(false);
    }
  };

  const handleDeleteSelected = () => {
    if (selectedContactIds.length === 0) {
      return;
    }

    const count =
      selectedContactIds.length;

    Alert.alert(
      count === 1
        ? "Delete Contact?"
        : `Delete ${count} Contacts?`,
      count === 1
        ? "This contact will be permanently deleted from your saved contacts."
        : "These contacts will be permanently deleted from your saved contacts.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);

              await deleteContacts(
                selectedContactIds
              );

              setSelectionMode(false);
              setSelectedContactIds([]);

              await loadContacts();

              Alert.alert(
                "Deleted",
                `${count} ${
                  count === 1
                    ? "contact"
                    : "contacts"
                } deleted successfully.`
              );
            } catch (error: any) {
              console.error(
                "Delete contacts error:",
                error
              );

              Alert.alert(
                "Delete Failed",
                error?.message ||
                  "Unable to delete the selected contacts. Please try again."
              );
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };


  /* =====================================================
     LONG PRESS MOVE TO FOLDER
  ===================================================== */

  const handleLongPressContact = (
    contact: ContactItem
  ) => {
    if (selectionMode) {
      toggleContactSelection(contact);
      return;
    }

    handleStartSelection(contact);
  };


  const toggleFolder = (
    folderId: string
  ) => {
    setSelectedFolderIds(
      (prev) =>
        prev.includes(folderId)
          ? prev.filter(
              (id) =>
                id !== folderId
            )
          : [...prev, folderId]
    );
  };


  const handleSaveFolders =
    async () => {
      if (
        !longPressContact?.id ||
        savingFolders
      ) {
        return;
      }

      setSavingFolders(true);

      try {
        await setContactFolders(
          longPressContact.id,
          selectedFolderIds
        );

        setShowMoveContactModal(
          false
        );

        setLongPressContact(
          null
        );

        const addedCount =
          selectedFolderIds.length;

        Alert.alert(
          addedCount > 0
            ? "Contact Added to Folders"
            : "Contact Moved to My Cards",
          addedCount > 0
            ? `"${
                longPressContact.name ||
                "Contact"
              }" is now in ${addedCount} ${
                addedCount === 1
                  ? "folder"
                  : "folders"
              }.`
            : `"${
                longPressContact.name ||
                "Contact"
              }" is back in My Cards.`
        );

        await loadContacts();
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


  /* =====================================================
     CREATE FOLDER
  ===================================================== */

  const handleCreateFolder =
    async () => {
      const trimmedName =
        folderName.trim();


      if (!trimmedName) {
        return;
      }


      try {
        await createFolder(
          trimmedName
        );


        setFolderName("");

        setShowCreateFolder(
          false
        );


        await loadFolders();


        Alert.alert(
          "Folder Created",
          `"${trimmedName}" folder has been created.`
        );

      } catch (error: any) {

        Alert.alert(
          "Unable to Create Folder",
          error?.message ||
            "Something went wrong. Please try again."
        );

      }
    };


  /* =====================================================
     DIRECT EXCEL EXPORT
  ===================================================== */

  const handleDirectExcelExport = async () => {
    try {
      setShowMenu(false);

      const activeFolder = selectedFolderId
        ? folders.find(
            (folder) => folder.id === selectedFolderId
          )
        : null;

      // Export the contacts belonging to the currently active folder.
      // When "All" is active, export all saved contacts. Search is intentionally ignored.
      const exportContacts = selectedFolderId
        ? contacts.filter((contact) =>
            (contact.folderIds || []).includes(
              selectedFolderId
            )
          )
        : contacts;

      if (exportContacts.length === 0) {
        Alert.alert(
          "No Contacts",
          activeFolder
            ? `There are no contacts in "${activeFolder.name}".`
            : "There are no saved contacts to export."
        );
        return;
      }

      const fileUri = await exportContactsToExcel(
        exportContacts
      );

      if (!fileUri) {
        Alert.alert(
          "Export Failed",
          "Failed to generate the Excel file."
        );
        return;
      }

      const sharingAvailable =
        await Sharing.isAvailableAsync();

      if (!sharingAvailable) {
        Alert.alert(
          "Export Ready",
          "The Excel file was generated, but sharing is not available on this device."
        );
        return;
      }

      await Sharing.shareAsync(fileUri, {
        mimeType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        dialogTitle: activeFolder
          ? `Export ${activeFolder.name}`
          : "Export All Contacts",
        UTI:
          "org.openxmlformats.spreadsheetml.sheet",
      });
    } catch (error) {
      console.error(
        "Direct Excel export error:",
        error
      );

      Alert.alert(
        "Export Failed",
        "Unable to export the contacts to Excel. Please try again."
      );
    }
  };


  /* =====================================================
     CONTACT CARD
  ===================================================== */

  const renderContact = ({
    item,
  }: {
    item: ContactItem;
  }) => {

    const initial =
      item.name
        ?.trim()
        ?.charAt(0)
        ?.toUpperCase() ||
      "?";


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
        delayLongPress={400}
        onLongPress={() =>
          handleLongPressContact(
            item
          )
        }
        onPress={() =>
          handleOpenContact(
            item
          )
        }
      >

        {/* Selection Checkbox */}

        {selectionMode && (
          <View
            style={[
              styles.selectionCheckbox,
              selectedContactIds.includes(
                item.id || ""
              ) && styles.selectionCheckboxActive,
            ]}
          >
            <Ionicons
              name={
                selectedContactIds.includes(
                  item.id || ""
                )
                  ? "checkmark"
                  : "square-outline"
              }
              size={18}
              color={
                selectedContactIds.includes(
                  item.id || ""
                )
                  ? "#FFFFFF"
                  : "#09A84E"
              }
            />
          </View>
        )}

        {/* Avatar */}

        <View
          style={styles.avatar}
        >
          <Text
            style={
              styles.avatarText
            }
          >
            {initial}
          </Text>
        </View>


        {/* Information */}

        <View
          style={styles.info}
        >

          <Text
            style={styles.name}
            numberOfLines={1}
          >
            {item.name ||
              "Unknown Contact"}
          </Text>


          <Text
            style={
              styles.designation
            }
            numberOfLines={1}
          >
            {subtitle ||
              "No designation available"}
          </Text>


          <View
            style={
              styles.metaContainer
            }
          >

            {/* Phone */}

            {!!item.phone && (
              <View
                style={
                  styles.metaRow
                }
              >

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
                  style={
                    styles.metaText
                  }
                  numberOfLines={
                    1
                  }
                >
                  {item.phone}
                </Text>

              </View>
            )}


            {/* Email */}

            {!!item.email && (
              <View
                style={
                  styles.metaRow
                }
              >

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
                  style={
                    styles.metaText
                  }
                  numberOfLines={
                    1
                  }
                >
                  {item.email}
                </Text>

              </View>
            )}

          </View>

        </View>


        {/* Arrow */}

        <View
          style={
            styles.chevronButton
          }
        >
          <Ionicons
            name="chevron-forward"
            size={20}
            color="#AAB1B7"
          />
        </View>

      </TouchableOpacity>
    );
  };


  /* =====================================================
     RETURN
  ===================================================== */

  return (
    <SafeAreaView
      style={styles.safeArea}
    >

      <View
        style={styles.container}
      >


        {/* =================================================
            HEADER
        ================================================= */}

        <View
          style={styles.header}
        >

          <View
            style={styles.headerText}
          >

            <Text
              style={styles.title}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              Saved Contacts
            </Text>


            <Text
              style={styles.subtitle}
            >
              {
                filteredContacts.length
              }{" "}
              {
                filteredContacts.length ===
                1
                  ? "contact"
                  : "contacts"
              }
            </Text>

          </View>


          {selectionMode ? (
            <View style={styles.selectionHeaderActions}>
              <TouchableOpacity
                activeOpacity={0.82}
                style={styles.selectAllButton}
                onPress={() => {
                  const visibleCount =
                    filteredContacts.filter(
                      (contact) => contact.id
                    ).length;

                  if (
                    visibleCount > 0 &&
                    selectedContactIds.length ===
                      visibleCount
                  ) {
                    setSelectedContactIds([]);
                  } else {
                    selectAllVisibleContacts();
                  }
                }}
              >
                <Ionicons
                  name={
                    filteredContacts.length > 0 &&
                    selectedContactIds.length ===
                      filteredContacts.filter(
                        (contact) => contact.id
                      ).length
                      ? "checkbox"
                      : "square-outline"
                  }
                  size={20}
                  color="#09A84E"
                />
                <Text style={styles.selectAllText}>
                  {filteredContacts.length > 0 &&
                  selectedContactIds.length ===
                    filteredContacts.filter(
                      (contact) => contact.id
                    ).length
                    ? "Deselect"
                    : "Select All"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.82}
                style={styles.cancelSelectionButton}
                onPress={exitSelectionMode}
              >
                <Ionicons
                  name="close"
                  size={20}
                  color="#687078"
                />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              activeOpacity={0.82}
              style={styles.menuButton}
              onPress={() => setShowMenu(true)}
            >
              <Ionicons
                name="menu-outline"
                size={28}
                color="#20262C"
              />
            </TouchableOpacity>
          )}

        </View>


        {/* =================================================
            TOP MENU
        ================================================= */}

        <Modal
          visible={showMenu}
          transparent
          animationType="fade"
          onRequestClose={() => setShowMenu(false)}
        >
          <View style={styles.menuOverlay}>
            <TouchableOpacity
              activeOpacity={1}
              style={styles.menuBackdrop}
              onPress={() => setShowMenu(false)}
            />

            <View style={styles.menuCard}>
              <TouchableOpacity
                activeOpacity={0.78}
                style={styles.menuItem}
                onPress={() => {
                  setShowMenu(false);
                  handleStartSelection();
                }}
              >
                <View style={styles.menuItemIconGreen}>
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={19}
                    color="#09A84E"
                  />
                </View>

                <View style={styles.menuItemContent}>
                  <Text style={styles.menuItemTitle}>
                    Select
                  </Text>
                  <Text style={styles.menuItemSubtitle}>
                    Select multiple contacts
                  </Text>
                </View>
              </TouchableOpacity>

              <View style={styles.menuDivider} />

              <TouchableOpacity
                activeOpacity={0.78}
                style={styles.menuItem}
                onPress={() => {
                  setShowMenu(false);
                  setFolderName("");
                  setShowCreateFolder(true);
                }}
              >
                <View style={styles.menuItemIconPurple}>
                  <Ionicons
                    name="folder-open-outline"
                    size={19}
                    color="#7056B8"
                  />
                </View>

                <View style={styles.menuItemContent}>
                  <Text style={styles.menuItemTitle}>
                    Create New Folder
                  </Text>
                  <Text style={styles.menuItemSubtitle}>
                    Organize your contacts
                  </Text>
                </View>
              </TouchableOpacity>

            </View>
          </View>
        </Modal>


        {/* =================================================
            SEARCH
        ================================================= */}

        <View
          style={styles.searchBox}
        >

          <Ionicons
            name="search-outline"
            size={21}
            color="#8D959C"
          />


          <TextInput
            placeholder="Search contacts"
            placeholderTextColor="#A0A7AE"
            value={search}
            onChangeText={
              setSearch
            }
            style={
              styles.searchInput
            }
            returnKeyType="search"
          />


          {search.length >
          0 ? (

            <TouchableOpacity
              activeOpacity={0.7}
              style={
                styles.clearButton
              }
              onPress={() =>
                setSearch("")
              }
            >

              <Ionicons
                name="close-circle"
                size={21}
                color="#A7ADB3"
              />

            </TouchableOpacity>

          ) : null}

        </View>


        {/* =================================================
            FOLDER FILTERS
        ================================================= */}

        <View style={styles.folderSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.folderFilterContent}
            style={styles.folderFilterScroll}
          >
            <TouchableOpacity
              activeOpacity={0.82}
              style={[
                styles.folderFilterBtn,
                !selectedFolderId && styles.folderFilterBtnActive,
              ]}
              onPress={() => setSelectedFolderId(null)}
            >
              <Ionicons
                name="apps-outline"
                size={16}
                color={!selectedFolderId ? "#FFFFFF" : "#687078"}
              />
              <Text
                style={[
                  styles.folderFilterText,
                  !selectedFolderId && styles.folderFilterTextActive,
                ]}
              >
                All
              </Text>
            </TouchableOpacity>

            {folders.map((folder) => {
              const active = selectedFolderId === folder.id;

              return (
                <TouchableOpacity
                  key={folder.id}
                  activeOpacity={0.82}
                  style={[
                    styles.folderFilterBtn,
                    active && styles.folderFilterBtnActive,
                  ]}
                  onPress={() => setSelectedFolderId(folder.id)}
                >
                  <Ionicons
                    name="folder-outline"
                    size={16}
                    color={active ? "#FFFFFF" : "#EFA300"}
                  />
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.folderFilterText,
                      active && styles.folderFilterTextActive,
                    ]}
                  >
                    {folder.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* =================================================
            DOWNLOAD CARD
        ================================================= */}

        <TouchableOpacity
          activeOpacity={0.84}
          style={styles.downloadContactsCard}
          onPress={handleDirectExcelExport}
          disabled={activeExportContacts.length === 0}
        >
          <View style={styles.downloadContactsIcon}>
            <Ionicons
              name="download-outline"
              size={21}
              color={
                activeExportContacts.length === 0
                  ? "#A9B0B5"
                  : "#09A84E"
              }
            />
          </View>

          <View style={styles.downloadContactsContent}>
            <Text
              style={[
                styles.downloadContactsTitle,
                activeExportContacts.length === 0 &&
                  styles.downloadContactsTitleDisabled,
              ]}
            >
              Download Contacts
            </Text>
            <Text style={styles.downloadContactsSubtitle}>
              {activeExportContacts.length === 0
                ? "No contacts available"
                : selectedFolderId
                  ? `${activeExportContacts.length} ${
                      activeExportContacts.length === 1
                        ? "contact"
                        : "contacts"
                    } from ${
                      folders.find(
                        (folder) => folder.id === selectedFolderId
                      )?.name || "this folder"
                    }`
                  : `${activeExportContacts.length} ${
                      activeExportContacts.length === 1
                        ? "saved contact"
                        : "saved contacts"
                    }`}
            </Text>
          </View>

          <View style={styles.downloadContactsAction}>
            <Text
              style={[
                styles.downloadContactsActionText,
                activeExportContacts.length === 0 &&
                  styles.downloadContactsActionTextDisabled,
              ]}
            >
              Excel
            </Text>
            <Ionicons
              name="chevron-forward"
              size={17}
              color={
                activeExportContacts.length === 0
                  ? "#A9B0B5"
                  : "#09A84E"
              }
            />
          </View>
        </TouchableOpacity>

        {selectionMode && (
          <View style={styles.bulkActionBar}>
            <View style={styles.bulkSelectionInfo}>
              <View style={styles.bulkSelectionBadge}>
                <Text style={styles.bulkSelectionBadgeText}>
                  {selectedContactIds.length}
                </Text>
              </View>

              <Text style={styles.bulkSelectionText}>
                {selectedContactIds.length === 0
                  ? "Select contacts"
                  : selectedContactIds.length === 1
                    ? "1 contact selected"
                    : `${selectedContactIds.length} contacts selected`}
              </Text>
            </View>

            <View style={styles.bulkActionButtons}>
              <TouchableOpacity
                activeOpacity={0.82}
                disabled={selectedContactIds.length === 0}
                style={[
                  styles.bulkMoveButton,
                  selectedContactIds.length === 0 &&
                    styles.bulkActionDisabled,
                ]}
                onPress={handleOpenBulkMove}
              >
                <Ionicons
                  name="folder-open-outline"
                  size={19}
                  color="#FFFFFF"
                />
                <Text style={styles.bulkMoveButtonText}>
                  Move
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.82}
                disabled={selectedContactIds.length === 0}
                style={[
                  styles.bulkDeleteButton,
                  selectedContactIds.length === 0 &&
                    styles.bulkActionDisabled,
                ]}
                onPress={handleDeleteSelected}
              >
                <Ionicons
                  name="trash-outline"
                  size={19}
                  color="#FFFFFF"
                />
                <Text style={styles.bulkDeleteButtonText}>
                  Delete
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* =================================================
            CONTACT LIST
        ================================================= */}

        {loading ? (

          <View
            style={
              styles.loaderContainer
            }
          >

            <ActivityIndicator
              size="large"
              color="#09A84E"
            />

            <Text
              style={
                styles.loadingText
              }
            >
              Loading contacts...
            </Text>

          </View>

        ) : (

          <FlatList
            data={
              filteredContacts
            }

            keyExtractor={(
              item,
              index
            ) =>
              item.id ||
              `${
                item.email ||
                item.phone ||
                "contact"
              }-${index}`
            }

            renderItem={
              renderContact
            }

            showsVerticalScrollIndicator={
              false
            }

            keyboardShouldPersistTaps="handled"

            contentContainerStyle={[
              styles.listContent,
              {
                paddingBottom:
                  115 +
                  insets.bottom,
              },
              filteredContacts.length ===
                0 &&
                styles.emptyListContent,
            ]}


            ListEmptyComponent={

              <View
                style={
                  styles.emptyState
                }
              >

                <View
                  style={
                    styles.emptyIcon
                  }
                >

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


                <Text
                  style={
                    styles.emptyTitle
                  }
                >
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
                    activeOpacity={
                      0.84
                    }
                    style={
                      styles.scanButton
                    }
                    onPress={() =>
                      router.push(
                        "/scanner"
                      )
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


        {/* =================================================
            CREATE FOLDER MODAL
        ================================================= */}

        <Modal
          visible={
            showCreateFolder
          }
          transparent
          animationType="fade"
          onRequestClose={() => {

            setFolderName("");

            setShowCreateFolder(
              false
            );

          }}
        >

          <View
            style={
              styles.modalOverlay
            }
          >

            <View
              style={
                styles.folderModal
              }
            >

              <View
                style={
                  styles.folderModalHeader
                }
              >

                <View
                  style={
                    styles.folderModalIcon
                  }
                >

                    <Ionicons
                      name="folder-open-outline"
                      size={27}
                      color="#7056B8"
                    />

                </View>


                <TouchableOpacity
                  activeOpacity={0.7}
                  style={
                    styles.modalCloseButton
                  }
                  onPress={() => {

                    setFolderName("");

                    setShowCreateFolder(
                      false
                    );

                  }}
                >

                  <Ionicons
                    name="close"
                    size={21}
                    color="#737B82"
                  />

                </TouchableOpacity>

              </View>


              <Text
                style={
                  styles.folderModalTitle
                }
              >
                Create New Folder
              </Text>


              <Text
                style={
                  styles.folderModalSubtitle
                }
              >
                Organize your contacts
                into folders
              </Text>


              <TextInput
                placeholder="Folder name"
                placeholderTextColor="#A0A7AE"
                value={folderName}
                onChangeText={
                  setFolderName
                }
                style={
                  styles.folderInput
                }
                autoFocus
                maxLength={40}
              />


              <View
                style={
                  styles.folderModalActions
                }
              >

                <TouchableOpacity
                  activeOpacity={0.8}
                  style={
                    styles.cancelFolderButton
                  }
                  onPress={() => {

                    setFolderName("");

                    setShowCreateFolder(
                      false
                    );

                  }}
                >

                  <Text
                    style={
                      styles.cancelFolderText
                    }
                  >
                    Cancel
                  </Text>

                </TouchableOpacity>


                <TouchableOpacity
                  activeOpacity={0.8}
                  style={[
                    styles.createFolderConfirmButton,
                    !folderName.trim() &&
                      styles.createFolderDisabled,
                  ]}
                  disabled={
                    !folderName.trim()
                  }
                  onPress={
                    handleCreateFolder
                  }
                >

                  <Text
                    style={
                      styles.createFolderConfirmText
                    }
                  >
                    Create Folder
                  </Text>

                </TouchableOpacity>

              </View>

            </View>

          </View>

        </Modal>


        {/* =================================================
            BULK MOVE MODAL
        ================================================= */}

        <Modal
          visible={showBulkMoveModal}
          transparent
          animationType="slide"
          onRequestClose={() => {
            if (!bulkMoving) {
              setShowBulkMoveModal(false);
            }
          }}
        >
          <View style={styles.moveOverlay}>
            <View style={styles.moveModal}>
              <View style={styles.moveModalHeader}>
                <View style={styles.moveModalIcon}>
                  <Ionicons
                    name="move-outline"
                    size={26}
                    color="#09AA4D"
                  />
                </View>

                <View style={styles.moveModalTitleWrap}>
                  <Text
                    style={styles.moveModalTitle}
                    numberOfLines={1}
                  >
                    Move {selectedContactIds.length}{" "}
                    {selectedContactIds.length === 1
                      ? "Contact"
                      : "Contacts"}
                  </Text>

                  <Text style={styles.moveModalSubtitle}>
                    Choose folders for all selected contacts
                  </Text>
                </View>

                <TouchableOpacity
                  activeOpacity={0.7}
                  style={styles.moveModalCloseButton}
                  disabled={bulkMoving}
                  onPress={() =>
                    setShowBulkMoveModal(false)
                  }
                >
                  <Ionicons
                    name="close"
                    size={21}
                    color="#737B82"
                  />
                </TouchableOpacity>
              </View>

              {loadingMoveFolders ? (
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
                    Create a folder first to move contacts into it.
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
                    disabled={bulkMoving}
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
                          ? "Save in My Cards, outside folders"
                          : "Tap to clear folder selection"}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {folders.map((folder) => {
                    const isChecked =
                      selectedFolderIds.includes(folder.id);

                    return (
                      <TouchableOpacity
                        key={folder.id}
                        activeOpacity={0.82}
                        style={[
                          styles.moveFolderItem,
                          isChecked &&
                            styles.moveFolderItemActive,
                        ]}
                        disabled={bulkMoving}
                        onPress={() =>
                          toggleFolder(folder.id)
                        }
                      >
                        <View
                          style={[
                            styles.moveFolderItemIcon,
                            isChecked &&
                              styles.moveFolderItemIconActive,
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
                              ? "Selected for all contacts"
                              : "Tap to select for all contacts"}
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
                    bulkMoving &&
                      styles.moveModalSaveDisabled,
                  ]}
                  disabled={
                    bulkMoving ||
                    loadingMoveFolders
                  }
                  onPress={handleSaveBulkFolders}
                >
                  {bulkMoving ? (
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
                        Apply to Selected
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>


        {/* =================================================
            MOVE CONTACT MODAL
        ================================================= */}

        <Modal
          visible={
            showMoveContactModal
          }
          transparent
          animationType="slide"
          onRequestClose={() =>
            setShowMoveContactModal(
              false
            )
          }
        >

          <View
            style={
              styles.moveOverlay
            }
          >

            <View
              style={
                styles.moveModal
              }
            >

              {/* HEADER */}

              <View
                style={
                  styles.moveModalHeader
                }
              >

                <View
                  style={
                    styles.moveModalIcon
                  }
                >

                  <Ionicons
                    name="move-outline"
                    size={26}
                    color="#09AA4D"
                  />

                </View>


                <View
                  style={
                    styles.moveModalTitleWrap
                  }
                >

                  <Text
                    style={
                      styles.moveModalTitle
                    }
                    numberOfLines={1}
                  >
                    {longPressContact?.name ||
                      "Contact"}
                  </Text>


                  <Text
                    style={
                      styles.moveModalSubtitle
                    }
                  >
                    Move to a folder
                  </Text>

                </View>


                <TouchableOpacity
                  activeOpacity={0.7}
                  style={
                    styles.moveModalCloseButton
                  }
                  onPress={() =>
                    setShowMoveContactModal(
                      false
                    )
                  }
                >

                  <Ionicons
                    name="close"
                    size={21}
                    color="#737B82"
                  />

                </TouchableOpacity>

              </View>


              {/* FOLDERS */}

              {loadingMoveFolders ? (

                <View
                  style={
                    styles.moveModalLoader
                  }
                >

                  <ActivityIndicator
                    size="large"
                    color="#09A84E"
                  />

                </View>

              ) : folders.length ===
                0 ? (

                <View
                  style={
                    styles.moveNoFolders
                  }
                >

                  <View
                    style={
                      styles.moveNoFoldersIcon
                    }
                  >

                    <Ionicons
                      name="folder-open-outline"
                      size={35}
                      color="#09A84E"
                    />

                  </View>


                  <Text
                    style={
                      styles.moveNoFoldersTitle
                    }
                  >
                    No folders yet
                  </Text>


                  <Text
                    style={
                      styles.moveNoFoldersText
                    }
                  >
                    Create a folder first to
                    move contacts into it.
                  </Text>

                </View>

              ) : (

                <ScrollView
                  showsVerticalScrollIndicator={
                    false
                  }
                  style={
                    styles.moveFolderList
                  }
                  contentContainerStyle={{
                    paddingBottom: 5,
                  }}
                >

                  {/* GENERAL OPTION */}

                  <TouchableOpacity
                    activeOpacity={0.82}
                    style={[
                      styles.moveFolderItem,
                      selectedFolderIds.length ===
                        0 &&
                        styles.moveFolderItemActive,
                    ]}
                    disabled={savingFolders}
                    onPress={() =>
                      setSelectedFolderIds(
                        []
                      )
                    }
                  >

                    <View
                      style={[
                        styles.moveFolderItemIcon,
                        selectedFolderIds.length ===
                          0 &&
                          styles.moveFolderItemIconActive,
                      ]}
                    >

                      <Ionicons
                        name={
                          selectedFolderIds.length ===
                          0
                            ? "checkbox"
                            : "square-outline"
                        }
                        size={22}
                        color={
                          selectedFolderIds.length ===
                          0
                            ? "#FFFFFF"
                            : "#09A84E"
                        }
                      />

                    </View>


                    <View
                      style={
                        styles.moveFolderItemInfo
                      }
                    >

                      <Text
                        numberOfLines={1}
                        style={
                          styles.moveFolderItemName
                        }
                      >
                        General
                      </Text>


                      <Text
                        style={
                          styles.moveFolderItemDate
                        }
                      >
                        {selectedFolderIds.length ===
                        0
                          ? "Saved in My Cards, outside folders"
                          : "Tap to save outside folders"}
                      </Text>

                    </View>

                  </TouchableOpacity>


                  {/* FOLDER ITEMS */}

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
                          isChecked &&
                            styles.moveFolderItemActive,
                        ]}
                        disabled={
                          savingFolders
                        }
                        onPress={() =>
                          toggleFolder(
                            folder.id
                          )
                        }
                      >

                        <View
                          style={[
                            styles.moveFolderItemIcon,
                            isChecked &&
                              styles.moveFolderItemIconActive,
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


                        <View
                          style={
                            styles.moveFolderItemInfo
                          }
                        >

                          <Text
                            numberOfLines={1}
                            style={
                              styles.moveFolderItemName
                            }
                          >
                            {folder.name}
                          </Text>


                          <Text
                            style={
                              styles.moveFolderItemDate
                            }
                          >
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


              {/* SAVE FOOTER */}

              <View
                style={
                  styles.moveModalFooter
                }
              >

                <TouchableOpacity
                  activeOpacity={0.86}
                  style={[
                    styles.moveModalSaveButton,
                    savingFolders &&
                      styles.moveModalSaveDisabled,
                  ]}
                  disabled={
                    savingFolders
                  }
                  onPress={
                    handleSaveFolders
                  }
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

                      <Text
                        style={
                          styles.moveModalSaveText
                        }
                      >
                        Save Changes
                      </Text>

                    </>

                  )}

                </TouchableOpacity>

              </View>

            </View>

          </View>

        </Modal>


        {/* =================================================
            BOTTOM NAV
        ================================================= */}

        <BottomNav
          active="contacts"
        />

      </View>

    </SafeAreaView>
  );
}


/* =====================================================
   STYLES
===================================================== */

const styles =
  StyleSheet.create({

    /* ================= SAFE AREA ================= */

    safeArea: {
      flex: 1,
      backgroundColor:
        "#FFFFFF",
    },


    container: {
      flex: 1,
      backgroundColor:
        "#F8FAF9",
      paddingHorizontal: 20,
    },


    /* ================= HEADER ================= */

    header: {
      minHeight: 88,
      flexDirection:
        "row",
      alignItems:
        "center",
      justifyContent:
        "space-between",
    },


    headerText: {
      flex: 1,
      paddingRight: 12,
    },


    headerActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },


    menuButton: {
      width: 44,
      height: 44,
      borderRadius: 14,
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


    selectButton: {
      height: 42,
      paddingHorizontal: 11,
      borderRadius: 14,
      backgroundColor: "#EAF8F0",
      borderWidth: 1,
      borderColor: "#BFE6CF",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
    },


    selectButtonText: {
      marginLeft: 5,
      color: "#078E42",
      fontSize: 12.5,
      fontWeight: "800",
    },


    selectionHeaderActions: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },


    selectAllButton: {
      height: 42,
      paddingHorizontal: 11,
      borderRadius: 14,
      backgroundColor: "#EAF8F0",
      borderWidth: 1,
      borderColor: "#BFE6CF",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
    },


    selectAllText: {
      marginLeft: 5,
      color: "#078E42",
      fontSize: 12,
      fontWeight: "800",
    },


    cancelSelectionButton: {
      width: 42,
      height: 42,
      borderRadius: 14,
      backgroundColor: "#FFFFFF",
      borderWidth: 1,
      borderColor: "#E5EAE7",
      alignItems: "center",
      justifyContent: "center",
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


    /* NEW TOP RIGHT FOLDERS BUTTON */

    headerFoldersButton: {
      height: 42,
      paddingHorizontal: 10,
      borderRadius: 14,
      backgroundColor:
        "#F1EDFF",
      borderWidth: 1,
      borderColor:
        "#D4C8F5",
      flexDirection:
        "row",
      alignItems:
        "center",
      justifyContent:
        "center",
      flexShrink: 0,
    },


    headerFoldersText: {
      marginLeft: 4,
      color: "#7056B8",
      fontSize: 11.5,
      fontWeight: "800",
      flexShrink: 1,
    },


    /* ================= TOP MENU ================= */

    menuOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.08)",
      alignItems: "flex-end",
    },


    menuBackdrop: {
      ...StyleSheet.absoluteFill,
    },


    menuCard: {
      width: 245,
      marginTop: 76,
      marginRight: 20,
      paddingVertical: 7,
      borderRadius: 18,
      backgroundColor: "#FFFFFF",
      borderWidth: 1,
      borderColor: "#E5EAE7",
      shadowColor: "#17261D",
      shadowOpacity: 0.14,
      shadowRadius: 16,
      shadowOffset: {
        width: 0,
        height: 7,
      },
      elevation: 7,
      zIndex: 10,
    },


    menuItem: {
      minHeight: 62,
      paddingHorizontal: 12,
      flexDirection: "row",
      alignItems: "center",
    },


    menuItemIconGreen: {
      width: 38,
      height: 38,
      borderRadius: 12,
      backgroundColor: "#EAF8F0",
      alignItems: "center",
      justifyContent: "center",
    },


    menuItemIconPurple: {
      width: 38,
      height: 38,
      borderRadius: 12,
      backgroundColor: "#F1EDFF",
      alignItems: "center",
      justifyContent: "center",
    },



    menuItemContent: {
      flex: 1,
      marginLeft: 11,
    },


    menuItemTitle: {
      color: "#20262C",
      fontSize: 13.5,
      fontWeight: "800",
    },


    menuItemSubtitle: {
      marginTop: 3,
      color: "#858D95",
      fontSize: 11,
      fontWeight: "500",
    },


    menuDivider: {
      height: 1,
      marginHorizontal: 12,
      backgroundColor: "#EEF1EF",
    },

    /* ================= DOWNLOAD CARD ================= */

    downloadContactsCard: {
      minHeight: 66,
      marginTop: 2,
      marginBottom: 12,
      paddingHorizontal: 12,
      paddingVertical: 9,
      borderRadius: 16,
      backgroundColor: "#F2FBF6",
      borderWidth: 1,
      borderColor: "#CFECDD",
      flexDirection: "row",
      alignItems: "center",
    },

    downloadContactsIcon: {
      width: 42,
      height: 42,
      borderRadius: 13,
      backgroundColor: "#E1F6E9",
      alignItems: "center",
      justifyContent: "center",
    },

    downloadContactsContent: {
      flex: 1,
      marginLeft: 11,
    },

    downloadContactsTitle: {
      color: "#20262C",
      fontSize: 14,
      fontWeight: "800",
    },

    downloadContactsTitleDisabled: {
      color: "#8E969D",
    },

    downloadContactsSubtitle: {
      marginTop: 3,
      color: "#7A858D",
      fontSize: 11.5,
      fontWeight: "500",
    },

    downloadContactsAction: {
      minWidth: 62,
      height: 34,
      paddingHorizontal: 9,
      borderRadius: 11,
      backgroundColor: "#FFFFFF",
      borderWidth: 1,
      borderColor: "#BFE3CC",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
    },

    downloadContactsActionText: {
      marginRight: 2,
      color: "#09A84E",
      fontSize: 11.5,
      fontWeight: "800",
    },

    downloadContactsActionTextDisabled: {
      color: "#A9B0B5",
    },

    /* ================= SEARCH ================= */

    searchBox: {
      height: 52,
      borderRadius: 17,
      backgroundColor:
        "#FFFFFF",
      paddingHorizontal: 15,
      flexDirection:
        "row",
      alignItems:
        "center",
      borderWidth: 1,
      borderColor:
        "#E8EDE9",

      shadowColor:
        "#17261D",
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
      alignItems:
        "flex-end",
      justifyContent:
        "center",
    },


    /* ================= FILTERS ================= */

    filterRow: {
      marginTop: 15,
      marginBottom: 17,
      flexDirection:
        "row",
      alignItems:
        "center",
    },


    filterBtn: {
      minHeight: 41,
      paddingHorizontal: 16,
      borderRadius: 14,
      backgroundColor:
        "#FFFFFF",
      marginRight: 8,
      flexDirection:
        "row",
      alignItems:
        "center",
      justifyContent:
        "center",
      borderWidth: 1,
      borderColor:
        "#E5EAE7",
    },


    activeFilter: {
      backgroundColor:
        "#09A84E",
      borderColor:
        "#09A84E",

      shadowColor:
        "#078A3E",
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


    /* ================= LIST ================= */

    listContent: {
      paddingTop: 1,
    },


    emptyListContent: {
      flexGrow: 1,
    },


    /* ================= CONTACT CARD ================= */

    selectionCheckbox: {
      width: 30,
      height: 30,
      marginRight: 10,
      marginTop: 10,
      borderRadius: 9,
      backgroundColor: "#FFFFFF",
      borderWidth: 1.5,
      borderColor: "#B8C1BB",
      alignItems: "center",
      justifyContent: "center",
    },


    selectionCheckboxActive: {
      backgroundColor: "#09A84E",
      borderColor: "#09A84E",
    },


    card: {
      minHeight: 106,
      flexDirection:
        "row",
      alignItems:
        "flex-start",
      backgroundColor:
        "#FFFFFF",
      borderRadius: 20,
      paddingHorizontal: 16,
      paddingVertical: 16,
      marginBottom: 13,
      borderWidth: 1,
      borderColor:
        "#E8EDE9",

      shadowColor:
        "#17261D",
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
      backgroundColor:
        "#EAF8F0",
      alignItems:
        "center",
      justifyContent:
        "center",
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
      flexDirection:
        "row",
      alignItems:
        "center",
    },


    metaIcon: {
      width: 26,
      height: 26,
      borderRadius: 8,
      alignItems:
        "center",
      justifyContent:
        "center",
    },


    phoneIcon: {
      backgroundColor:
        "#EAF8F0",
    },


    emailIcon: {
      backgroundColor:
        "#FFF5DE",
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
      alignItems:
        "flex-end",
      justifyContent:
        "center",
    },


    /* ================= LOADING ================= */

    loaderContainer: {
      flex: 1,
      alignItems:
        "center",
      justifyContent:
        "center",
      paddingBottom: 90,
    },


    loadingText: {
      marginTop: 12,
      color: "#858D95",
      fontSize: 13,
      fontWeight: "500",
    },


    /* ================= BULK ACTION BAR ================= */

    folderSection: {
      width: "100%",
      marginTop: 14,
      marginBottom: 4,
    },

    folderFilterScroll: {
      flexGrow: 0,
    },

    folderFilterContent: {
      gap: 8,
      paddingRight: 8,
      paddingVertical: 2,
      alignItems: "center",
    },

    folderFilterBtn: {
      height: 40,
      paddingHorizontal: 13,
      borderRadius: 13,
      backgroundColor: "#FFFFFF",
      borderWidth: 1,
      borderColor: "#E2E7E4",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      maxWidth: 180,
      flexGrow: 0,
      flexShrink: 0,
      alignSelf: "flex-start",
    },

    folderFilterBtnActive: {
      backgroundColor: "#09A84E",
      borderColor: "#09A84E",
    },

    folderFilterText: {
      marginLeft: 6,
      color: "#687078",
      fontSize: 12.5,
      fontWeight: "700",
      maxWidth: 135,
      flexShrink: 1,
    },

    folderFilterTextActive: {
      color: "#FFFFFF",
    },

    bulkActionBar: {
      minHeight: 58,
      marginBottom: 13,
      paddingHorizontal: 11,
      paddingVertical: 8,
      borderRadius: 17,
      backgroundColor: "#FFFFFF",
      borderWidth: 1,
      borderColor: "#E5EAE7",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },


    bulkSelectionInfo: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      minWidth: 0,
    },


    bulkSelectionBadge: {
      width: 34,
      height: 34,
      borderRadius: 12,
      backgroundColor: "#EAF8F0",
      alignItems: "center",
      justifyContent: "center",
    },


    bulkSelectionBadgeText: {
      color: "#078E42",
      fontSize: 14,
      fontWeight: "900",
    },


    bulkSelectionText: {
      flexShrink: 1,
      marginLeft: 9,
      color: "#20262C",
      fontSize: 12.5,
      fontWeight: "700",
    },


    bulkActionButtons: {
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
    },


    bulkMoveButton: {
      height: 40,
      paddingHorizontal: 11,
      borderRadius: 12,
      backgroundColor: "#09A84E",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
    },


    bulkMoveButtonText: {
      marginLeft: 5,
      color: "#FFFFFF",
      fontSize: 12,
      fontWeight: "800",
    },


    bulkDeleteButton: {
      height: 40,
      paddingHorizontal: 11,
      borderRadius: 12,
      backgroundColor: "#ED5447",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
    },


    bulkDeleteButtonText: {
      marginLeft: 5,
      color: "#FFFFFF",
      fontSize: 12,
      fontWeight: "800",
    },


    bulkActionDisabled: {
      opacity: 0.45,
    },


    /* ================= FOLDER BANNER ================= */

    folderBanner: {
      minHeight: 58,
      marginBottom: 13,
      paddingLeft: 11,
      paddingRight: 9,
      paddingVertical: 9,
      borderRadius: 17,
      backgroundColor:
        "#FFF5DE",
      borderWidth: 1,
      borderColor:
        "#F5E6B8",
      flexDirection:
        "row",
      alignItems:
        "center",
    },


    folderBannerMain: {
      flex: 1,
      flexDirection:
        "row",
      alignItems:
        "center",
    },


    folderBannerIcon: {
      width: 38,
      height: 38,
      borderRadius: 12,
      backgroundColor:
        "#FFFFFF",
      alignItems:
        "center",
      justifyContent:
        "center",
    },


    folderBannerContent: {
      flex: 1,
      marginLeft: 11,
      marginRight: 8,
    },


    folderBannerLabel: {
      color: "#6F8276",
      fontSize: 10.5,
      fontWeight: "700",
      textTransform:
        "uppercase",
      letterSpacing: 0.4,
    },


    folderBannerName: {
      marginTop: 3,
      color: "#1C2A22",
      fontSize: 14,
      fontWeight: "800",
    },


    folderBannerClear: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor:
        "#FFFFFF",
      alignItems:
        "center",
      justifyContent:
        "center",
    },


    /* ================= EMPTY ================= */

    emptyState: {
      flex: 1,
      alignItems:
        "center",
      justifyContent:
        "center",
      paddingHorizontal: 28,
      paddingBottom: 90,
    },


    emptyIcon: {
      width: 76,
      height: 76,
      borderRadius: 24,
      backgroundColor:
        "#EAF8F0",
      alignItems:
        "center",
      justifyContent:
        "center",
    },


    emptyTitle: {
      marginTop: 18,
      color: "#1D2329",
      fontSize: 19,
      fontWeight: "800",
      textAlign:
        "center",
    },


    emptyDescription: {
      marginTop: 8,
      color: "#858D95",
      fontSize: 13,
      lineHeight: 20,
      fontWeight: "500",
      textAlign:
        "center",
    },


    scanButton: {
      minWidth: 155,
      height: 49,
      marginTop: 20,
      paddingHorizontal: 20,
      borderRadius: 15,
      backgroundColor:
        "#09A84E",
      flexDirection:
        "row",
      alignItems:
        "center",
      justifyContent:
        "center",

      shadowColor:
        "#078A3E",
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


    /* ================= CREATE FOLDER MODAL ================= */

    modalOverlay: {
      flex: 1,
      backgroundColor:
        "rgba(0,0,0,0.38)",
      alignItems:
        "center",
      justifyContent:
        "center",
      paddingHorizontal: 22,
    },


    folderModal: {
      width: "100%",
      maxWidth: 400,
      backgroundColor:
        "#FFFFFF",
      borderRadius: 24,
      padding: 22,

      shadowColor:
        "#000000",
      shadowOpacity: 0.18,
      shadowRadius: 20,
      shadowOffset: {
        width: 0,
        height: 8,
      },
      elevation: 10,
    },


    folderModalHeader: {
      flexDirection:
        "row",
      alignItems:
        "center",
      justifyContent:
        "space-between",
    },


    folderModalIcon: {
      width: 56,
      height: 56,
      borderRadius: 18,
      backgroundColor:
        "#F1EDFF",
      alignItems:
        "center",
      justifyContent:
        "center",
    },


    modalCloseButton: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor:
        "#F3F5F4",
      alignItems:
        "center",
      justifyContent:
        "center",
    },


    folderModalTitle: {
      marginTop: 16,
      color: "#171C21",
      fontSize: 20,
      fontWeight: "800",
    },


    folderModalSubtitle: {
      marginTop: 5,
      color: "#858D95",
      fontSize: 13,
      lineHeight: 19,
      fontWeight: "500",
    },


    folderInput: {
      height: 52,
      marginTop: 18,
      paddingHorizontal: 15,
      borderRadius: 15,
      backgroundColor:
        "#F8FAF9",
      borderWidth: 1,
      borderColor:
        "#E2E8E4",
      color: "#252B31",
      fontSize: 15,
      fontWeight: "600",
    },


    folderModalActions: {
      flexDirection:
        "row",
      marginTop: 18,
      gap: 10,
    },


    cancelFolderButton: {
      flex: 1,
      height: 48,
      borderRadius: 14,
      backgroundColor:
        "#F1F3F2",
      alignItems:
        "center",
      justifyContent:
        "center",
    },


    cancelFolderText: {
      color: "#687078",
      fontSize: 14,
      fontWeight: "700",
    },


    createFolderConfirmButton: {
      flex: 1,
      height: 48,
      borderRadius: 14,
      backgroundColor:
        "#ED5447",
      alignItems:
        "center",
      justifyContent:
        "center",
    },


    createFolderDisabled: {
      opacity: 0.45,
    },


    createFolderConfirmText: {
      color: "#FFFFFF",
      fontSize: 14,
      fontWeight: "800",
    },


    /* ================= FOLDER LIST MODAL ================= */

    folderOverlay: {
      flex: 1,
      backgroundColor:
        "rgba(0,0,0,0.38)",
      justifyContent:
        "flex-end",
    },


    folderListModal: {
      width: "100%",
      maxHeight: "75%",
      backgroundColor:
        "#FFFFFF",
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      paddingHorizontal: 20,
      paddingTop: 22,
      paddingBottom: 25,
    },


    folderListHeader: {
      flexDirection:
        "row",
      alignItems:
        "center",
      justifyContent:
        "space-between",
    },


    folderListTitle: {
      color: "#171C21",
      fontSize: 21,
      fontWeight: "800",
    },


    folderListSubtitle: {
      marginTop: 4,
      color: "#858D95",
      fontSize: 13,
      fontWeight: "500",
    },


    folderItem: {
      minHeight: 70,
      paddingHorizontal: 13,
      paddingVertical: 10,
      marginBottom: 10,
      borderRadius: 17,
      backgroundColor:
        "#F8FAF9",
      borderWidth: 1,
      borderColor:
        "#E8EDE9",
      flexDirection:
        "row",
      alignItems:
        "center",
    },


    folderItemActive: {
      backgroundColor:
        "#F1EDFF",
      borderColor:
        "#D4C8F5",
    },


    folderItemIcon: {
      width: 46,
      height: 46,
      borderRadius: 14,
      backgroundColor:
        "#FFF5DE",
      alignItems:
        "center",
      justifyContent:
        "center",
    },


    folderItemIconActive: {
      backgroundColor:
        "#7056B8",
    },


    folderItemInfo: {
      flex: 1,
      marginLeft: 12,
      marginRight: 10,
    },


    folderItemName: {
      color: "#20262C",
      fontSize: 15,
      fontWeight: "800",
    },


    folderItemDate: {
      marginTop: 4,
      color: "#858D95",
      fontSize: 11.5,
      fontWeight: "500",
    },


    noFolders: {
      alignItems:
        "center",
      justifyContent:
        "center",
      paddingVertical: 45,
    },


    noFoldersIcon: {
      width: 70,
      height: 70,
      borderRadius: 22,
      backgroundColor:
        "#FFF0EE",
      alignItems:
        "center",
      justifyContent:
        "center",
    },


    noFoldersTitle: {
      marginTop: 14,
      color: "#20262C",
      fontSize: 17,
      fontWeight: "800",
    },


    noFoldersText: {
      marginTop: 6,
      color: "#858D95",
      fontSize: 13,
      textAlign:
        "center",
    },


    modalCreateFolderButton: {
      height: 50,
      marginTop: 15,
      borderRadius: 15,
      backgroundColor:
        "#ED5447",
      flexDirection:
        "row",
      alignItems:
        "center",
      justifyContent:
        "center",

      shadowColor:
        "#C44336",
      shadowOpacity: 0.18,
      shadowRadius: 7,
      shadowOffset: {
        width: 0,
        height: 3,
      },
      elevation: 3,
    },


    modalCreateFolderText: {
      marginLeft: 7,
      color: "#FFFFFF",
      fontSize: 14,
      fontWeight: "800",
    },


    /* ================= MOVE CONTACT MODAL ================= */

    moveOverlay: {
      flex: 1,
      backgroundColor:
        "rgba(0,0,0,0.38)",
      justifyContent:
        "flex-end",
    },


    moveModal: {
      width: "100%",
      maxHeight: "75%",
      backgroundColor:
        "#FFFFFF",
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      paddingHorizontal: 20,
      paddingTop: 22,
      paddingBottom: 25,
    },


    moveModalHeader: {
      flexDirection:
        "row",
      alignItems:
        "center",
    },


    moveModalIcon: {
      width: 52,
      height: 52,
      borderRadius: 17,
      backgroundColor:
        "#EAF8F0",
      alignItems:
        "center",
      justifyContent:
        "center",
    },


    moveModalTitleWrap: {
      flex: 1,
      marginLeft: 13,
      marginRight: 8,
    },


    moveModalTitle: {
      color: "#171C21",
      fontSize: 17,
      fontWeight: "800",
    },


    moveModalSubtitle: {
      marginTop: 3,
      color: "#858D95",
      fontSize: 12.5,
      fontWeight: "500",
    },


    moveModalCloseButton: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor:
        "#F3F5F4",
      alignItems:
        "center",
      justifyContent:
        "center",
    },


    moveModalLoader: {
      alignItems:
        "center",
      justifyContent:
        "center",
      paddingVertical: 55,
    },


    moveNoFolders: {
      alignItems:
        "center",
      justifyContent:
        "center",
      paddingVertical: 42,
    },


    moveNoFoldersIcon: {
      width: 70,
      height: 70,
      borderRadius: 22,
      backgroundColor:
        "#EAF8F0",
      alignItems:
        "center",
      justifyContent:
        "center",
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
      textAlign:
        "center",
    },


    moveFolderList: {
      marginTop: 15,
    },


    moveFolderItem: {
      minHeight: 66,
      paddingHorizontal: 13,
      paddingVertical: 9,
      marginBottom: 10,
      borderRadius: 17,
      backgroundColor:
        "#F8FAF9",
      borderWidth: 1,
      borderColor:
        "#E8EDE9",
      flexDirection:
        "row",
      alignItems:
        "center",
    },


    moveFolderItemActive: {
      backgroundColor:
        "#EAF8F0",
      borderColor:
        "#BFE6CF",
    },


    moveFolderItemIcon: {
      width: 44,
      height: 44,
      borderRadius: 14,
      backgroundColor:
        "#EAF8F0",
      alignItems:
        "center",
      justifyContent:
        "center",
    },


    moveFolderItemIconActive: {
      backgroundColor:
        "#09A84E",
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
      borderTopColor:
        "#EDF0EE",
    },


    moveModalSaveButton: {
      height: 52,
      borderRadius: 16,
      backgroundColor:
        "#09AA4D",
      flexDirection:
        "row",
      alignItems:
        "center",
      justifyContent:
        "center",

      shadowColor:
        "#078A3E",
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