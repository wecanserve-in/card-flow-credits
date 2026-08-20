import React, { useState } from "react";

import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";

import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

import { createEvent } from "../services/eventService";

export default function CreateEventScreen() {
  const insets = useSafeAreaInsets();

  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState("");
  const [creating, setCreating] = useState(false);

  const canCreate =
    name.trim().length > 0 && !creating;

  const handleCreate = async () => {
    if (!canCreate) {
      return;
    }

    try {
      setCreating(true);

      const eventId = await createEvent({
        name: name.trim(),
        location: location.trim() || undefined,
        date: date.trim() || null,
      });

      router.replace({
        pathname: "/event-detail",
        params: { id: eventId },
      });
    } catch (error) {
      console.error(
        "Create event error:",
        error
      );

      Alert.alert(
        "Unable to Create Event",
        "Your event folder could not be created. Please try again."
      );
    } finally {
      setCreating(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={
          Platform.OS === "ios"
            ? "padding"
            : undefined
        }
      >
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
                New Event
              </Text>

              <Text style={styles.headerSubtitle}>
                Create an event folder for
                your scans
              </Text>
            </View>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={[
              styles.scrollContent,
              {
                paddingBottom:
                  insets.bottom + 30,
              },
            ]}
          >
            <View style={styles.illustrationCard}>
              <View style={styles.illustrationIcon}>
                <Ionicons
                  name="calendar-outline"
                  size={32}
                  color="#09A84E"
                />
              </View>

              <Text style={styles.illustrationTitle}>
                Organize scans by event
              </Text>

              <Text style={styles.illustrationText}>
                All cards you scan for this event
                will be saved into its own folder
                with a separate Excel export.
              </Text>
            </View>

            <View style={styles.formCard}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  Event name
                </Text>

                <View style={styles.inputContainer}>
                  <View style={styles.inputIcon}>
                    <Ionicons
                      name="ribbon-outline"
                      size={19}
                      color="#09A84E"
                    />
                  </View>

                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Tech Expo 2026"
                    placeholderTextColor="#A0A8A3"
                    value={name}
                    onChangeText={setName}
                    editable={!creating}
                    returnKeyType="next"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  Location
                  <Text style={styles.optionalLabel}>
                    {" "}
                    (optional)
                  </Text>
                </Text>

                <View style={styles.inputContainer}>
                  <View style={styles.inputIcon}>
                    <Ionicons
                      name="location-outline"
                      size={19}
                      color="#EFA300"
                    />
                  </View>

                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Pragati Maidan, Delhi"
                    placeholderTextColor="#A0A8A3"
                    value={location}
                    onChangeText={setLocation}
                    editable={!creating}
                    returnKeyType="next"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  Date
                  <Text style={styles.optionalLabel}>
                    {" "}
                    (optional)
                  </Text>
                </Text>

                <View style={styles.inputContainer}>
                  <View style={styles.inputIcon}>
                    <Ionicons
                      name="calendar-outline"
                      size={19}
                      color="#7056B8"
                    />
                  </View>

                  <TextInput
                    style={styles.input}
                    placeholder="e.g. 20 Aug 2026"
                    placeholderTextColor="#A0A8A3"
                    value={date}
                    onChangeText={setDate}
                    editable={!creating}
                    returnKeyType="done"
                    onSubmitEditing={
                      handleCreate
                    }
                  />
                </View>
              </View>
            </View>
          </ScrollView>

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
                styles.createButton,
                !canCreate &&
                  styles.disabledCreateButton,
              ]}
              onPress={handleCreate}
              disabled={!canCreate}
            >
              <View style={styles.createIcon}>
                {creating ? (
                  <ActivityIndicator
                    size="small"
                    color="#09A84E"
                  />
                ) : (
                  <Ionicons
                    name="add"
                    size={22}
                    color="#09A84E"
                  />
                )}
              </View>

              <Text
                style={[
                  styles.createButtonText,
                  !canCreate &&
                    styles.disabledCreateText,
                ]}
              >
                {creating
                  ? "Creating Event..."
                  : "Create Event Folder"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  keyboardContainer: {
    flex: 1,
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

  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },

  illustrationCard: {
    paddingVertical: 26,
    paddingHorizontal: 22,
    borderRadius: 22,
    backgroundColor: "#EAF8F0",
    borderWidth: 1,
    borderColor: "#D8F0E2",
    alignItems: "center",
  },

  illustrationIcon: {
    width: 66,
    height: 66,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },

  illustrationTitle: {
    marginTop: 15,
    color: "#1C2A22",
    fontSize: 17,
    fontWeight: "800",
    textAlign: "center",
  },

  illustrationText: {
    maxWidth: 310,
    marginTop: 7,
    color: "#64806E",
    fontSize: 12.5,
    lineHeight: 19,
    fontWeight: "500",
    textAlign: "center",
  },

  formCard: {
    marginTop: 17,
    padding: 17,
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

  inputGroup: {
    marginBottom: 16,
  },

  label: {
    marginBottom: 8,
    marginLeft: 2,
    color: "#505A54",
    fontSize: 12.5,
    fontWeight: "700",
  },

  optionalLabel: {
    color: "#A0A8A3",
    fontWeight: "500",
  },

  inputContainer: {
    minHeight: 56,
    borderRadius: 17,
    backgroundColor: "#F8FAF9",
    borderWidth: 1,
    borderColor: "#E3E9E5",
    flexDirection: "row",
    alignItems: "center",
  },

  inputIcon: {
    width: 42,
    height: 42,
    marginLeft: 6,
    borderRadius: 13,
    backgroundColor: "#EAF8F0",
    alignItems: "center",
    justifyContent: "center",
  },

  input: {
    flex: 1,
    minHeight: 54,
    paddingHorizontal: 12,
    color: "#202622",
    fontSize: 14,
    fontWeight: "600",
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

  createButton: {
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

  disabledCreateButton: {
    backgroundColor: "#E6EBE8",
    shadowOpacity: 0,
    elevation: 0,
  },

  createIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },

  createButtonText: {
    flex: 1,
    marginLeft: 12,
    color: "#FFFFFF",
    fontSize: 14.5,
    fontWeight: "800",
  },

  disabledCreateText: {
    color: "#87908B",
  },
});