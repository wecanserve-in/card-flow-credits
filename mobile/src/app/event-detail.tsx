import React, {
  useCallback,
  useState,
} from "react";

import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";

import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import * as Sharing from "expo-sharing";

import {
  AppEvent,
  getEvent,
  getEventContacts,
} from "../services/eventService";
import { exportContactsToExcel } from "../services/excelService";
import { createNotification } from "../services/notificationService";

export default function EventDetailScreen() {
  const insets = useSafeAreaInsets();

  const { id } = useLocalSearchParams<{ id: string }>();

  const eventId = Array.isArray(id) ? id[0] : id;

  const [event, setEvent] = useState<AppEvent | null>(null);
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      (async () => {
        if (!eventId) {
          return;
        }

        try {
          const [eventData, contactData] = await Promise.all([
            getEvent(eventId),
            getEventContacts(eventId),
          ]);

          if (isActive) {
            setEvent(eventData);
            setContacts(contactData || []);
          }
        } catch (error) {
          console.error("Load event detail error:", error);

          if (isActive) {
            Alert.alert(
              "Unable to Load Event",
              "The event folder could not be loaded."
            );
          }
        } finally {
          if (isActive) {
            setLoading(false);
          }
        }
      })();

      return () => {
        isActive = false;
      };
    }, [eventId])
  );

  const handleExport = async () => {
    if (exporting) {
      return;
    }

    try {
      if (contacts.length === 0) {
        Alert.alert(
          "No Contacts",
          "This event folder has no saved contacts yet."
        );

        return;
      }

      setExporting(true);

      const fileName = event
        ? `${event.name}_Contacts`
        : "Event_Contacts";

      const fileUri = await exportContactsToExcel(
        contacts,
        fileName
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
        dialogTitle: event
          ? `Export ${event.name}`
          : "Export Event Contacts",
        UTI: "org.openxmlformats.spreadsheetml.sheet",
      });

      await createNotification({
        type: "export_success",
        title: "Event Excel exported",
        message: `An Excel workbook for "${event?.name ?? "event"}" containing ${contacts.length} contacts was generated successfully.`,
        actionRoute: "/events",
        eventKey: `event-detail-export-success-${eventId}-${Date.now()}`,
      });
    } catch (error) {
      console.error("Event export error:", error);

      await createNotification({
        type: "export_failed",
        title: "Event export failed",
        message: `The Excel workbook for "${event?.name ?? "event"}" could not be generated.`,
        actionRoute: "/events",
        eventKey: `event-detail-export-failed-${eventId}-${Date.now()}`,
      });

      Alert.alert(
        "Export Failed",
        "Failed to export the Excel workbook."
      );
    } finally {
      setExporting(false);
    }
  };

  const handleScanMore = () => {
    if (eventId) {
      (globalThis as any).activeEventId = eventId;
      (globalThis as any).activeEventName = event?.name || "Event";
    }

    router.push("/scanner");
  };

  const renderContact = ({
    item,
    index,
  }: {
    item: any;
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
      <View style={styles.contactCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {initial}
          </Text>
        </View>

        <View style={styles.contactInfo}>
          <Text
            numberOfLines={1}
            style={styles.contactName}
          >
            {item.name || "Unknown Contact"}
          </Text>

          <Text
            numberOfLines={1}
            style={styles.contactSubtitle}
          >
            {subtitle || "No designation available"}
          </Text>

          <View style={styles.contactDetails}>
            {item.phone ? (
              <View style={styles.detailRow}>
                <Ionicons
                  name="call-outline"
                  size={14}
                  color="#09A84E"
                />

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
                <Ionicons
                  name="mail-outline"
                  size={14}
                  color="#EFA300"
                />

                <Text
                  numberOfLines={1}
                  style={styles.detailText}
                >
                  {item.email}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.contactIndex}>
          <Text style={styles.contactIndexText}>
            {index + 1}
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loader}>
          <ActivityIndicator
            size="large"
            color="#09A84E"
          />

          <Text style={styles.loaderText}>
            Loading event...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
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
            <Text
              numberOfLines={1}
              style={styles.heading}
            >
              {event?.name || "Event"}
            </Text>

            <Text style={styles.headerSubtitle}>
              {contacts.length}{" "}
              {contacts.length === 1
                ? "contact"
                : "contacts"}{" "}
              in this folder
            </Text>
          </View>

          <View style={styles.headerIcon}>
            <Ionicons
              name="folder-open-outline"
              size={21}
              color="#09A84E"
            />
          </View>
        </View>

        <View style={styles.eventInfoCard}>
          <View style={styles.eventInfoRow}>
            <View style={styles.eventInfoIcon}>
              <Ionicons
                name="calendar-outline"
                size={17}
                color="#09A84E"
              />
            </View>

            <View style={styles.eventInfoContent}>
              <Text style={styles.eventInfoLabel}>
                Date
              </Text>

              <Text style={styles.eventInfoValue}>
                {event?.date ||
                  "Not specified"}
              </Text>
            </View>
          </View>

          <View style={styles.eventInfoDivider} />

          <View style={styles.eventInfoRow}>
            <View style={styles.eventInfoIcon}>
              <Ionicons
                name="location-outline"
                size={17}
                color="#EFA300"
              />
            </View>

            <View style={styles.eventInfoContent}>
              <Text style={styles.eventInfoLabel}>
                Location
              </Text>

              <Text style={styles.eventInfoValue}>
                {event?.location || "Not specified"}
              </Text>
            </View>
          </View>
        </View>

        <FlatList
          data={contacts}
          keyExtractor={(item, index) =>
            `${item.id || item.email || item.phone || "contact"}-${index}`
          }
          renderItem={renderContact}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.listContent,
            {
              paddingBottom: 160 + insets.bottom,
            },
            contacts.length === 0 &&
              styles.emptyListContent,
          ]}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Ionicons
                  name="people-outline"
                  size={38}
                  color="#09A84E"
                />
              </View>

              <Text style={styles.emptyTitle}>
                No contacts yet
              </Text>

              <Text style={styles.emptyText}>
                Scan cards for this event to save
                them into this folder.
              </Text>

              <TouchableOpacity
                activeOpacity={0.85}
                style={styles.scanButton}
                onPress={handleScanMore}
              >
                <Ionicons
                  name="camera-outline"
                  size={19}
                  color="#FFFFFF"
                />

                <Text style={styles.scanButtonText}>
                  Scan Cards for Event
                </Text>
              </TouchableOpacity>
            </View>
          }
        />

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
            <View style={styles.exportIcon}>
              {exporting ? (
                <ActivityIndicator
                  size="small"
                  color="#09A84E"
                />
              ) : (
                <Ionicons
                  name="download-outline"
                  size={20}
                  color="#09A84E"
                />
              )}
            </View>

            <View style={styles.exportContent}>
              <Text
                style={[
                  styles.exportText,
                  contacts.length === 0 &&
                    styles.disabledExportText,
                ]}
              >
                {exporting
                  ? "Preparing Excel"
                  : "Export Event Excel"}
              </Text>

              <Text
                style={[
                  styles.exportSubtext,
                  contacts.length === 0 &&
                    styles.disabledExportText,
                ]}
              >
                {contacts.length > 0
                  ? `${contacts.length} ${
                      contacts.length === 1
                        ? "contact"
                        : "contacts"
                    } included`
                  : "No contacts available"}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.scanMoreButton}
            onPress={handleScanMore}
          >
            <Ionicons
              name="camera-outline"
              size={19}
              color="#FFFFFF"
            />

            <Text style={styles.scanMoreText}>
              Scan More
            </Text>
          </TouchableOpacity>
        </View>
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
    backgroundColor: "#F7F9F8",
  },

  header: {
    minHeight: 80,
    paddingHorizontal: 20,
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
    paddingRight: 8,
  },

  heading: {
    color: "#171C21",
    fontSize: 22,
    fontWeight: "800",
  },

  headerSubtitle: {
    marginTop: 3,
    color: "#858D95",
    fontSize: 12.5,
    fontWeight: "500",
  },

  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: "#EAF8F0",
    alignItems: "center",
    justifyContent: "center",
  },

  loader: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F7F9F8",
  },

  loaderText: {
    marginTop: 12,
    color: "#7B847F",
    fontSize: 13,
    fontWeight: "600",
  },

  eventInfoCard: {
    marginHorizontal: 20,
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

  eventInfoRow: {
    paddingVertical: 13,
    flexDirection: "row",
    alignItems: "center",
  },

  eventInfoIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: "#EAF8F0",
    alignItems: "center",
    justifyContent: "center",
  },

  eventInfoContent: {
    flex: 1,
    marginLeft: 12,
  },

  eventInfoLabel: {
    color: "#909893",
    fontSize: 10.5,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  eventInfoValue: {
    marginTop: 3,
    color: "#2E3531",
    fontSize: 13.5,
    fontWeight: "700",
  },

  eventInfoDivider: {
    height: 1,
    marginLeft: 52,
    backgroundColor: "#EDF0EE",
  },

  listContent: {
    paddingHorizontal: 20,
    paddingTop: 17,
  },

  emptyListContent: {
    flexGrow: 1,
    justifyContent: "center",
  },

  contactCard: {
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
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: "#EAF8F0",
    alignItems: "center",
    justifyContent: "center",
  },

  avatarText: {
    color: "#09A84E",
    fontSize: 20,
    fontWeight: "800",
  },

  contactInfo: {
    flex: 1,
    marginLeft: 13,
    paddingRight: 8,
  },

  contactName: {
    color: "#20262C",
    fontSize: 15.5,
    fontWeight: "800",
  },

  contactSubtitle: {
    marginTop: 4,
    color: "#7E868E",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "500",
  },

  contactDetails: {
    marginTop: 10,
    gap: 6,
  },

  detailRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  detailText: {
    flex: 1,
    marginLeft: 8,
    color: "#535C64",
    fontSize: 12,
    fontWeight: "500",
  },

  contactIndex: {
    minWidth: 30,
    height: 30,
    marginLeft: 5,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: "#F0F7F2",
    alignItems: "center",
    justifyContent: "center",
  },

  contactIndexText: {
    color: "#09A84E",
    fontSize: 11,
    fontWeight: "800",
  },

  emptyState: {
    paddingHorizontal: 28,
    alignItems: "center",
    paddingBottom: 40,
  },

  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 26,
    backgroundColor: "#EAF8F0",
    alignItems: "center",
    justifyContent: "center",
  },

  emptyTitle: {
    marginTop: 16,
    color: "#202622",
    fontSize: 19,
    fontWeight: "900",
  },

  emptyText: {
    maxWidth: 300,
    marginTop: 7,
    color: "#7B847F",
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "500",
    textAlign: "center",
  },

  scanButton: {
    minHeight: 49,
    marginTop: 20,
    paddingHorizontal: 20,
    borderRadius: 16,
    backgroundColor: "#09A84E",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",

    shadowColor: "#09A84E",
    shadowOpacity: 0.22,
    shadowRadius: 9,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 4,
  },

  scanButtonText: {
    marginLeft: 8,
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
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

  exportIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },

  exportContent: {
    flex: 1,
    marginLeft: 12,
  },

  exportText: {
    color: "#FFFFFF",
    fontSize: 14.5,
    fontWeight: "800",
  },

  exportSubtext: {
    marginTop: 2,
    color: "rgba(255,255,255,0.78)",
    fontSize: 10.5,
    fontWeight: "500",
  },

  disabledExportText: {
    color: "#87908B",
  },

  scanMoreButton: {
    minHeight: 46,
    marginTop: 9,
    borderRadius: 16,
    backgroundColor: "#09AA4D",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  scanMoreText: {
    marginLeft: 8,
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
});