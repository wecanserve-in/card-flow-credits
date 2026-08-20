import React, {
  useCallback,
  useEffect,
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
import { router, useFocusEffect } from "expo-router";
import * as Sharing from "expo-sharing";

import {
  AppEvent,
  deleteEvent,
  getEventContacts,
  getEvents,
} from "../services/eventService";
import { exportContactsToExcel } from "../services/excelService";
import { createNotification } from "../services/notificationService";

function formatEventDate(event: AppEvent): string {
  if (event.date) {
    return String(event.date);
  }

  const createdAt = event.createdAt;

  if (createdAt?.toDate) {
    const date = createdAt.toDate();

    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  if (typeof createdAt === "number" && createdAt > 0) {
    return new Date(createdAt).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  return "Just now";
}

export default function EventsScreen() {
  const insets = useSafeAreaInsets();

  const [events, setEvents] = useState<AppEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportingId, setExportingId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      (async () => {
        try {
          const data = await getEvents();

          if (isActive) {
            setEvents(data || []);
          }
        } catch (error) {
          console.error("Load events error:", error);

          if (isActive) {
            Alert.alert(
              "Unable to Load Events",
              "Your event folders could not be loaded."
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
    }, [])
  );

  const handleExportEvent = async (event: AppEvent) => {
    if (exportingId) {
      return;
    }

    try {
      const contacts = await getEventContacts(event.id);

      if (contacts.length === 0) {
        Alert.alert(
          "No Contacts",
          "This event folder has no saved contacts yet."
        );

        return;
      }

      setExportingId(event.id);

      const fileName = `${event.name}_Contacts`;

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
        dialogTitle: `Export ${event.name}`,
        UTI: "org.openxmlformats.spreadsheetml.sheet",
      });

      await createNotification({
        type: "export_success",
        title: "Event Excel exported",
        message: `An Excel workbook for "${event.name}" containing ${contacts.length} contacts was generated successfully.`,
        actionRoute: "/events",
        eventKey: `event-export-success-${event.id}-${Date.now()}`,
      });
    } catch (error) {
      console.error("Event export error:", error);

      await createNotification({
        type: "export_failed",
        title: "Event export failed",
        message: `The Excel workbook for "${event.name}" could not be generated.`,
        actionRoute: "/events",
        eventKey: `event-export-failed-${event.id}-${Date.now()}`,
      });

      Alert.alert(
        "Export Failed",
        "Failed to export the Excel workbook."
      );
    } finally {
      setExportingId(null);
    }
  };

  const handleDeleteEvent = (event: AppEvent) => {
    Alert.alert(
      "Delete Event Folder?",
      `"${event.name}" and all ${event.contactCount ?? 0} contacts inside it will be permanently removed.`,
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
              await deleteEvent(event.id);

              setEvents((current) =>
                current.filter(
                  (item) => item.id !== event.id
                )
              );
            } catch (error) {
              console.error(
                "Delete event error:",
                error
              );

              Alert.alert(
                "Unable to Delete",
                "The event folder could not be deleted."
              );
            }
          },
        },
      ]
    );
  };

  const renderEvent = ({
    item,
  }: {
    item: AppEvent;
  }) => {
    const isExporting = exportingId === item.id;

    return (
      <TouchableOpacity
        activeOpacity={0.86}
        style={styles.eventCard}
        onPress={() =>
          router.push({
            pathname: "/event-detail",
            params: { id: item.id },
          })
        }
      >
        <View style={styles.eventIcon}>
          <Ionicons
            name="folder-open-outline"
            size={24}
            color="#09A84E"
          />
        </View>

        <View style={styles.eventContent}>
          <Text
            numberOfLines={1}
            style={styles.eventName}
          >
            {item.name}
          </Text>

          <View style={styles.eventMetaRow}>
            <Ionicons
              name="calendar-outline"
              size={12}
              color="#8A938E"
            />

            <Text style={styles.eventMeta}>
              {formatEventDate(item)}
            </Text>

            {item.location ? (
              <>
                <View style={styles.metaDot} />

                <Ionicons
                  name="location-outline"
                  size={12}
                  color="#8A938E"
                />

                <Text
                  numberOfLines={1}
                  style={styles.eventMeta}
                >
                  {item.location}
                </Text>
              </>
            ) : null}
          </View>

          <View style={styles.countRow}>
            <Ionicons
              name="people-outline"
              size={13}
              color="#09A84E"
            />

            <Text style={styles.countText}>
              {item.contactCount ?? 0}{" "}
              {(item.contactCount ?? 0) === 1
                ? "contact"
                : "contacts"}
            </Text>
          </View>
        </View>

        <View style={styles.eventActions}>
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.exportIconButton}
            onPress={() =>
              handleExportEvent(item)
            }
            disabled={isExporting}
          >
            {isExporting ? (
              <ActivityIndicator
                size="small"
                color="#09A84E"
              />
            ) : (
              <Ionicons
                name="download-outline"
                size={19}
                color="#09A84E"
              />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.deleteIconButton}
            onPress={() =>
              handleDeleteEvent(item)
            }
          >
            <Ionicons
              name="trash-outline"
              size={18}
              color="#E05252"
            />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

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
            <Text style={styles.heading}>
              Events
            </Text>

            <Text style={styles.headerSubtitle}>
              Organize your scans into folders
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.addButton}
            onPress={() =>
              router.push("/create-event")
            }
          >
            <Ionicons
              name="add"
              size={24}
              color="#FFFFFF"
            />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loader}>
            <ActivityIndicator
              size="large"
              color="#09A84E"
            />

            <Text style={styles.loaderText}>
              Loading events...
            </Text>
          </View>
        ) : (
          <FlatList
            data={events}
            keyExtractor={(item) => item.id}
            renderItem={renderEvent}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.listContent,
              {
                paddingBottom: 30 + insets.bottom,
              },
              events.length === 0 &&
                styles.emptyListContent,
            ]}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <View style={styles.emptyIcon}>
                  <Ionicons
                    name="folder-open-outline"
                    size={39}
                    color="#09A84E"
                  />
                </View>

                <Text style={styles.emptyTitle}>
                  No event folders yet
                </Text>

                <Text style={styles.emptyText}>
                  Create an event folder to keep
                  all the cards you scan at an
                  event together, each with its
                  own Excel export.
                </Text>

                <TouchableOpacity
                  activeOpacity={0.85}
                  style={styles.createButton}
                  onPress={() =>
                    router.push("/create-event")
                  }
                >
                  <Ionicons
                    name="add"
                    size={20}
                    color="#FFFFFF"
                  />

                  <Text style={styles.createButtonText}>
                    Create Event
                  </Text>
                </TouchableOpacity>
              </View>
            }
          />
        )}
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

  addButton: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: "#09A84E",
    alignItems: "center",
    justifyContent: "center",

    shadowColor: "#09A84E",
    shadowOpacity: 0.24,
    shadowRadius: 9,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 4,
  },

  loader: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  loaderText: {
    marginTop: 12,
    color: "#7B847F",
    fontSize: 13,
    fontWeight: "600",
  },

  listContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },

  emptyListContent: {
    flexGrow: 1,
    justifyContent: "center",
  },

  eventCard: {
    minHeight: 112,
    marginBottom: 13,
    padding: 15,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5EAE7",
    flexDirection: "row",
    alignItems: "center",

    shadowColor: "#17261D",
    shadowOpacity: 0.05,
    shadowRadius: 9,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    elevation: 2,
  },

  eventIcon: {
    width: 52,
    height: 52,
    borderRadius: 17,
    backgroundColor: "#EAF8F0",
    alignItems: "center",
    justifyContent: "center",
  },

  eventContent: {
    flex: 1,
    marginLeft: 13,
    paddingRight: 8,
  },

  eventName: {
    color: "#20262C",
    fontSize: 16,
    fontWeight: "800",
  },

  eventMetaRow: {
    marginTop: 5,
    flexDirection: "row",
    alignItems: "center",
  },

  eventMeta: {
    maxWidth: 130,
    marginLeft: 4,
    color: "#8A938E",
    fontSize: 11,
    fontWeight: "500",
  },

  metaDot: {
    width: 3,
    height: 3,
    marginHorizontal: 6,
    borderRadius: 2,
    backgroundColor: "#B4BCB7",
  },

  countRow: {
    marginTop: 7,
    flexDirection: "row",
    alignItems: "center",
  },

  countText: {
    marginLeft: 5,
    color: "#09A84E",
    fontSize: 11.5,
    fontWeight: "800",
  },

  eventActions: {
    alignItems: "center",
  },

  exportIconButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#EAF8F0",
    alignItems: "center",
    justifyContent: "center",
  },

  deleteIconButton: {
    width: 38,
    height: 38,
    marginTop: 8,
    borderRadius: 12,
    backgroundColor: "#FFF0EE",
    alignItems: "center",
    justifyContent: "center",
  },

  emptyState: {
    paddingHorizontal: 28,
    alignItems: "center",
  },

  emptyIcon: {
    width: 88,
    height: 88,
    borderRadius: 28,
    backgroundColor: "#EAF8F0",
    alignItems: "center",
    justifyContent: "center",
  },

  emptyTitle: {
    marginTop: 18,
    color: "#202622",
    fontSize: 20,
    fontWeight: "900",
  },

  emptyText: {
    maxWidth: 310,
    marginTop: 8,
    color: "#7B847F",
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "500",
    textAlign: "center",
  },

  createButton: {
    minHeight: 50,
    marginTop: 22,
    paddingHorizontal: 22,
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

  createButtonText: {
    marginLeft: 8,
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
});