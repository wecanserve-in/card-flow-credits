import React, {
  useEffect,
  useState,
} from "react";

import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";

import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Sharing from "expo-sharing";

import { getContacts } from "../services/database";
import { exportContactsToExcel } from "../services/excelService";
import { createNotification } from "../services/notificationService";

export default function ExportScreen() {
  const insets = useSafeAreaInsets();

  const [contacts, setContacts] =
    useState<any[]>([]);

  const [loadingContacts, setLoadingContacts] =
    useState(true);

  const [exporting, setExporting] =
    useState(false);

  useEffect(() => {
    loadContacts();
  }, []);

  async function loadContacts() {
    try {
      setLoadingContacts(true);

      const data = await getContacts();

      setContacts(data || []);
    } catch (error) {
      console.log(
        "Load contacts error:",
        error
      );

      Alert.alert(
        "Unable to Load Contacts",
        "Your saved contacts could not be loaded."
      );
    } finally {
      setLoadingContacts(false);
    }
  }

  const handleExport = async () => {
    if (exporting) {
      return;
    }

    try {
      if (contacts.length === 0) {
        Alert.alert(
          "No Contacts",
          "No saved contacts found."
        );
        return;
      }

      setExporting(true);

      const fileUri =
        await exportContactsToExcel(
          contacts
        );

      if (!fileUri) {
        Alert.alert(
          "Export Failed",
          "Failed to generate the Excel workbook."
        );

        return;
      }

      const sharingAvailable =
        await Sharing.isAvailableAsync();

      if (!sharingAvailable) {
        Alert.alert(
          "Sharing Not Available",
          "Sharing is not supported on this device."
        );

        return;
      }

      await Sharing.shareAsync(fileUri, {
        mimeType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        dialogTitle:
          "Export Business Card Contacts",
        UTI:
          "org.openxmlformats.spreadsheetml.sheet",
      });

      await createNotification({
        type: "export_success",
        title: "Excel exported",
        message: `An Excel workbook containing ${
          contacts.length
        } ${
          contacts.length === 1
            ? "contact was"
            : "contacts were"
        } generated successfully.`,
        actionRoute: "/export",
        eventKey: `export-success-${Date.now()}`,
      });
    } catch (error) {
      console.log(
        "Excel export error:",
        error
      );

      await createNotification({
        type: "export_failed",
        title: "Export failed",
        message:
          "Your Excel workbook could not be generated.",
        actionRoute: "/export",
        eventKey: `export-failed-${Date.now()}`,
      });

      Alert.alert(
        "Export Failed",
        "Failed to export the Excel workbook."
      );
    } finally {
      setExporting(false);
    }
  };

  const totalEmails = contacts.filter(
    (contact) => contact.email
  ).length;

  const totalPhones = contacts.filter(
    (contact) => contact.phone
  ).length;

  const companies = new Set(
    contacts
      .map(
        (contact) =>
          contact.company
      )
      .filter(Boolean)
  );

  const previewContacts =
    contacts.slice(0, 5);

  return (
    <SafeAreaView
      style={styles.safeArea}
    >
      <View style={styles.container}>
        <ScrollView
          showsVerticalScrollIndicator={
            false
          }
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingBottom:
                190 + insets.bottom,
            },
          ]}
        >
          {/* Header */}

          <View style={styles.header}>
            <TouchableOpacity
              activeOpacity={0.75}
              style={styles.backButton}
              onPress={() =>
                router.back()
              }
            >
              <Ionicons
                name="arrow-back"
                size={22}
                color="#202622"
              />
            </TouchableOpacity>

            <View
              style={styles.headerContent}
            >
              <Text style={styles.title}>
                Export Contacts
              </Text>

              <Text style={styles.subtitle}>
                Create an Excel workbook
                from your saved contacts.
              </Text>
            </View>

            <View style={styles.headerIcon}>
              <Ionicons
                name="download-outline"
                size={21}
                color="#09A84E"
              />
            </View>
          </View>

          {loadingContacts ? (
            <View
              style={styles.loadingContainer}
            >
              <View
                style={
                  styles.loadingIconContainer
                }
              >
                <ActivityIndicator
                  size="large"
                  color="#09A84E"
                />
              </View>

              <Text
                style={styles.loadingTitle}
              >
                Loading Contacts
              </Text>

              <Text
                style={styles.loadingText}
              >
                Preparing your contact
                information for export.
              </Text>
            </View>
          ) : (
            <>
              {/* Workbook Card */}

              <View
                style={styles.workbookCard}
              >
                <View
                  style={
                    styles.workbookIcon
                  }
                >
                  <Ionicons
                    name="document-text"
                    color="#09A84E"
                    size={29}
                  />
                </View>

                <View
                  style={
                    styles.workbookContent
                  }
                >
                  <Text
                    style={styles.fileLabel}
                  >
                    Excel workbook
                  </Text>

                  <Text
                    style={styles.fileName}
                    numberOfLines={1}
                  >
                    business_cards.xlsx
                  </Text>

                  <Text
                    style={styles.fileType}
                  >
                    Microsoft Excel · XLSX
                  </Text>
                </View>

                <View
                  style={
                    styles.fileStatus
                  }
                >
                  <Ionicons
                    name={
                      contacts.length > 0
                        ? "checkmark-circle"
                        : "alert-circle-outline"
                    }
                    size={18}
                    color={
                      contacts.length > 0
                        ? "#09A84E"
                        : "#A1A9A4"
                    }
                  />

                  <Text
                    style={[
                      styles.fileStatusText,
                      contacts.length ===
                        0 &&
                        styles.emptyStatusText,
                    ]}
                  >
                    {contacts.length > 0
                      ? "Ready"
                      : "Empty"}
                  </Text>
                </View>
              </View>

              {/* Export Summary */}

              <View
                style={styles.sectionHeader}
              >
                <View>
                  <Text
                    style={
                      styles.sectionTitle
                    }
                  >
                    Export summary
                  </Text>

                  <Text
                    style={
                      styles.sectionSubtitle
                    }
                  >
                    Information included in
                    your workbook
                  </Text>
                </View>
              </View>

              <View style={styles.statsGrid}>
                <StatCard
                  icon="people-outline"
                  value={contacts.length}
                  label="Contacts"
                />

                <StatCard
                  icon="business-outline"
                  value={companies.size}
                  label="Companies"
                />

                <StatCard
                  icon="mail-outline"
                  value={totalEmails}
                  label="Emails"
                />

                <StatCard
                  icon="call-outline"
                  value={totalPhones}
                  label="Phone numbers"
                />
              </View>

              {/* Workbook Information */}

              <View
                style={styles.infoCard}
              >
                <View style={styles.infoRow}>
                  <View
                    style={styles.infoIcon}
                  >
                    <Ionicons
                      name="grid-outline"
                      size={18}
                      color="#09A84E"
                    />
                  </View>

                  <View
                    style={
                      styles.infoContent
                    }
                  >
                    <Text
                      style={styles.infoTitle}
                    >
                      Organized columns
                    </Text>

                    <Text
                      style={styles.infoText}
                    >
                      Names, companies,
                      phone numbers, emails
                      and other available
                      details.
                    </Text>
                  </View>
                </View>

                <View
                  style={styles.infoDivider}
                />

                <View style={styles.infoRow}>
                  <View
                    style={styles.infoIcon}
                  >
                    <Ionicons
                      name="share-social-outline"
                      size={18}
                      color="#09A84E"
                    />
                  </View>

                  <View
                    style={
                      styles.infoContent
                    }
                  >
                    <Text
                      style={styles.infoTitle}
                    >
                      Easy to share
                    </Text>

                    <Text
                      style={styles.infoText}
                    >
                      Save, email or share
                      the workbook through
                      supported apps.
                    </Text>
                  </View>
                </View>
              </View>

              {/* Excel Preview */}

              <View
                style={styles.previewCard}
              >
                <View
                  style={
                    styles.previewHeader
                  }
                >
                  <View>
                    <Text
                      style={
                        styles.previewTitle
                      }
                    >
                      Workbook preview
                    </Text>

                    <Text
                      style={
                        styles.previewSubtitle
                      }
                    >
                      First five saved
                      contacts
                    </Text>
                  </View>

                  <View
                    style={
                      styles.previewBadge
                    }
                  >
                    <Text
                      style={
                        styles.previewBadgeText
                      }
                    >
                      {contacts.length} rows
                    </Text>
                  </View>
                </View>

                {contacts.length > 0 ? (
                  <View
                    style={
                      styles.tableContainer
                    }
                  >
                    <View
                      style={
                        styles.tableHeader
                      }
                    >
                      <Text
                        style={[
                          styles.headerCell,
                          styles.nameColumn,
                        ]}
                      >
                        Name
                      </Text>

                      <Text
                        style={
                          styles.headerCell
                        }
                      >
                        Company
                      </Text>

                      <Text
                        style={
                          styles.headerCell
                        }
                      >
                        Phone
                      </Text>
                    </View>

                    {previewContacts.map(
                      (item, index) => (
                        <View
                          key={
                            item.id ||
                            `${item.name}-${index}`
                          }
                          style={[
                            styles.tableRow,
                            index ===
                              previewContacts.length -
                                1 &&
                              styles.lastTableRow,
                          ]}
                        >
                          <View
                            style={[
                              styles.cell,
                              styles.nameColumn,
                              styles.nameCell,
                            ]}
                          >
                            <View
                              style={
                                styles.avatar
                              }
                            >
                              <Text
                                style={
                                  styles.avatarText
                                }
                              >
                                {(
                                  item.name ||
                                  "?"
                                )
                                  .charAt(0)
                                  .toUpperCase()}
                              </Text>
                            </View>

                            <Text
                              style={
                                styles.nameText
                              }
                              numberOfLines={
                                1
                              }
                            >
                              {item.name ||
                                "-"}
                            </Text>
                          </View>

                          <Text
                            style={[
                              styles.cell,
                              styles.cellText,
                            ]}
                            numberOfLines={1}
                          >
                            {item.company ||
                              "-"}
                          </Text>

                          <Text
                            style={[
                              styles.cell,
                              styles.cellText,
                            ]}
                            numberOfLines={1}
                          >
                            {item.phone ||
                              "-"}
                          </Text>
                        </View>
                      )
                    )}

                    {contacts.length > 5 && (
                      <View
                        style={
                          styles.moreContainer
                        }
                      >
                        <Ionicons
                          name="ellipsis-horizontal"
                          size={18}
                          color="#09A84E"
                        />

                        <Text
                          style={styles.more}
                        >
                          {contacts.length -
                            5}{" "}
                          more{" "}
                          {contacts.length -
                            5 ===
                          1
                            ? "contact"
                            : "contacts"}{" "}
                          will be included
                        </Text>
                      </View>
                    )}
                  </View>
                ) : (
                  <View
                    style={styles.emptyState}
                  >
                    <View
                      style={
                        styles.emptyIcon
                      }
                    >
                      <Ionicons
                        name="people-outline"
                        size={32}
                        color="#09A84E"
                      />
                    </View>

                    <Text
                      style={
                        styles.emptyTitle
                      }
                    >
                      No contacts to export
                    </Text>

                    <Text
                      style={
                        styles.emptyText
                      }
                    >
                      Scan and save at least
                      one business card to
                      create an Excel
                      workbook.
                    </Text>
                  </View>
                )}
              </View>
            </>
          )}
        </ScrollView>

        {/* Fixed Bottom Actions */}

        {!loadingContacts && (
          <View
            style={[
              styles.bottomActions,
              {
                paddingBottom: Math.max(
                  insets.bottom,
                  14
                ),
              },
            ]}
          >
            <TouchableOpacity
              activeOpacity={0.85}
              style={[
                styles.exportButton,
                (contacts.length === 0 ||
                  exporting) &&
                  styles.disabledExportButton,
              ]}
              onPress={handleExport}
              disabled={
                contacts.length === 0 ||
                exporting
              }
            >
              <View
                style={
                  styles.exportIconContainer
                }
              >
                {exporting ? (
                  <ActivityIndicator
                    size="small"
                    color="#09A84E"
                  />
                ) : (
                  <Ionicons
                    name="share-outline"
                    size={20}
                    color={
                      contacts.length > 0
                        ? "#09A84E"
                        : "#909994"
                    }
                  />
                )}
              </View>

              <View
                style={
                  styles.exportButtonContent
                }
              >
                <Text
                  style={[
                    styles.exportButtonText,
                    contacts.length ===
                      0 &&
                      styles.disabledExportText,
                  ]}
                >
                  {exporting
                    ? "Preparing Excel"
                    : "Export Excel"}
                </Text>

                <Text
                  style={[
                    styles.exportButtonSubtitle,
                    contacts.length ===
                      0 &&
                      styles.disabledExportSubtitle,
                  ]}
                >
                  {contacts.length > 0
                    ? `${contacts.length} ${
                        contacts.length ===
                        1
                          ? "contact"
                          : "contacts"
                      } included`
                    : "No contacts available"}
                </Text>
              </View>

              <Ionicons
                name="arrow-forward"
                size={20}
                color={
                  contacts.length > 0
                    ? "#FFFFFF"
                    : "#909994"
                }
              />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.75}
              style={styles.cancelButton}
              onPress={() =>
                router.back()
              }
              disabled={exporting}
            >
              <Ionicons
                name="close-outline"
                size={18}
                color="#707A74"
              />

              <Text
                style={
                  styles.cancelButtonText
                }
              >
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

function StatCard({
  icon,
  value,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: number;
  label: string;
}) {
  return (
    <View style={styles.statCard}>
      <View style={styles.statIcon}>
        <Ionicons
          name={icon}
          size={20}
          color="#09A84E"
        />
      </View>

      <View style={styles.statContent}>
        <Text style={styles.statNumber}>
          {value}
        </Text>

        <Text style={styles.statLabel}>
          {label}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  container: {
    flex: 1,
    backgroundColor: "#F7F9F8",
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },

  backButton: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5EAE7",
    justifyContent: "center",
    alignItems: "center",

    shadowColor: "#17261D",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    elevation: 2,
  },

  headerContent: {
    flex: 1,
    marginLeft: 14,
  },

  title: {
    color: "#171D19",
    fontSize: 22,
    fontWeight: "900",
  },

  subtitle: {
    marginTop: 3,
    color: "#818A85",
    fontSize: 12.5,
    lineHeight: 17,
    fontWeight: "500",
  },

  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: "#EAF8F0",
    justifyContent: "center",
    alignItems: "center",
  },

  loadingContainer: {
    flex: 1,
    minHeight: 500,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
  },

  loadingIconContainer: {
    width: 78,
    height: 78,
    borderRadius: 25,
    backgroundColor: "#EAF8F0",
    justifyContent: "center",
    alignItems: "center",
  },

  loadingTitle: {
    marginTop: 18,
    color: "#202622",
    fontSize: 19,
    fontWeight: "800",
  },

  loadingText: {
    maxWidth: 280,
    marginTop: 7,
    color: "#7D8681",
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
  },

  workbookCard: {
    minHeight: 112,
    padding: 16,
    borderRadius: 21,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5EAE7",
    flexDirection: "row",
    alignItems: "center",

    shadowColor: "#17261D",
    shadowOpacity: 0.055,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 3,
  },

  workbookIcon: {
    width: 60,
    height: 60,
    borderRadius: 19,
    backgroundColor: "#EAF8F0",
    borderWidth: 1,
    borderColor: "#D8F0E2",
    justifyContent: "center",
    alignItems: "center",
  },

  workbookContent: {
    flex: 1,
    marginLeft: 14,
  },

  fileLabel: {
    color: "#909893",
    fontSize: 10.5,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  fileName: {
    marginTop: 5,
    color: "#202622",
    fontSize: 15.5,
    fontWeight: "800",
  },

  fileType: {
    marginTop: 4,
    color: "#818A85",
    fontSize: 11.5,
    fontWeight: "500",
  },

  fileStatus: {
    minHeight: 34,
    paddingHorizontal: 9,
    borderRadius: 11,
    backgroundColor: "#EFF9F3",
    flexDirection: "row",
    alignItems: "center",
  },

  fileStatusText: {
    marginLeft: 5,
    color: "#078E42",
    fontSize: 10.5,
    fontWeight: "800",
  },

  emptyStatusText: {
    color: "#8B948F",
  },

  sectionHeader: {
    marginTop: 25,
    marginBottom: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  sectionTitle: {
    color: "#222824",
    fontSize: 16,
    fontWeight: "800",
  },

  sectionSubtitle: {
    marginTop: 3,
    color: "#89928D",
    fontSize: 11.5,
    fontWeight: "500",
  },

  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },

  statCard: {
    width: "48.5%",
    minHeight: 94,
    marginBottom: 12,
    padding: 14,
    borderRadius: 19,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E7ECE9",
    flexDirection: "row",
    alignItems: "center",

    shadowColor: "#17261D",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    elevation: 2,
  },

  statIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#EAF8F0",
    justifyContent: "center",
    alignItems: "center",
  },

  statContent: {
    flex: 1,
    marginLeft: 11,
  },

  statNumber: {
    color: "#078E42",
    fontSize: 22,
    fontWeight: "900",
  },

  statLabel: {
    marginTop: 3,
    color: "#7D8681",
    fontSize: 10.5,
    lineHeight: 14,
    fontWeight: "600",
  },

  infoCard: {
    marginTop: 9,
    paddingHorizontal: 15,
    borderRadius: 20,
    backgroundColor: "#EFF9F3",
    borderWidth: 1,
    borderColor: "#DCEFE4",
  },

  infoRow: {
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
  },

  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },

  infoContent: {
    flex: 1,
    marginLeft: 12,
  },

  infoTitle: {
    color: "#263129",
    fontSize: 13,
    fontWeight: "800",
  },

  infoText: {
    marginTop: 3,
    color: "#738078",
    fontSize: 10.8,
    lineHeight: 16,
    fontWeight: "500",
  },

  infoDivider: {
    height: 1,
    marginLeft: 52,
    backgroundColor: "#D9EBE0",
  },

  previewCard: {
    marginTop: 22,
    padding: 16,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5EAE7",

    shadowColor: "#17261D",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 3,
  },

  previewHeader: {
    marginBottom: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  previewTitle: {
    color: "#222824",
    fontSize: 16,
    fontWeight: "800",
  },

  previewSubtitle: {
    marginTop: 3,
    color: "#8A938E",
    fontSize: 11.5,
    fontWeight: "500",
  },

  previewBadge: {
    minHeight: 30,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: "#EAF8F0",
    justifyContent: "center",
    alignItems: "center",
  },

  previewBadgeText: {
    color: "#078E42",
    fontSize: 10.5,
    fontWeight: "800",
  },

  tableContainer: {
    overflow: "hidden",
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#E7ECE9",
  },

  tableHeader: {
    minHeight: 43,
    paddingHorizontal: 10,
    backgroundColor: "#EFF9F3",
    flexDirection: "row",
    alignItems: "center",
  },

  headerCell: {
    flex: 1,
    color: "#31734D",
    fontSize: 10.5,
    fontWeight: "800",
  },

  nameColumn: {
    flex: 1.3,
  },

  tableRow: {
    minHeight: 54,
    paddingHorizontal: 10,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#EFF2F0",
    flexDirection: "row",
    alignItems: "center",
  },

  lastTableRow: {
    borderBottomWidth: 0,
  },

  cell: {
    flex: 1,
  },

  cellText: {
    paddingRight: 5,
    color: "#5E6862",
    fontSize: 10.5,
    fontWeight: "500",
  },

  nameCell: {
    paddingRight: 6,
    flexDirection: "row",
    alignItems: "center",
  },

  avatar: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: "#EAF8F0",
    justifyContent: "center",
    alignItems: "center",
  },

  avatarText: {
    color: "#09A84E",
    fontSize: 11,
    fontWeight: "900",
  },

  nameText: {
    flex: 1,
    marginLeft: 7,
    color: "#2E3531",
    fontSize: 10.5,
    fontWeight: "700",
  },

  moreContainer: {
    minHeight: 45,
    paddingHorizontal: 12,
    backgroundColor: "#FAFCFB",
    borderTopWidth: 1,
    borderTopColor: "#EFF2F0",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  more: {
    marginLeft: 7,
    color: "#078E42",
    fontSize: 10.5,
    fontWeight: "700",
  },

  emptyState: {
    paddingVertical: 32,
    paddingHorizontal: 20,
    alignItems: "center",
  },

  emptyIcon: {
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: "#EAF8F0",
    justifyContent: "center",
    alignItems: "center",
  },

  emptyTitle: {
    marginTop: 15,
    color: "#252B28",
    fontSize: 16,
    fontWeight: "800",
  },

  emptyText: {
    maxWidth: 280,
    marginTop: 7,
    color: "#7F8883",
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },

  bottomActions: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 8,
    paddingTop: 13,
    paddingHorizontal: 13,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5EAE7",

    shadowColor: "#17261D",
    shadowOpacity: 0.12,
    shadowRadius: 15,
    shadowOffset: {
      width: 0,
      height: -4,
    },
    elevation: 10,
  },

  exportButton: {
    minHeight: 60,
    paddingHorizontal: 14,
    borderRadius: 18,
    backgroundColor: "#09A84E",
    flexDirection: "row",
    alignItems: "center",

    shadowColor: "#09A84E",
    shadowOpacity: 0.22,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 4,
  },

  disabledExportButton: {
    backgroundColor: "#E6EBE8",
    shadowOpacity: 0,
    elevation: 0,
  },

  exportIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },

  exportButtonContent: {
    flex: 1,
    marginLeft: 12,
  },

  exportButtonText: {
    color: "#FFFFFF",
    fontSize: 14.5,
    fontWeight: "800",
  },

  disabledExportText: {
    color: "#87908B",
  },

  exportButtonSubtitle: {
    marginTop: 2,
    color: "rgba(255,255,255,0.78)",
    fontSize: 10.5,
    fontWeight: "500",
  },

  disabledExportSubtitle: {
    color: "#A1A8A4",
  },

  cancelButton: {
    minHeight: 42,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },

  cancelButtonText: {
    marginLeft: 6,
    color: "#707A74",
    fontSize: 12.5,
    fontWeight: "700",
  },
});