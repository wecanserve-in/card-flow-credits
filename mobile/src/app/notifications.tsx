import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

import {
  AppNotification,
  clearAllNotifications,
  deleteNotification,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  subscribeToNotifications,
} from "../services/notificationService";

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();

  const [
    notifications,
    setNotifications,
  ] = useState<AppNotification[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [processing, setProcessing] =
    useState(false);

  useEffect(() => {
    const unsubscribe =
      subscribeToNotifications(
        (items) => {
          setNotifications(items);
          setLoading(false);
        },
        () => {
          setLoading(false);
        }
      );

    return unsubscribe;
  }, []);

  const unreadCount = useMemo(
    () =>
      notifications.filter(
        (notification) =>
          !notification.read
      ).length,
    [notifications]
  );

  const handleNotificationPress = async (
    notification: AppNotification
  ) => {
    try {
      if (!notification.read) {
        await markNotificationAsRead(
          notification.id
        );
      }

      if (notification.actionRoute) {
        router.push(
          notification.actionRoute as any
        );
      }
    } catch (error) {
      console.error(
        "Open notification error:",
        error
      );
    }
  };

  const handleMarkAllRead = async () => {
    if (unreadCount === 0 || processing) {
      return;
    }

    try {
      setProcessing(true);
      await markAllNotificationsAsRead();
    } catch (error) {
      console.error(
        "Mark all read error:",
        error
      );

      Alert.alert(
        "Unable to Update",
        "Notifications could not be marked as read."
      );
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = (
    notificationId: string
  ) => {
    Alert.alert(
      "Delete Notification?",
      "This notification will be removed.",
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
              await deleteNotification(
                notificationId
              );
            } catch (error) {
              console.error(
                "Delete notification error:",
                error
              );
            }
          },
        },
      ]
    );
  };

  const handleClearAll = () => {
    if (
      notifications.length === 0 ||
      processing
    ) {
      return;
    }

    Alert.alert(
      "Clear All Notifications?",
      "This will permanently remove every notification.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Clear All",
          style: "destructive",
          onPress: async () => {
            try {
              setProcessing(true);
              await clearAllNotifications();
            } catch (error) {
              console.error(
                "Clear notifications error:",
                error
              );

              Alert.alert(
                "Unable to Clear",
                "Notifications could not be cleared."
              );
            } finally {
              setProcessing(false);
            }
          },
        },
      ]
    );
  };

  const renderNotification = ({
    item,
  }: {
    item: AppNotification;
  }) => {
    const design =
      getNotificationDesign(item.type);

    return (
      <TouchableOpacity
        activeOpacity={0.84}
        style={[
          styles.notificationCard,
          !item.read &&
            styles.unreadNotificationCard,
        ]}
        onPress={() =>
          handleNotificationPress(item)
        }
      >
        <View
          style={[
            styles.notificationIcon,
            {
              backgroundColor:
                design.background,
            },
          ]}
        >
          <Ionicons
            name={design.icon}
            size={22}
            color={design.color}
          />
        </View>

        <View
          style={
            styles.notificationContent
          }
        >
          <View style={styles.titleRow}>
            <Text
              style={[
                styles.notificationTitle,
                !item.read &&
                  styles.unreadTitle,
              ]}
            >
              {item.title}
            </Text>

            {!item.read && (
              <View
                style={styles.unreadDot}
              />
            )}
          </View>

          <Text
            style={styles.notificationMessage}
          >
            {item.message}
          </Text>

          <Text
            style={styles.notificationTime}
          >
            {formatNotificationDate(
              item.createdAt
            )}
          </Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.7}
          style={styles.deleteButton}
          onPress={() =>
            handleDelete(item.id)
          }
        >
          <Ionicons
            name="trash-outline"
            size={18}
            color="#A1A8A4"
          />
        </TouchableOpacity>
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
              color="#202622"
            />
          </TouchableOpacity>

          <View style={styles.headerContent}>
            <Text style={styles.title}>
              Notifications
            </Text>

            <Text style={styles.subtitle}>
              {unreadCount > 0
                ? `${unreadCount} unread ${
                    unreadCount === 1
                      ? "notification"
                      : "notifications"
                  }`
                : "You are all caught up"}
            </Text>
          </View>

          {notifications.length > 0 && (
            <TouchableOpacity
              activeOpacity={0.75}
              style={styles.clearHeaderButton}
              onPress={handleClearAll}
            >
              <Ionicons
                name="trash-outline"
                size={19}
                color="#E05252"
              />
            </TouchableOpacity>
          )}
        </View>

        {notifications.length > 0 && (
          <View style={styles.actionBar}>
            <Text style={styles.actionLabel}>
              Recent activity
            </Text>

            <TouchableOpacity
              activeOpacity={0.75}
              disabled={
                unreadCount === 0 ||
                processing
              }
              onPress={handleMarkAllRead}
            >
              <Text
                style={[
                  styles.markAllText,
                  unreadCount === 0 &&
                    styles.markAllDisabled,
                ]}
              >
                Mark all as read
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {loading ? (
          <View style={styles.loader}>
            <ActivityIndicator
              size="large"
              color="#09A84E"
            />

            <Text style={styles.loaderText}>
              Loading notifications...
            </Text>
          </View>
        ) : (
          <FlatList
            data={notifications}
            keyExtractor={(item) => item.id}
            renderItem={renderNotification}
            showsVerticalScrollIndicator={
              false
            }
            contentContainerStyle={[
              styles.listContent,
              {
                paddingBottom:
                  30 + insets.bottom,
              },
              notifications.length === 0 &&
                styles.emptyList,
            ]}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <View style={styles.emptyIcon}>
                  <Ionicons
                    name="notifications-outline"
                    size={39}
                    color="#09A84E"
                  />
                </View>

                <Text style={styles.emptyTitle}>
                  No notifications
                </Text>

                <Text style={styles.emptyText}>
                  Card extraction, payment,
                  credit and export updates
                  will appear here.
                </Text>
              </View>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

function formatNotificationDate(
  createdAt: any
) {
  if (!createdAt) {
    return "Just now";
  }

  const date =
    typeof createdAt?.toDate ===
    "function"
      ? createdAt.toDate()
      : new Date(createdAt);

  if (
    Number.isNaN(date.getTime())
  ) {
    return "Just now";
  }

  const difference =
    Date.now() - date.getTime();

  const minutes = Math.floor(
    difference / 60000
  );

  if (minutes < 1) {
    return "Just now";
  }

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(
    minutes / 60
  );

  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);

  if (days < 7) {
    return `${days}d ago`;
  }

  return date.toLocaleDateString();
}

function getNotificationDesign(
  type: AppNotification["type"]
): {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  background: string;
} {
  switch (type) {
    case "extraction_success":
      return {
        icon: "sparkles",
        color: "#09A84E",
        background: "#EAF8F0",
      };

    case "extraction_failed":
      return {
        icon: "alert-circle",
        color: "#E05252",
        background: "#FFF0EE",
      };

    case "credits_low":
      return {
        icon: "warning",
        color: "#EFA300",
        background: "#FFF5DC",
      };

    case "credits_empty":
      return {
        icon: "ban",
        color: "#E05252",
        background: "#FFF0EE",
      };

    case "payment_success":
      return {
        icon: "checkmark-circle",
        color: "#09A84E",
        background: "#EAF8F0",
      };

    case "payment_failed":
    case "payment_cancelled":
      return {
        icon: "card-outline",
        color: "#E05252",
        background: "#FFF0EE",
      };

    case "export_success":
      return {
        icon: "download-outline",
        color: "#7056B8",
        background: "#F1EDFF",
      };

    case "export_failed":
      return {
        icon: "document-outline",
        color: "#E05252",
        background: "#FFF0EE",
      };

    case "subscription_expiring":
      return {
        icon: "time-outline",
        color: "#EFA300",
        background: "#FFF5DC",
      };

    case "subscription_expired":
      return {
        icon: "calendar-outline",
        color: "#E05252",
        background: "#FFF0EE",
      };

    default:
      return {
        icon: "notifications-outline",
        color: "#09A84E",
        background: "#EAF8F0",
      };
  }
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
    minHeight: 78,
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
  },

  headerContent: {
    flex: 1,
    marginLeft: 13,
  },

  title: {
    color: "#171C21",
    fontSize: 22,
    fontWeight: "900",
  },

  subtitle: {
    marginTop: 3,
    color: "#858D95",
    fontSize: 12,
    fontWeight: "500",
  },

  clearHeaderButton: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: "#FFF0EE",
    alignItems: "center",
    justifyContent: "center",
  },

  actionBar: {
    minHeight: 48,
    marginHorizontal: 20,
    paddingHorizontal: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  actionLabel: {
    color: "#6F7874",
    fontSize: 12,
    fontWeight: "700",
  },

  markAllText: {
    color: "#09A84E",
    fontSize: 12,
    fontWeight: "800",
  },

  markAllDisabled: {
    color: "#A5ACA8",
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
    paddingTop: 5,
  },

  emptyList: {
    flexGrow: 1,
    justifyContent: "center",
  },

  notificationCard: {
    minHeight: 104,
    marginBottom: 12,
    padding: 14,
    borderRadius: 19,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5EAE7",
    flexDirection: "row",
    alignItems: "flex-start",
  },

  unreadNotificationCard: {
    borderColor: "#CFEBDD",
    backgroundColor: "#FBFFFC",
  },

  notificationIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },

  notificationContent: {
    flex: 1,
    marginLeft: 12,
  },

  titleRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  notificationTitle: {
    flex: 1,
    color: "#343B37",
    fontSize: 14,
    fontWeight: "700",
  },

  unreadTitle: {
    color: "#202622",
    fontWeight: "900",
  },

  unreadDot: {
    width: 8,
    height: 8,
    marginLeft: 7,
    borderRadius: 4,
    backgroundColor: "#09A84E",
  },

  notificationMessage: {
    marginTop: 5,
    color: "#737C77",
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "500",
  },

  notificationTime: {
    marginTop: 7,
    color: "#A0A7A3",
    fontSize: 10.5,
    fontWeight: "600",
  },

  deleteButton: {
    width: 36,
    height: 36,
    marginLeft: 5,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  emptyState: {
    paddingHorizontal: 30,
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
    textAlign: "center",
  },
});