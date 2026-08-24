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

import {
  router,
  useFocusEffect,
} from "expo-router";

import BottomNav from "@/components/BottomNav";

import {
  getContacts,
  getFolders,
  createFolder,
  setContactFolders,
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
  updatedAt?: number;
  createdAt?: number;
};

type SortType =
  | "latest"
  | "oldest";


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

  const [sortType, setSortType] =
    useState<SortType>("latest");

  const [loading, setLoading] =
    useState(true);


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
    showFolders,
    setShowFolders,
  ] = useState(false);

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
     FILTER + SORT
  ===================================================== */

  const filteredContacts =
    useMemo(() => {
      let data = [
        ...contacts,
      ];

      if (selectedFolderId) {
        data = data.filter((item) =>
          (item.folderIds || []).includes(
            selectedFolderId
          )
        );
      } else {
        data = data.filter(
          (item) =>
            (item.folderIds || [])
              .length === 0
        );
      }

      data.sort((a, b) => {
        const firstDate =
          a.updatedAt ||
          a.createdAt ||
          0;

        const secondDate =
          b.updatedAt ||
          b.createdAt ||
          0;

        return sortType ===
          "latest"
          ? secondDate -
              firstDate
          : firstDate -
              secondDate;
      });


      const keyword =
        search
          .trim()
          .toLowerCase();


      if (!keyword) {
        return data;
      }


      return data.filter(
        (item) => {
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

          return searchableText.includes(
            keyword
          );
        }
      );
    }, [
      contacts,
      search,
      sortType,
      selectedFolderId,
    ]);


  /* =====================================================
     OPEN CONTACT
  ===================================================== */

  const handleOpenContact = (
    contact: ContactItem
  ) => {
    (
      globalThis as any
    ).selectedContact =
      contact;

    router.push(
      "/contact-details"
    );
  };


  /* =====================================================
     LONG PRESS MOVE TO FOLDER
  ===================================================== */

  const handleLongPressContact = (
    contact: ContactItem
  ) => {
    setLongPressContact(
      contact
    );

    setSelectedFolderIds([
      ...(contact.folderIds || []),
    ]);

    setShowMoveContactModal(
      true
    );

    setLoadingMoveFolders(
      true
    );

    getFolders()
      .then((data) => {
        setFolders(data);
      })
      .catch((error) => {
        console.error(
          "Failed to load folders:",
          error
        );

        setFolders([]);
      })
      .finally(() => {
        setLoadingMoveFolders(
          false
        );
      });
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


          {/* FOLDERS TOP RIGHT */}

          <TouchableOpacity
            activeOpacity={0.82}
            style={
              styles.headerFoldersButton
            }
            onPress={() =>
              setShowFolders(
                true
              )
            }
          >

                    <Ionicons
                      name="folder-open-outline"
                      size={35}
                      color="#ED5447"
                    />

            <Text
              style={
                styles.headerFoldersText
              }
            >
              Folders
            </Text>

          </TouchableOpacity>

        </View>


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
            FILTERS
        ================================================= */}

        <View
          style={styles.filterRow}
        >

          {/* LATEST */}

          <TouchableOpacity
            activeOpacity={0.82}
            style={[
              styles.filterBtn,
              sortType ===
                "latest" &&
                styles.activeFilter,
            ]}
            onPress={() =>
              setSortType(
                "latest"
              )
            }
          >

            <Ionicons
              name="arrow-down-outline"
              size={16}
              color={
                sortType ===
                "latest"
                  ? "#FFFFFF"
                  : "#687078"
              }
            />


            <Text
              style={[
                styles.filterText,
                sortType ===
                  "latest" &&
                  styles.activeFilterText,
              ]}
            >
              Latest
            </Text>

          </TouchableOpacity>


          {/* OLDEST */}

          <TouchableOpacity
            activeOpacity={0.82}
            style={[
              styles.filterBtn,
              sortType ===
                "oldest" &&
                styles.activeFilter,
            ]}
            onPress={() =>
              setSortType(
                "oldest"
              )
            }
          >

            <Ionicons
              name="arrow-up-outline"
              size={16}
              color={
                sortType ===
                "oldest"
                  ? "#FFFFFF"
                  : "#687078"
              }
            />


            <Text
              style={[
                styles.filterText,
                sortType ===
                  "oldest" &&
                  styles.activeFilterText,
              ]}
            >
              Oldest
            </Text>

          </TouchableOpacity>

        </View>


        {/* =================================================
            ACTIVE FOLDER BANNER
        ================================================= */}

        {selectedFolderId ? (

          <View
            style={styles.folderBanner}
          >

            <TouchableOpacity
              activeOpacity={0.85}
              style={
                styles.folderBannerMain
              }
              onPress={() =>
                setShowFolders(true)
              }
            >

              <View
                style={
                  styles.folderBannerIcon
                }
              >
                <Ionicons
                  name="folder"
                  size={19}
                  color="#EFA300"
                />
              </View>


              <View
                style={
                  styles.folderBannerContent
                }
              >

                <Text
                  style={
                    styles.folderBannerLabel
                  }
                >
                  Viewing folder
                </Text>


                <Text
                  numberOfLines={1}
                  style={
                    styles.folderBannerName
                  }
                >
                  {folders.find(
                    (folder) =>
                      folder.id ===
                      selectedFolderId
                  )?.name ||
                    "Folder"}
                </Text>

              </View>

            </TouchableOpacity>


            <TouchableOpacity
              activeOpacity={0.7}
              style={
                styles.folderBannerClear
              }
              onPress={() =>
                setSelectedFolderId(
                  null
                )
              }
            >

              <Ionicons
                name="close"
                size={18}
                color="#ED5447"
              />

            </TouchableOpacity>

          </View>

        ) : null}


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
            VIEW FOLDERS MODAL
        ================================================= */}

        <Modal
          visible={
            showFolders
          }
          transparent
          animationType="slide"
          onRequestClose={() =>
            setShowFolders(
              false
            )
          }
        >

          <View
            style={
              styles.folderOverlay
            }
          >

            <View
              style={
                styles.folderListModal
              }
            >

              {/* HEADER */}

              <View
                style={
                  styles.folderListHeader
                }
              >

                <View>

                  <Text
                    style={
                      styles.folderListTitle
                    }
                  >
                    Your Folders
                  </Text>


                  <Text
                    style={
                      styles.folderListSubtitle
                    }
                  >
                    {folders.length}{" "}
                    {
                      folders.length ===
                      1
                        ? "folder"
                        : "folders"
                    }
                  </Text>

                </View>


                <TouchableOpacity
                  activeOpacity={
                    0.7
                  }
                  style={
                    styles.modalCloseButton
                  }
                  onPress={() =>
                    setShowFolders(
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

              {folders.length ===
              0 ? (

                <View
                  style={
                    styles.noFolders
                  }
                >

                  <View
                    style={
                      styles.noFoldersIcon
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
                      styles.noFoldersTitle
                    }
                  >
                    No folders yet
                  </Text>


                  <Text
                    style={
                      styles.noFoldersText
                    }
                  >
                    Create a folder to
                    organize your contacts.
                  </Text>

                </View>

              ) : (

                <FlatList
                  data={folders}
                  keyExtractor={(
                    item
                  ) =>
                    item.id
                  }
                  showsVerticalScrollIndicator={
                    false
                  }
                  contentContainerStyle={{
                    paddingTop: 15,
                    paddingBottom: 5,
                  }}
                  ListHeaderComponent={(
                    <TouchableOpacity
                      activeOpacity={
                        0.82
                      }
                      style={[
                        styles.folderItem,
                        !selectedFolderId &&
                          styles.folderItemActive,
                      ]}
                      onPress={() => {

                        setSelectedFolderId(
                          null
                        );

                        setShowFolders(
                          false
                        );

                      }}
                    >
<View
                          style={[
                            styles.folderItemIcon,
                            !selectedFolderId &&
                              styles.folderItemIconActive,
                          ]}
                        >
                        <Ionicons
                          name={
                            !selectedFolderId
                              ? "checkmark"
                              : "person"
                          }
                          size={22}
                          color={
                            !selectedFolderId
                              ? "#FFFFFF"
                              : "#EFA300"
                          }
                        />
                      </View>

                      <View
                        style={
                          styles.folderItemInfo
                        }
                      >
                        <Text
                          style={
                            styles.folderItemName
                          }
                        >
                          My Cards
                        </Text>

                        <Text
                          style={
                            styles.folderItemDate
                          }
                        >
                          {
                            contacts.filter(
                              (contact) =>
                                (contact.folderIds ||
                                  []).length ===
                                0
                            ).length
                          }{" "}
                          contacts without folders
                        </Text>
                      </View>

                      <Ionicons
                        name="chevron-forward"
                        size={20}
                        color="#AAB1B7"
                      />
                    </TouchableOpacity>
                  )}
                  renderItem={({
                    item,
                  }) => (

                    <TouchableOpacity
                      activeOpacity={
                        0.82
                      }
                      style={[
                        styles.folderItem,
                        selectedFolderId ===
                          item.id &&
                          styles.folderItemActive,
                      ]}
                      onPress={() => {

                        setSelectedFolderId(
                          item.id
                        );

                        setShowFolders(
                          false
                        );

                      }}
                    >

                      <View
                        style={
                          styles.folderItemIcon
                        }
                      >

                        <Ionicons
                          name="folder"
                          size={24}
                          color="#EFA300"
                        />

                      </View>


                      <View
                        style={
                          styles.folderItemInfo
                        }
                      >

                        <Text
                          style={
                            styles.folderItemName
                          }
                          numberOfLines={
                            1
                          }
                        >
                          {item.name}
                        </Text>


                        <Text
                          style={
                            styles.folderItemDate
                          }
                        >
                          Created{" "}
                          {item.createdAt
                            ? new Date(
                                item.createdAt
                              ).toLocaleDateString()
                            : "Recently"}
                        </Text>

                      </View>


                      <Ionicons
                        name="chevron-forward"
                        size={20}
                        color="#AAB1B7"
                      />

                    </TouchableOpacity>

                  )}

                />

              )}


              {/* CREATE NEW FOLDER */}

              <TouchableOpacity
                activeOpacity={
                  0.84
                }
                style={
                  styles.modalCreateFolderButton
                }
                onPress={() => {

                  setShowFolders(
                    false
                  );


                  setTimeout(() => {

                    setShowCreateFolder(
                      true
                    );

                  }, 250);

                }}
              >

                <Ionicons
                  name="add"
                  size={20}
                  color="#FFFFFF"
                />


                <Text
                  style={
                    styles.modalCreateFolderText
                  }
                >
                  Create New Folder
                </Text>

              </TouchableOpacity>

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
      paddingHorizontal: 13,
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
    },


    headerFoldersText: {
      marginLeft: 6,
      color: "#7056B8",
      fontSize: 13,
      fontWeight: "800",
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